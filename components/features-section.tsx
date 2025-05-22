import { CheckCircle, Flag, RefreshCw, Wallet } from "lucide-react"

export default function FeaturesSection() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">Features</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simplify Shared Expenses</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Automate the tedious process of syncing shared expenses between YNAB and Splitwise
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <Flag className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Simple Flagging System</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Just flag a transaction in YNAB to mark it as a shared expense. No need to switch between apps.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Automatic Syncing</h3>
              <p className="text-gray-500 dark:text-gray-400">
                We automatically create the expense in Splitwise and add the corresponding transaction in YNAB.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Works with Both Partners</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Whether you or your partner pays, the app handles both scenarios seamlessly.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Accurate Budgeting</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Ensures your YNAB budget accurately reflects your true spending by automatically adjusting for shared
                expenses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
