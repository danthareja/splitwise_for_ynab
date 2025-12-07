/**
 * Stripe Product & Multi-Currency Price Setup Script
 *
 * This script creates ONE product with TWO prices (monthly + annual),
 * each with multiple currency options. Stripe's Adaptive Pricing will
 * handle other currencies automatically.
 *
 * Usage:
 *   npx tsx scripts/setup-stripe-prices.ts
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY must be set in .env
 */

import "dotenv/config";
import Stripe from "stripe";
import { PRICING_DISPLAY, TRIAL_DAYS } from "../lib/stripe-pricing";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is not set in environment variables");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Build currency options from the shared pricing config
const CURRENCY_OPTIONS: Record<string, { monthly: number; annual: number }> & {
  usd: { monthly: number; annual: number };
} = Object.fromEntries(
  Object.entries(PRICING_DISPLAY).map(([currency, pricing]) => [
    currency.toLowerCase(),
    { monthly: pricing.monthly, annual: pricing.annual },
  ]),
) as Record<string, { monthly: number; annual: number }> & {
  usd: { monthly: number; annual: number };
};

async function main() {
  console.log("🚀 Setting up Stripe product with multi-currency prices...\n");

  // Check if product already exists
  const existingProducts = await stripe.products.list({
    limit: 100,
  });

  let product = existingProducts.data.find(
    (p) => p.metadata.app === "splitwise-for-ynab" && p.active,
  );

  if (product) {
    console.log(`📦 Found existing product: ${product.name} (${product.id})`);
  } else {
    // Create the product
    product = await stripe.products.create({
      name: "Splitwise for YNAB",
      description:
        "Automatically sync your Splitwise expenses with YNAB for accurate category tracking.",
      metadata: {
        app: "splitwise-for-ynab",
      },
    });
    console.log(`📦 Created product: ${product.name} (${product.id})`);
  }

  console.log("\n📊 Creating multi-currency prices...\n");

  // Build currency_options for both prices
  const monthlyCurrencyOptions: Record<
    string,
    { unit_amount: number; tax_behavior: "exclusive" }
  > = {};
  const annualCurrencyOptions: Record<
    string,
    { unit_amount: number; tax_behavior: "exclusive" }
  > = {};

  for (const [currency, amounts] of Object.entries(CURRENCY_OPTIONS).slice(1)) {
    monthlyCurrencyOptions[currency] = {
      unit_amount: amounts.monthly,
      tax_behavior: "exclusive",
    };
    annualCurrencyOptions[currency] = {
      unit_amount: amounts.annual,
      tax_behavior: "exclusive",
    };
    const symbol =
      PRICING_DISPLAY[currency.toUpperCase() as keyof typeof PRICING_DISPLAY]
        ?.symbol || "$";
    console.log(
      `  💰 ${currency.toUpperCase()}: ${symbol}${amounts.monthly / 100}/mo, ${symbol}${amounts.annual / 100}/yr`,
    );
  }

  // Check for existing prices
  const existingPrices = await stripe.prices.list({
    product: product.id,
    limit: 100,
  });

  // Find or create monthly price
  let monthlyPrice = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === "month" &&
      p.active &&
      p.metadata.type === "monthly-multicurrency",
  );

  if (monthlyPrice) {
    console.log(`\n  📌 Found existing monthly price: ${monthlyPrice.id}`);
    // Note: Stripe doesn't allow updating currency_options on existing prices
    // You'd need to archive and create a new one if amounts change
  } else {
    // Create new monthly price with multi-currency
    monthlyPrice = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: CURRENCY_OPTIONS.usd.monthly,
      recurring: {
        interval: "month",
        trial_period_days: TRIAL_DAYS,
      },
      currency_options: monthlyCurrencyOptions,
      metadata: {
        type: "monthly-multicurrency",
      },
    });
    console.log(`\n  ✅ Created monthly price: ${monthlyPrice.id}`);
  }

  // Find or create annual price
  let annualPrice = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === "year" &&
      p.active &&
      p.metadata.type === "annual-multicurrency",
  );

  if (annualPrice) {
    console.log(`  📌 Found existing annual price: ${annualPrice.id}`);
  } else {
    // Create new annual price with multi-currency
    annualPrice = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: CURRENCY_OPTIONS.usd.annual,
      recurring: {
        interval: "year",
        trial_period_days: TRIAL_DAYS,
      },
      currency_options: annualCurrencyOptions,
      metadata: {
        type: "annual-multicurrency",
      },
    });
    console.log(`  ✅ Created annual price: ${annualPrice.id}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📝 Add these to your .env file:");
  console.log("=".repeat(60) + "\n");

  console.log(`STRIPE_PRODUCT_ID=${product.id}`);
  console.log(`STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`);
  console.log(`STRIPE_PRICE_ANNUAL=${annualPrice.id}`);

  // Configure Billing Portal for plan upgrades (monthly ↔ annual)
  console.log("\n📋 Configuring Billing Portal...\n");

  try {
    // Check for existing portal configuration
    const existingConfigs = await stripe.billingPortal.configurations.list({
      limit: 10,
    });

    const existingConfig = existingConfigs.data.find((c) => c.is_default);

    if (existingConfig) {
      // Update existing default config
      await stripe.billingPortal.configurations.update(existingConfig.id, {
        features: {
          subscription_update: {
            enabled: true,
            default_allowed_updates: ["price"],
            proration_behavior: "create_prorations",
            products: [
              {
                product: product.id,
                prices: [monthlyPrice.id, annualPrice.id],
              },
            ],
          },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
            cancellation_reason: {
              enabled: true,
              options: [
                "too_expensive",
                "missing_features",
                "switched_service",
                "unused",
                "other",
              ],
            },
          },
          payment_method_update: {
            enabled: true,
          },
          invoice_history: {
            enabled: true,
          },
        },
      });
      console.log("  ✅ Updated Billing Portal configuration");
    } else {
      // Create new portal config
      await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: "Manage your Splitwise for YNAB subscription",
        },
        features: {
          subscription_update: {
            enabled: true,
            default_allowed_updates: ["price"],
            proration_behavior: "create_prorations",
            products: [
              {
                product: product.id,
                prices: [monthlyPrice.id, annualPrice.id],
              },
            ],
          },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
            cancellation_reason: {
              enabled: true,
              options: [
                "too_expensive",
                "missing_features",
                "switched_service",
                "unused",
                "other",
              ],
            },
          },
          payment_method_update: {
            enabled: true,
          },
          invoice_history: {
            enabled: true,
          },
        },
        default_return_url: process.env.NEXTAUTH_URL
          ? `${process.env.NEXTAUTH_URL}/dashboard/settings`
          : "https://splitwiseforynab.com/dashboard/settings",
      });
      console.log("  ✅ Created Billing Portal configuration");
    }

    console.log("     • Monthly ↔ Annual upgrades enabled");
    console.log("     • Cancellation with feedback enabled");
    console.log("     • Payment method updates enabled");
  } catch (portalError) {
    console.log("  ⚠️  Could not configure Billing Portal:", portalError);
    console.log(
      "     Configure manually at: https://dashboard.stripe.com/settings/billing/portal",
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("📝 Add these to your .env file:");
  console.log("=".repeat(60) + "\n");

  console.log(`STRIPE_PRODUCT_ID=${product.id}`);
  console.log(`STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`);
  console.log(`STRIPE_PRICE_ANNUAL=${annualPrice.id}`);

  console.log("\n" + "=".repeat(60));
  console.log("🎯 Enable Adaptive Pricing in Stripe Dashboard:");
  console.log("   https://dashboard.stripe.com/settings/checkout");
  console.log("=".repeat(60));

  console.log("\n✅ Stripe setup complete!");
  console.log(
    "   • Multi-currency prices created for: USD, GBP, EUR, CAD, AUD",
  );
  console.log("   • Adaptive Pricing will handle all other currencies");
  console.log("   • 34-day free trial configured");
  console.log("   • Billing Portal configured for plan upgrades");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
