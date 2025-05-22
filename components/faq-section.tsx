import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FaqSection() {
  return (
    <section id="faq" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">FAQ</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Frequently Asked Questions</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Common questions about Splitwise for YNAB
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-3xl space-y-4 py-12">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What if my partner doesn&apos;t use YNAB?</AccordionTrigger>
              <AccordionContent>
                This still works as long as your partner enters an expense into the configured shared group in their
                Splitwise app.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What if an expense isn&apos;t split evenly?</AccordionTrigger>
              <AccordionContent>
                Enter it directly in the Splitwise app as such. A common scenario is when you front a full purchase for
                your partner. In your Splitwise app, add an expense where you&apos;re owed the full amount. Both transactions
                will cancel out in YNAB, and would be a good candidate for a Reimbursements category.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How do I handle settling up?</AccordionTrigger>
              <AccordionContent>
                When you settle up on Splitwise, the transaction is categorized as a transfer between your Splitwise
                account and your Checking account. Note that the dollars in your fake Splitwise cash account are not
                spendable. When the balance is positive (you are owed money), you can assign those dollars in your plan,
                but they are not in your Checking account yet. You must keep an eye on this and settle up as needed.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>How do I mark a transaction as shared?</AccordionTrigger>
              <AccordionContent>
                Flag the transaction with a color in YNAB (blue by default, but this is configurable). When triggered,
                this app will search for flagged transactions and process them automatically.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Do I need to create a Splitwise cash account in YNAB?</AccordionTrigger>
              <AccordionContent>
                Yes, you should create a Splitwise cash account in YNAB to track your Splitwise balance. This app will
                automatically add transactions to this account when processing shared expenses.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  )
}
