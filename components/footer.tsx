import Link from "next/link"
import { Github } from "lucide-react"

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Splitwise for YNAB. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/yourusername/splitwise-for-ynab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link href="/privacy" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            Terms
          </Link>
          <Link href="/contact" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}
