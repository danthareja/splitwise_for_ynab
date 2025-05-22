import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()

  // If the user is not signed in, redirect to the sign-in page
  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Splitwise for YNAB</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Signed in as {session.user?.name || "YNAB User"}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">YNAB Connection</h2>
            <p className="text-green-600 mb-4">✓ Connected</p>
            <p className="text-sm text-gray-500 mb-4">
              Your YNAB account is connected. You can now flag transactions in YNAB to mark them as shared expenses.
            </p>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Splitwise Connection</h2>
            <p className="text-red-600 mb-4">✗ Not Connected</p>
            <p className="text-sm text-gray-500 mb-4">
              Connect your Splitwise account to sync shared expenses between YNAB and Splitwise.
            </p>
            <Button>Connect Splitwise</Button>
          </div>
        </div>

        <div className="mt-8 border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <p className="text-sm text-gray-500">No recent activity. Flag a transaction in YNAB to get started.</p>
        </div>
      </main>
    </div>
  )
}
