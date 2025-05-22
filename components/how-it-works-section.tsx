import Image from "next/image"

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">How It Works</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple Workflow</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              See how Splitwise for YNAB automates your shared expense tracking
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-10 py-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">When You Pay</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-800">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Categorize in YNAB</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Categorize the $50 outflow in your Gas/Parking category
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-800">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Flag the transaction</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Flag the transaction with a color (blue by default)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-800">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">We handle the rest</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      The app adds the expense to Splitwise and creates the balancing transaction in YNAB
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="w-full">
                <Image
                  src="/placeholder.svg?height=300&width=400"
                  alt="When you pay example"
                  width={400}
                  height={300}
                  className="rounded-lg"
                />
                <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  YNAB shows you&apos;ve only spent $25 on your half of gas
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="order-2 md:order-1 flex items-center justify-center rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="w-full">
                <Image
                  src="/placeholder.svg?height=300&width=400"
                  alt="When partner pays example"
                  width={400}
                  height={300}
                  className="rounded-lg"
                />
                <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  YNAB shows you&apos;ve spent $50 on your half of the electricity bill
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2 space-y-4">
              <h3 className="text-2xl font-bold">When Your Partner Pays</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-800">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Partner adds to Splitwise</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your partner adds a $100 split evenly expense to your shared group
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-800">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">We detect the change</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      The app detects the new expense in Splitwise
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-800">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">We create the transaction</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      The app adds a $50 outflow transaction into your Splitwise account in YNAB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
