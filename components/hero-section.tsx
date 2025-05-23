import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-8 md:space-y-12">
          <div className="space-y-4 max-w-[800px]">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Sync YNAB & Splitwise Automatically
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-[600px] mx-auto">
              Flag a transaction in YNAB, we'll handle the rest.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
            <Link href="/auth/signin" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 text-lg py-6">
                Sign in with YNAB <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full py-6">
                How it works
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-2">Before</h3>
              <ol className="ml-5 list-decimal text-gray-600 dark:text-gray-300 space-y-2">
                <li>Categorize expense in YNAB</li>
                <li>Add expense in Splitwise</li>
                <li>Add balancing transaction in YNAB</li>
              </ol>
            </div>
            <div className="p-6 bg-green-50 dark:bg-green-900/20 flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-2">After</h3>
              <ol className="ml-5 list-decimal text-gray-600 dark:text-gray-300 space-y-2">
                <li>Flag transaction in YNAB</li>
                <li>That's it! We handle the rest</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
