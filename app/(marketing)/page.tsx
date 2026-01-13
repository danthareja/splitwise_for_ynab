import { headers } from "next/headers";
import { SignInButton } from "@/components/sign-in-button";
import {
  PersonaWalkthrough,
  YNABCategories,
  YNABAccounts,
  YNABTransaction,
} from "@/components/persona-walkthrough";
import {
  getCurrencyFromCountry,
  getPricingDisplay,
  calculateAnnualSavings,
  TRIAL_DAYS,
} from "@/lib/stripe-pricing";
import { FlagDemo } from "@/components/flag-demo";

export default async function LandingPage() {
  // Get geo-localized pricing based on visitor's country
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);
  const pricing = getPricingDisplay(currency);
  const savings = calculateAnnualSavings(currency);

  return (
    <>
      {/* Hero: Name the pain directly */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-6">
            Shared expenses break your plan
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-4">
            When you split groceries with your partner, YNAB categorizes the
            whole amount.
          </p>

          <div className="max-w-xl mx-auto mb-6 sm:mb-8">
            <YNABCategories
              title="Category"
              categories={[
                {
                  emoji: "🛒",
                  name: "Groceries",
                  assigned: "$300.00",
                  activity: "-$150.00",
                  available: "$150.00",
                  availableColor: "yellow",
                  transactions: [
                    {
                      account: "💰 Checking",
                      date: new Date().toLocaleDateString(),
                      payee: "Whole Foods",
                      amount: "-$150.00",
                    },
                  ],
                },
              ]}
            />
          </div>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-4">
            What if you could categorize just your half?
          </p>

          <div className="max-w-xl mx-auto mb-6 sm:mb-8">
            <div className="ring-2 ring-emerald-500/50 rounded-lg">
              <YNABCategories
                title="Category"
                categories={[
                  {
                    emoji: "🛒",
                    name: "Groceries",
                    assigned: "$300.00",
                    activity: "-$75.00",
                    available: "$225.00",
                    availableColor: "green",
                    transactions: [
                      {
                        account: "💰 Checking",
                        date: new Date().toLocaleDateString(),
                        payee: "Whole Foods",
                        amount: "-$150.00",
                      },
                      {
                        account: "🤝 Splitwise",
                        date: new Date().toLocaleDateString(),
                        payee: "Whole Foods",
                        amount: "+$75.00",
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
            We sync YNAB with Splitwise to{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              track what you spent
            </span>
            , not what you fronted.
          </p>

          <SignInButton />
        </div>
      </section>

      {/* The insight: Splitwise Account */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#141414]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500 font-medium mb-4">
              The secret
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 dark:text-white mb-6">
              Add a Splitwise account to YNAB
            </h2>
          </div>

          {/* The magic: two transactions */}
          <div className="text-center mb-6">
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Every expense split with your partner gets{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                two transactions
              </span>
              :
            </p>
          </div>

          <div className="max-w-xl mx-auto mb-8">
            <YNABCategories
              title="Category"
              categories={[
                {
                  emoji: "🛒",
                  name: "Groceries",
                  assigned: "$300.00",
                  activity: "-$75.00",
                  available: "$225.00",
                  availableColor: "green",
                  inlineActivity: true,
                  transactions: [
                    {
                      account: "💰 Checking",
                      date: new Date().toLocaleDateString(),
                      payee: "Whole Foods",
                      amount: "-$150.00",
                    },
                    {
                      account: "🤝 Splitwise",
                      date: new Date().toLocaleDateString(),
                      payee: "Whole Foods",
                      amount: "+$75.00",
                    },
                  ],
                },
              ]}
            />
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              The $150 original outflow + a $75 adjustment inflow ={" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                $75 you actually spent
              </span>
              .
            </p>
          </div>

          <p className="text-center text-base text-gray-600 dark:text-gray-400 mb-6">
            And a Splitwise account tracks what you&apos;re owed:
          </p>

          <div className="max-w-sm mx-auto mb-6">
            <YNABAccounts
              title="Accounts"
              accounts={[
                { name: "💰 Checking", balance: "$750.00", isPositive: true },
                {
                  name: "🤝 Splitwise",
                  balance: "+$75.00",
                  isPositive: true,
                  highlight: true,
                },
              ]}
            />
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            As an IOU ledger, not a real bank account.
          </p>

          {/* Splitwise info */}
          <div className="mt-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-lg mx-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              <strong>Don&apos;t have Splitwise?</strong>{" "}
              <a
                href="https://www.splitwise.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                It&apos;s free
              </a>
              —great for tracking shared expenses with anyone.
            </p>
          </div>
        </div>
      </section>

      {/* The integration */}
      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-[#0a0a0a] border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500 font-medium mb-4">
              The integration
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 dark:text-white mb-4">
              We automate the entire workflow
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Flag a shared expense in YNAB. We automatically create the
              Splitwise expense and add the adjustment transaction.
            </p>
          </div>

          {/* The interactive flag demo */}
          <div className="max-w-2xl mx-auto">
            <FlagDemo />
          </div>
        </div>
      </section>

      {/* Interactive Persona Walkthrough */}
      <PersonaWalkthrough />

      {/* The failed workarounds */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-[#0a0a0a] border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-serif text-center text-gray-900 dark:text-white mb-4">
            The workarounds don&apos;t work
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-10 max-w-lg mx-auto">
            Every YNAB user with shared expenses has tried these.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  Loses insight
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                &ldquo;Reimbursement&rdquo; category
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Dump all shared expenses into one bucket. Now you have no idea
                what you actually spend on groceries.
              </p>
            </div>

            <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  Time sink
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Manual split transactions
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Multi-line splits for every settlement. 15+ minutes each time.
                Miss one? Nothing reconciles.
              </p>
            </div>

            <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  Broken reports
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Just ignore it
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Accept that your spending reports are inflated. Defeats the
                whole point of budgeting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#141414] border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-4">
              Simple, fair pricing
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              One subscription covers you and your partner.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              Start with a{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {TRIAL_DAYS}-day free trial
              </span>
              .
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            {/* Monthly */}
            <div className="bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1">
                  Monthly
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    {pricing.monthlyDisplay}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    /month
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Flexibility to cancel anytime.
              </p>
            </div>

            {/* Annual - Highlighted */}
            <div className="relative bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border-2 border-emerald-500 dark:border-emerald-600 p-6">
              <div className="absolute -top-3 left-4">
                <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-emerald-500 text-white rounded-full">
                  Save {savings.percentage}%
                </span>
              </div>
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-medium mb-1">
                  Annual
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    {pricing.annualDisplay}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    /year
                  </span>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                  Just {pricing.annualPerMonth}/month
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Perfect as a yearly category target.
              </p>
            </div>
          </div>

          {/* What's included */}
          <div className="mt-10 sm:mt-14">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Unlimited syncs</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Both partners included</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 bg-gray-900 dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">
            See what you actually spend
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            Not what you fronted for your partner. Connect YNAB and Splitwise in
            2 minutes.
          </p>
          <SignInButton variant="dark" />
        </div>
      </section>
    </>
  );
}
