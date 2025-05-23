import { Flag, RefreshCw, Wallet } from "lucide-react"

export default function FeaturesSection() {
  return (
    <section id="features" className="w-full py-12 md:py-16 bg-white dark:bg-gray-950">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
              <Flag className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Flag & Forget</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Just flag a transaction in YNAB. We'll create the Splitwise expense and add the balancing transaction.
            </p>
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Two-Way Sync</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Works whether you or your partner pays. Both YNAB budgets stay accurate automatically.
            </p>
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">True Budgeting</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Your YNAB budget accurately reflects your true spending by automatically adjusting for shared expenses.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
