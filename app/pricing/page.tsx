import { auth } from "@/auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Crown, Zap, Clock, Key, History, X } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Splitwise for YNAB",
  description:
    "Choose the perfect plan for your expense tracking needs. Free tier for manual syncing, Premium for automated hourly syncs and advanced features.",
};

export default async function PricingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start for free, upgrade when you need more. No hidden fees, cancel
            anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for occasional syncing</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm">
                    Manual sync (2 per hour, 6 per day)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm">7 days of sync history</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm">Basic YNAB ↔ Splitwise sync</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm">Equal split ratio (1:1) only</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm">Email notifications</span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    No automatic sync
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    No API access
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    No custom split ratios
                  </span>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                className="w-full mt-6"
                size="lg"
              >
                <Link href={session ? "/dashboard" : "/auth/signin"}>
                  {session ? "Go to Dashboard" : "Get Started Free"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Premium Tier */}
          <Card className="relative border-2 border-primary shadow-lg">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            </div>

            <CardHeader className="pt-8">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">Premium</CardTitle>
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <CardDescription>
                For power users who want automation
              </CardDescription>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">$4.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  or $49/year (save 18%)
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">
                    <strong>Unlimited manual syncs</strong> - sync as often as
                    you need
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">
                    <strong>Automatic hourly sync</strong> - set it and forget
                    it
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Key className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">
                    <strong>API key access</strong> - programmatic syncing
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <History className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">
                    <strong>Unlimited sync history</strong> - never lose a
                    record
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">
                    <strong>Custom split ratios</strong> - any ratio you need
                    (60/40, 70/30, etc.)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">
                    <strong>Custom payee names</strong> - full YNAB control
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">Everything in Free, plus more</span>
                </div>
              </div>

              <Button asChild className="w-full mt-6" size="lg">
                <Link href={session ? "/dashboard" : "/auth/signin"}>
                  <Crown className="mr-2 h-4 w-4" />
                  {session ? "Upgrade to Premium" : "Start Free Trial"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I switch plans anytime?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade to Premium anytime from your dashboard.
                  If you&apos;re on Premium and want to downgrade, you can
                  cancel your subscription and you&apos;ll keep Premium access
                  until the end of your billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What happens if I cancel Premium?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  When you cancel, you&apos;ll keep Premium access until the end
                  of your current billing period. After that, your account will
                  automatically switch to the Free tier. Your data and settings
                  are preserved, but premium features (automatic sync, unlimited
                  history, custom ratios) will no longer be available.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Is there a free trial for Premium?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  The Free tier is a great way to try out the core
                  functionality! Once you&apos;re ready for automatic syncs and
                  advanced features, you can upgrade to Premium anytime. We
                  don&apos;t currently offer a trial period, but you can cancel
                  anytime if Premium isn&apos;t right for you.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What payment methods do you accept?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We use Stripe for secure payment processing and accept all
                  major credit cards (Visa, Mastercard, American Express,
                  Discover) and debit cards.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! If you&apos;re not satisfied with Premium, contact us at{" "}
                  <a
                    href="mailto:support@splitwiseforynab.com"
                    className="text-primary hover:underline"
                  >
                    support@splitwiseforynab.com
                  </a>{" "}
                  within 7 days of your purchase and we&apos;ll issue a full
                  refund, no questions asked.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I use this with multiple Splitwise groups?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Currently, the app is designed for one Splitwise group with
                  exactly 2 members (perfect for couples or partners). This
                  ensures accurate expense splitting and sync. We may expand to
                  support more groups in the future!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 py-12 border-t">
          <h2 className="text-3xl font-bold mb-4">
            Ready to automate your expense tracking?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join users who have automated their Splitwise ↔ YNAB workflow.
            Start free, upgrade anytime.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href={session ? "/dashboard" : "/auth/signin"}>
                {session ? "Go to Dashboard" : "Get Started Free"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Learn More</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
