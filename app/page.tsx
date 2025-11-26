import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SignInButton } from "@/components/sign-in-button";
import {
  PersonaWalkthrough,
  YNABCategories,
  YNABAccounts,
  YNABTransaction,
} from "@/components/persona-walkthrough";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      <Header />

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 pb-12 sm:pb-20">
        <div className="text-center mb-4 sm:mb-6">
          <p className="sm:text-sm text-xs uppercase tracking-[0.2em] text-amber-700 dark:text-amber-500 font-medium mb-4 sm:mb-8">
            For YNAB users who split expenses
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-4 sm:mb-8">
            Your categories are{" "}
            <span className="relative">
              <span className="relative z-10">lying</span>
              <span
                className="absolute bottom-0.5 sm:bottom-1 md:bottom-2 left-0 w-full h-2 sm:h-3 bg-red-200 dark:bg-red-900/50 -z-0"
                aria-hidden="true"
              />
            </span>{" "}
            to you.
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            That $150 grocery run? Only $75 was yours.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="text-gray-900 dark:text-white font-medium">
              We make YNAB see the truth.
            </span>
          </p>
        </div>

        {/* YNAB-style Category Comparison */}
        <div className="max-w-xl mx-auto my-8 sm:my-16 space-y-4 sm:space-y-6">
          {/* Without - shows less available */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 text-center font-medium">
              Without Splitwise for YNAB
            </p>
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
                },
              ]}
            />
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 text-center">
              You spent $150 on groceries...
            </p>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>

          {/* With - shows more available */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 text-center font-medium">
              With Splitwise for YNAB
            </p>
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
                  },
                ]}
              />
            </div>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2 text-center">
              ✓ Only $75 was yours—accurate category balance
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <SignInButton />
        </div>
      </section>

      {/* The Secret: Phantom Account Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#141414] border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-6">
              The secret: a phantom Splitwise account
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Create a Splitwise cash account in YNAB—it&apos;s not a real bank
              account, just an IOU ledger. Positive balance means you&apos;re
              owed money. Negative means you owe. When you settle up, it goes to
              zero.
            </p>
          </div>

          {/* Accounts Example */}
          <div className="max-w-md mx-auto mb-8">
            <YNABAccounts
              title="Accounts"
              accounts={[
                { name: "💰 Checking", balance: "$750.00", isPositive: true },
                {
                  name: "💳 Credit Card",
                  balance: "-$100.00",
                  isPositive: false,
                },
                {
                  name: "🤝 Splitwise",
                  balance: "+$75.00",
                  isPositive: true,
                  highlight: true,
                },
              ]}
            />
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +$75
              </span>{" "}
              — Your partner owes you half of that $150 grocery run
            </p>
          </div>

          {/* Info banner */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              <strong>Don&apos;t have Splitwise?</strong>{" "}
              <a
                href="https://www.splitwise.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                It&apos;s free to sign up
              </a>
              —great for tracking shared expenses with anyone.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Persona Walkthrough */}
      <PersonaWalkthrough />

      {/* What We Automate Section */}
      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-[#0a0a0a] border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-6">
              One flag. That&apos;s it.
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Flag a shared expense in YNAB—we create the Splitwise entry and
              the adjustment transaction automatically.
            </p>
          </div>

          {/* Flagging Example */}
          <div className="mb-10">
            <YNABTransaction
              flag="blue"
              account="💰 Checking"
              date={new Date()}
              payee="Whole Foods"
              category="🛒 Groceries"
              outflow="$150.00"
              highlightFlag
            />
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
              👆 Click the flag to try it
            </p>
          </div>

          {/* What happens automatically */}
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-10">
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 font-medium">
              We handle the rest
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
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
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Expense created in Splitwise
                </p>
              </div>
              <div className="hidden sm:block text-gray-300 dark:text-gray-600">
                +
              </div>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
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
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Adjustment added to YNAB (same category)
                </p>
              </div>
            </div>
          </div>

          {/* Links to walkthroughs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href="#walkthrough-solo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            >
              <span>👤</span>
              <span>I use YNAB, my partner doesn&apos;t</span>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </a>
            <a
              href="#walkthrough-dual"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <span>👥</span>
              <span>We both use YNAB</span>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </a>
          </div>

          {/* Custom splits callout */}
          <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              <strong className="text-gray-900 dark:text-white">
                Not 50/50?
              </strong>{" "}
              No problem. You can set a custom split ratio.
            </p>
          </div>
        </div>
      </section>

      {/* The YNAB Problem Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-serif text-center text-gray-900 dark:text-white mb-6">
            The workarounds don&apos;t work.
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 sm:mb-16 max-w-xl mx-auto">
            Every YNAB user with shared expenses has tried these.
          </p>

          <div className="space-y-6">
            {/* Option 1 */}
            <div className="bg-white dark:bg-[#141414] p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  The &ldquo;Reimbursement&rdquo; category
                </h3>
                <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  Loses insight
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Dump all shared expenses into one generic category. Simple, but
                now you have no idea how much you <em>actually</em> spend on
                groceries, gas, or utilities.
              </p>
            </div>

            {/* Option 2 */}
            <div className="bg-white dark:bg-[#141414] p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Manual split transactions
                </h3>
                <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  Time sink
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Create multi-line split transactions for every settlement. Takes
                15+ minutes each time. Miss one? Your accounts won&apos;t
                reconcile.
              </p>
            </div>

            {/* The Solution */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Splitwise cash account
                </h3>
                <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  Our solution
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Keep your detailed categories. Skip the data entry. Flag with a
                color—we create the Splitwise expense <em>and</em> the YNAB
                adjustment. Same category, correct amount. Works whether your
                partner uses YNAB or not.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 bg-gray-900 dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">
            Finally, accurate category spending.
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            See what you <em>actually</em> spend—not what you fronted for
            someone else. Connect in 2 minutes.
          </p>
          <SignInButton variant="dark" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
