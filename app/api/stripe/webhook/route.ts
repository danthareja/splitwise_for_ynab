import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleTrialWillEnd,
} from "@/services/stripe";
import {
  sendTrialEndingEmail,
  sendWelcomeEmail,
  sendPartnerInviteEmail,
  sendSubscriptionExpiredEmail,
} from "@/services/email";
import { prisma } from "@/db";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // User completed checkout - create/update subscription
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);

      // Send welcome email and pending partner invite now that trial has started
      const userId = session.metadata?.userId;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            name: true,
            persona: true,
          },
        });

        if (user?.email) {
          // Send welcome email (with dedup guard for webhook retries)
          const welcomeAlreadySent = await prisma.emailSend.findFirst({
            where: { userId, emailKey: "welcome" },
          });
          if (!welcomeAlreadySent) {
            await sendWelcomeEmail({
              to: user.email,
              userName: user.name?.split(" ")[0] || "there",
            });
            await prisma.emailSend.create({
              data: {
                userId,
                category: "transactional",
                emailKey: "welcome",
              },
            });
            console.log("Sent welcome email to:", user.email);
          }

          // For dual users, send any pending partner invite
          if (user.persona === "dual") {
            const pendingInvite = await prisma.partnerInvite.findFirst({
              where: {
                primaryUserId: userId,
                status: "pending",
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: "desc" },
            });

            if (pendingInvite?.partnerEmail) {
              const baseUrl =
                process.env.NEXT_PUBLIC_BASE_URL ||
                "https://splitwiseforynab.com";
              const inviteUrl = `${baseUrl}/invite/${pendingInvite.token}`;

              const emailResult = await sendPartnerInviteEmail({
                to: pendingInvite.partnerEmail,
                partnerName: pendingInvite.partnerName || undefined,
                inviterName: user.name?.split(" ")[0] || "Your partner",
                groupName: pendingInvite.groupName || undefined,
                inviteUrl,
              });

              if (emailResult.success) {
                // Update invite with email sent timestamp
                await prisma.partnerInvite.update({
                  where: { id: pendingInvite.id },
                  data: { emailSentAt: new Date() },
                });
                console.log(
                  "Sent partner invite email to:",
                  pendingInvite.partnerEmail,
                );
              }
            }
          }
        }
      }
      break;
    }

    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted": {
      const deletedSubscription = event.data.object as Stripe.Subscription;

      // Find the primary user before we update the subscription status
      const primaryUser = await prisma.user.findFirst({
        where: { stripeSubscriptionId: deletedSubscription.id },
        select: {
          id: true,
          email: true,
          name: true,
          stripeCurrentPeriodEnd: true,
          secondaryUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Handle the subscription deletion (updates DB)
      await handleSubscriptionDeleted(deletedSubscription);

      // Send expiration emails to primary and secondary users (with dedup guards)
      if (primaryUser?.email) {
        const expiredAt =
          primaryUser.stripeCurrentPeriodEnd?.toISOString() ||
          new Date().toISOString();

        // Email primary user
        const expiredAlreadySent = await prisma.emailSend.findFirst({
          where: { userId: primaryUser.id, emailKey: "subscription.expired" },
        });
        if (!expiredAlreadySent) {
          await sendSubscriptionExpiredEmail({
            to: primaryUser.email,
            userName: primaryUser.name?.split(" ")[0] || "there",
            expiredAt,
            isSecondary: false,
          });
          await prisma.emailSend.create({
            data: {
              userId: primaryUser.id,
              category: "transactional",
              emailKey: "subscription.expired",
            },
          });
          console.log(
            "Sent subscription expired email to primary:",
            primaryUser.email,
          );
        }

        // Email secondary user if exists
        if (primaryUser.secondaryUser?.email) {
          const secondaryExpiredAlreadySent = await prisma.emailSend.findFirst({
            where: {
              userId: primaryUser.secondaryUser.id,
              emailKey: "subscription.expired.secondary",
            },
          });
          if (!secondaryExpiredAlreadySent) {
            await sendSubscriptionExpiredEmail({
              to: primaryUser.secondaryUser.email,
              userName:
                primaryUser.secondaryUser.name?.split(" ")[0] || "there",
              expiredAt,
              isSecondary: true,
            });
            await prisma.emailSend.create({
              data: {
                userId: primaryUser.secondaryUser.id,
                category: "transactional",
                emailKey: "subscription.expired.secondary",
              },
            });
            console.log(
              "Sent subscription expired email to secondary:",
              primaryUser.secondaryUser.email,
            );
          }
        }
      }
      break;
    }

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_succeeded":
      // Payment succeeded - subscription status will be updated via subscription.updated
      console.log("Invoice payment succeeded:", event.data.object.id);
      break;

    case "customer.subscription.trial_will_end": {
      // Trial ending in 3 days - send reminder email
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Trial will end for subscription:", subscription.id);

      const trialInfo = await handleTrialWillEnd(subscription);

      if (trialInfo.email) {
        // Get user for email (with dedup guard for webhook retries)
        const user = await prisma.user.findFirst({
          where: { email: trialInfo.email },
          select: { id: true, name: true },
        });

        if (user) {
          const trialEndingAlreadySent = await prisma.emailSend.findFirst({
            where: { userId: user.id, emailKey: "trial.ending" },
          });
          if (!trialEndingAlreadySent) {
            await sendTrialEndingEmail({
              to: trialInfo.email,
              userName: user.name?.split(" ")[0] || "there",
              trialEndsAt: trialInfo.trialEnd?.toISOString(),
              planName: trialInfo.planName,
              planPrice: trialInfo.planPrice,
            });
            await prisma.emailSend.create({
              data: {
                userId: user.id,
                category: "transactional",
                emailKey: "trial.ending",
              },
            });
            console.log("Sent trial ending email to:", trialInfo.email);
          }
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
