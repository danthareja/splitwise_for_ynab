import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Splitwise for YNAB
              </h1>
              <p className="text-gray-500 md:text-xl dark:text-gray-400">
                Sync shared expenses with your partner between YNAB and Splitwise automatically
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Link href="/auth/signin">
                <Button size="lg" className="gap-1">
                  Sign in with YNAB <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline">
                  Learn how it works
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No more manual entry. Flag a transaction in YNAB and we&apos;ll handle the rest.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-[350px] w-full overflow-hidden rounded-xl border bg-white shadow-lg dark:border-gray-800 dark:bg-gray-950">
              <div className="p-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Before & After</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">From manual entry to automated syncing</p>
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 font-medium">Manual Process:</h4>
                    <ol className="ml-5 list-decimal text-sm text-gray-500 dark:text-gray-400">
                      <li className="mb-1">Categorize expense in YNAB</li>
                      <li className="mb-1">Add expense in Splitwise</li>
                      <li className="mb-1">Add balancing transaction in YNAB</li>
                    </ol>
                  </div>
                  <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
                    <h4 className="mb-2 font-medium">With Splitwise for YNAB:</h4>
                    <ol className="ml-5 list-decimal text-sm text-gray-500 dark:text-gray-400">
                      <li className="mb-1">Flag transaction in YNAB</li>
                      <li className="mb-1">That&apos;s it! We handle the rest</li>
                    </ol>
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
