import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function FaqSection() {
  return (
    <section id="faq" className="w-full py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <h2 className="text-3xl font-bold tracking-tighter">Common Questions</h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What if my partner doesn't use YNAB?</AccordionTrigger>
              <AccordionContent>
                This still works as long as your partner enters expenses into your shared Splitwise group. The app will
                automatically add your half to your YNAB budget.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How do I mark a transaction as shared?</AccordionTrigger>
              <AccordionContent>
                Flag the transaction with your chosen color in YNAB (configurable in settings). The app will
                automatically process flagged transactions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What if an expense isn't split evenly?</AccordionTrigger>
              <AccordionContent>
                Enter it directly in the Splitwise app with the custom split. The app will still create the correct
                transaction in your YNAB budget.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex flex-col items-center space-y-4 mt-12">
          <h3 className="text-xl font-bold">Ready to simplify your shared expenses?</h3>
          <Link href="/auth/signin">
            <Button size="lg" className="gap-2">
              Sign in with YNAB <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
