import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="w-full py-12 md:py-16 bg-gray-50 dark:bg-gray-900"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <h2 className="text-3xl font-bold tracking-tighter">How It Works</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-[600px]">
            Simple workflow for both partners
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary mr-2">
                1
              </span>
              When You Pay
            </h3>
            <ol className="space-y-3 ml-10 list-decimal">
              <li className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Categorize & flag in YNAB</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Flag the transaction with your chosen color
                </p>
              </li>
              <li className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">We handle the rest</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  We add the expense to Splitwise and create the balancing
                  transaction in YNAB
                </p>
              </li>
            </ol>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary mr-2">
                2
              </span>
              When Your Partner Pays
            </h3>
            <ol className="space-y-3 ml-10 list-decimal">
              <li className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Partner adds to Splitwise</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  They add the expense to your shared group
                </p>
              </li>
              <li className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">We create the transaction</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  We add your half of the expense to your YNAB budget
                  automatically
                </p>
              </li>
            </ol>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <Link href="/auth/signin">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
