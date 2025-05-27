import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Zap, ExternalLink } from "lucide-react";
import { InteractiveTransactionDemo } from "@/components/interactive-transaction-demo";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-6 mb-8">
            <Image
              src="/images/splitwise-logo.png"
              alt="Splitwise Logo"
              width={64}
              height={64}
            />
            <span className="text-3xl font-bold text-gray-400 dark:text-gray-500">
              +
            </span>
            <Image
              src="/images/ynab-logo.png"
              alt="YNAB Logo"
              width={64}
              height={64}
            />
          </div>
          <Badge
            variant="secondary"
            className="mb-6 px-3 py-1 text-sm font-medium bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/50 dark:to-green-900/50 text-blue-800 dark:text-blue-200 hover:from-blue-200 hover:to-green-200 dark:hover:from-blue-800/50 dark:hover:to-green-800/50 border-0"
          >
            For YNAB Users & Coaches
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Automate your Shared Expenses
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Stop the tedious manual data entry. Flag a transaction in YNAB, and
            we&apos;ll automatically sync it with Splitwise while maintaining{" "}
            <span className="font-bold"> perfect category tracking</span>.
          </p>
          <div className="flex justify-center">
            <Button
              size="lg"
              className="text-base px-6 py-4 h-auto bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
              asChild
            >
              <Link href="/auth/signin">
                Sign in with YNAB
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              The Problem
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Not all partnerships use joint accounts. If you&apos;re in a
              partnership with many shared expenses but separate accounts,
              tracking this in YNAB can be a pain.
            </p>
          </div>

          <div className="mb-16">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight text-center">
              Common Challenges:
            </h3>
            <div className="max-w-2xl mx-auto">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2.5 mr-3 flex-shrink-0"></div>
                  <span className="text-base text-gray-700 dark:text-gray-300">
                    You cover their share of purchases at first
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2.5 mr-3 flex-shrink-0"></div>
                  <span className="text-base text-gray-700 dark:text-gray-300">
                    Some of your expenses are paid by your partner
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2.5 mr-3 flex-shrink-0"></div>
                  <span className="text-base text-gray-700 dark:text-gray-300">
                    How to plan for a partner&apos;s share of groceries?
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2.5 mr-3 flex-shrink-0"></div>
                  <span className="text-base text-gray-700 dark:text-gray-300">
                    How to track paying them back for rent?
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Prominent Splitwise Introduction */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl transform rotate-1"></div>
            <Card className="relative bg-white dark:bg-gray-800 border-0 shadow-xl overflow-hidden transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <CardContent className="p-10 text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <Image
                      src="/images/splitwise-logo.png"
                      alt="Splitwise Logo"
                      width={32}
                      height={32}
                    />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  Enter: Splitwise
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed max-w-2xl mx-auto">
                  Splitwise helps track who owes what, but integrating it with
                  YNAB&apos;s detailed budgeting has been a{" "}
                  <strong className="text-red-600 dark:text-red-400">
                    manual nightmare
                  </strong>
                  .
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                  <span className="mr-2">⚡</span>
                  Until now...
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Existing Solution Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              The Existing Solution
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-4">
              YNAB&apos;s{" "}
              <a
                href="https://support.ynab.com/en_us/splitwise-and-ynab-a-guide-H1GwOyuCq"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                official guide <ExternalLink className="h-3 w-3 ml-1" />
              </a>{" "}
              makes you choose: either lose detailed spending insights or spend
              hours on manual data entry.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12 relative">
            {/* Option 1 */}
            <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-900">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Keep It Simple
                  </h3>
                </div>
                <p className="text-base text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  Use a generic &quot;Splitting&quot; category for all shared
                  expenses.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    ✓ Easy to manage
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    ✗ Lose all category insights
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Can&apos;t track spending on groceries, utilities, etc.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Big OR divider */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                  OR
                </span>
              </div>
            </div>

            {/* Option 2 */}
            <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-900">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Keep It Detailed
                  </h3>
                </div>
                <p className="text-base text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  Create complex &quot;Settle Up&quot; split transactions with
                  multiple lines.
                </p>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg mb-4">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    ✓ Maintain category accuracy
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    ✗ Extremely tedious process
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Manual split transactions for every settlement
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* You Shouldn't Have to Choose */}
          <Card className="max-w-3xl mx-auto border-2 border-green-200 dark:border-green-800 shadow-lg overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            <CardContent className="p-10 text-center">
              {/* <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div> */}
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                You Shouldn&apos;t Have to Choose
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
                Our solution gives you{" "}
                <strong className="text-green-600 dark:text-green-400">
                  both simplicity AND detailed category tracking
                </strong>{" "}
                without any manual work.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-blue-500 mr-2" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Simple as Option 1
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Just flag transactions with a color. That&apos;s it.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center mb-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Detailed as Option 2
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Perfect category tracking with zero manual split
                    transactions.
                  </p>
                </div>
              </div>

              {/* <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/50 dark:to-blue-900/50 text-green-800 dark:text-green-200 rounded-full text-base font-medium">
                <span className="mr-2">🎯</span>
                The best of both worlds, automatically
              </div> */}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Our Solution Section */}
      <section className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              Our Solution
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Our solution uses a{" "}
              <strong className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Splitwise cash account
              </strong>{" "}
              in YNAB to track the balance owed in the Splitwise app. Let me
              show you exactly how this works with a real example.
            </p>
          </div>

          {/* Introduction */}
          <div className="mb-16">
            <Card className="max-w-4xl mx-auto border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                      How It Works:
                    </h3>
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <strong className="text-gray-900 dark:text-white font-medium">
                            Positive balance:
                          </strong>
                          <span className="text-gray-600 dark:text-gray-300 ml-1">
                            You&apos;re owed money by your partner
                          </span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <strong className="text-gray-900 dark:text-white font-medium">
                            Negative balance:
                          </strong>
                          <span className="text-gray-600 dark:text-gray-300 ml-1">
                            You owe money to your partner
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-8 rounded-xl text-center">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                      Starting Point: Clean Slate
                    </h4>
                    <div className="max-w-[300px] mx-auto border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                      <img
                        src="/images/0-accounts-2.png"
                        alt="YNAB accounts showing Checking at $400 and Splitwise at $0"
                        className="w-full"
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium">
                      Both accounts are ready: Checking has $400, Splitwise
                      starts at $0
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real Example Header */}
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              A Real Example: Dan and Eira&apos;s Month
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Follow along as Dan and Eira handle their shared expenses
              throughout the month. Dan uses YNAB, but Eira does not.
            </p>
          </div>

          {/* Example 1: Dan Pays for Gas */}
          <div className="mb-20">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl mb-8">
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Step 1: Dan pays $50 for gas
              </h4>
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                Dan fills up the car they both use. Here&apos;s the manual
                process to categorize this expense:
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      1
                    </div>
                    <h5 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      YNAB Transaction
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    Dan categorizes the $50 <strong>outflow</strong> in his{" "}
                    <i>Transportation</i> category
                  </p>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                    <img
                      src="/images/8-flag.png"
                      alt="YNAB transaction showing $50 gas expense"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      2
                    </div>
                    <h5 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      Splitwise Entry
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    Dan adds a $50 <strong>split evenly</strong> expense to
                    their shared group
                  </p>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                    <img
                      src="/images/2-splitwise-exp-2.png"
                      alt="Splitwise showing gas expense split between Dan and Eira"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      3
                    </div>
                    <h5 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      YNAB Adjustment
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    Dan adds a $25 <strong>inflow</strong> to his Splitwise
                    account, categorized back to <i>Transportation</i>
                  </p>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                    <img
                      src="/images/1-ynab-txn.png"
                      alt="YNAB showing both gas transactions"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 p-6 rounded-xl bg-white dark:bg-gray-800">
              <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                Result:
              </h5>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Dan&apos;s YNAB shows:</strong> Only spent $25 on{" "}
                    <i>Transportation</i> (his half)
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Dan&apos;s Splitwise shows:</strong>{" "}
                    <span className="text-green-600 font-bold">+$25</span> (Eira
                    owes Dan)
                  </p>
                </div>
                <div className="max-w-[300px] border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                  <img
                    src="/images/3-accounts-2.png"
                    alt="YNAB accounts showing positive Splitwise balance"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Example 2: Eira Pays for Electricity */}
          <div className="mb-20">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl mb-8">
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Step 2: Eira pays $100 for electricity
              </h4>
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                Later that day, Eira pays their shared electricity bill.
                Here&apos;s how Dan handles this in his YNAB:
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      1
                    </div>
                    <h5 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      Splitwise Expense
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    Eira adds the $100 electricity bill to their shared group
                  </p>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                    <img
                      src="/images/4-splitwise-exp-2.png"
                      alt="Splitwise showing both gas and electric expenses"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      2
                    </div>
                    <h5 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      YNAB Transaction
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    Dan adds a $50 <strong>outflow</strong> to his Splitwise
                    account, categorized to <i>Utilities</i>
                  </p>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                    <img
                      src="/images/5-ynab-txn.png"
                      alt="YNAB showing utilities transaction"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 p-6 rounded-xl bg-white dark:bg-gray-800">
              <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                Result:
              </h5>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Dan&apos;s YNAB shows:</strong> Spent $50 on
                    Utilities (his half)
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Dan&apos;s Splitwise shows:</strong>{" "}
                    <span className="text-red-600 font-bold">-$25</span> (Dan
                    owes Eira $25 net)
                  </p>
                </div>
                <div className="max-w-[300px] border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                  <img
                    src="/images/6-accounts-2.png"
                    alt="YNAB accounts showing negative Splitwise balance"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settling Up */}
          <div className="mb-16">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl mb-8">
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Step 3: Settling Up
              </h4>
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                At the end of the month, Dan and Eira settle their balance. Dan
                sends Eira $25 and categorizes it as a transfer to his Splitwise
                account.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
                <CardContent className="p-8 text-center">
                  <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                    Transfer: Checking → Splitwise
                  </h5>
                  <p className="text-base text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    Dan sends $25 from his Checking account to Eira and
                    categorizes it as a transfer to his Splitwise account
                  </p>
                  <div className="max-w-[300px] mx-auto border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
                    <img
                      src="/images/7-settle-2.png"
                      alt="YNAB accounts after settling up"
                      className="w-full"
                    />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mt-6">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      <strong>Important:</strong> Settle-up transactions
                      don&apos;t affect spending plan categories! Dan still
                      shows $25 spent on Transportation and $50 on Utilities.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Important Caveat */}
          <Card className="max-w-3xl mx-auto border-yellow-200 dark:border-yellow-800 border-2 shadow-md overflow-hidden bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white font-bold text-sm">!</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                    Important Caveat
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                    With this workflow,{" "}
                    <strong>
                      the dollars in your Splitwise cash account are not
                      spendable
                    </strong>
                    . When the balance is positive (you are owed money), you can
                    assign those dollars in your plan, but they are not in your
                    Checking account yet.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                    You must keep an eye on this and settle up as needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* The Automation */}
      <section className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              The Automation
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Here&apos;s the cool part:{" "}
              <strong className="text-green-600 dark:text-green-400">
                We automate ALL the manual steps above.{" "}
              </strong>
              All you have to do is flag transactions with a color.
            </p>
          </div>

          {/* Interactive Demo */}
          <div className="mb-16">
            <InteractiveTransactionDemo />
          </div>

          {/* What Happens Automatically Behind the Scenes */}
          <div className="mb-16">
            <Card className="max-w-4xl mx-auto border-0 shadow-md overflow-hidden bg-white dark:bg-gray-900">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8 tracking-tight">
                  What Happens Automatically Behind the Scenes
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <Image
                        src="/images/splitwise-logo.png"
                        alt="Splitwise"
                        width={24}
                        height={24}
                      />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Splitwise Integration
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Creates a split expense in your shared group with the
                        exact amount and description from YNAB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <Image
                        src="/images/ynab-logo.png"
                        alt="YNAB"
                        width={24}
                        height={24}
                      />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        YNAB Transaction
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Adds the corresponding adjustment transaction to your
                        Splitwise account with proper categorization
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Savings */}
          {/* <Card className="max-w-4xl mx-auto border-2 border-green-200 dark:border-green-800 shadow-lg overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            <CardContent className="p-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">⏱️</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                Save Hours Every Month
              </h3>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-red-600 mb-2">5 min</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Per transaction manually</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-blue-600 mb-2">2 sec</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">With our automation</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-green-600 mb-2">150x</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Faster processing</p>
                </div>
              </div>
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/50 dark:to-blue-900/50 text-green-800 dark:text-green-200 rounded-full text-base font-medium">
                <span className="mr-2">🎯</span>
                More time for what matters, perfect expense tracking guaranteed
              </div>
            </CardContent>
          </Card> */}
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 tracking-tight">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  What if my partner already uses YNAB?
                </h3>
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  This still works perfectly! You and your partner can both
                  connect to the same Splitwise group, and we&apos;ll sync your
                  transactions automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  What if an expense isn&apos;t split evenly?
                </h3>
                <p className="text-base text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  Enter it directly in the Splitwise app with custom splits. Our
                  system will respect the split ratios you set there.
                </p>
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  <strong className="font-medium">Common scenario:</strong> When
                  you front a full purchase for your partner, add an expense in
                  Splitwise where you&apos;re owed the full amount. Both
                  transactions will cancel out in YNAB - perfect for a
                  &quot;Reimbursements&quot; category.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
            Ready to Automate Your Shared Expenses?
          </h2>
          <p className="text-xl text-blue-100 dark:text-blue-200 mb-10 leading-relaxed">
            Join YNAB users who&apos;ve eliminated manual data entry and gained
            perfect expense tracking.
          </p>
          <Button
            size="lg"
            className="text-base px-6 py-4 h-auto bg-white hover:bg-gray-50 text-blue-600 font-medium border-2 border-white hover:border-gray-200 transition-all"
            asChild
          >
            <Link href="/auth/signin">
              Sign in with YNAB
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          {/* <p className="text-blue-200 dark:text-blue-300 mt-6 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p> */}
        </div>
      </section>

      <Footer />
    </div>
  );
}
