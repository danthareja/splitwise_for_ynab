import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Shield, Lock, Eye, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Data Protection & Security",
  description:
    "Learn how Splitwise for YNAB protects your data, handles YNAB and Splitwise API information, and maintains your privacy and security.",
  keywords: [
    "privacy policy",
    "data protection",
    "YNAB privacy",
    "Splitwise privacy",
    "data security",
    "financial data protection",
    "API data handling",
    "user privacy",
  ],
  openGraph: {
    title: "Privacy Policy - Splitwise for YNAB",
    description:
      "Learn how we protect your YNAB and Splitwise data with enterprise-grade security and privacy controls.",
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-gray-900 dark:text-white mb-4 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your privacy and data security are our top priorities. This policy
            explains how we handle your information.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Important Disclaimers - Required */}
        <Card className="mb-8 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Important Disclaimers
                </h2>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    <strong>YNAB:</strong> We are not affiliated, associated, or
                    in any way officially connected with YNAB, or any of its
                    subsidiaries or its affiliates. The official YNAB website
                    can be found at{" "}
                    <a
                      href="https://www.ynab.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      https://www.ynab.com
                    </a>
                    . The names YNAB and You Need A Budget as well as related
                    names, marks, emblems and images are registered trademarks
                    of YNAB.
                  </p>
                  <p>
                    <strong>Splitwise:</strong> We are not affiliated,
                    associated, or in any way officially connected with
                    Splitwise, or any of its subsidiaries or its affiliates. The
                    official Splitwise website can be found at{" "}
                    <a
                      href="https://www.splitwise.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      https://www.splitwise.com
                    </a>
                    . The name Splitwise as well as related names, marks,
                    emblems and images are registered trademarks of Splitwise,
                    Inc.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Data Collection and Usage */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Eye className="h-6 w-6 text-amber-600 dark:text-amber-500 mr-3" />
                <h2 className="text-2xl font-serif text-gray-900 dark:text-white">
                  What Data We Collect
                </h2>
              </div>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  To provide our service, we collect and process the following
                  information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>YNAB Data:</strong> Transaction details, account
                    information, and budget categories accessed through the YNAB
                    API
                  </li>
                  <li>
                    <strong>Splitwise Data:</strong> Expense information, group
                    memberships, and settlement details accessed through the
                    Splitwise API
                  </li>
                  <li>
                    <strong>Account Information:</strong> Email address and
                    basic profile information for authentication
                  </li>
                  <li>
                    <strong>Usage Data:</strong> Application logs and error
                    reports to improve our service
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Handling and Storage */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Lock className="h-6 w-6 text-emerald-600 dark:text-emerald-500 mr-3" />
                <h2 className="text-2xl font-serif text-gray-900 dark:text-white">
                  How We Handle and Store Your Data
                </h2>
              </div>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  <strong>
                    Data obtained through the YNAB and Splitwise APIs is handled
                    with the utmost care:
                  </strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Encryption:</strong> All data is encrypted in
                    transit using TLS 1.3 and at rest using AES-256 encryption
                  </li>
                  <li>
                    <strong>Secure Storage:</strong> Data is stored in secure,
                    SOC 2 compliant cloud infrastructure with regular security
                    audits
                  </li>
                  <li>
                    <strong>Access Controls:</strong> Strict access controls
                    ensure only authorized systems can access your data
                  </li>
                  <li>
                    <strong>Data Minimization:</strong> We only store the
                    minimum data necessary to provide our synchronization
                    service
                  </li>
                  <li>
                    <strong>Regular Backups:</strong> Encrypted backups are
                    maintained to ensure data availability and recovery
                  </li>
                  <li>
                    <strong>API Rate Limiting:</strong> We respect both YNAB and
                    Splitwise API rate limits to ensure service stability
                  </li>
                </ul>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 mt-6">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    <strong>Important:</strong> We do not directly request,
                    handle, or store any financial account credentials. We only
                    use OAuth access tokens obtained directly from YNAB and
                    Splitwise through their official authorization flows.
                  </p>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 mt-6">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                    Splitwise Data Handling:
                  </h4>
                  <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                    <li>
                      • We only access Splitwise data necessary for expense
                      synchronization
                    </li>
                    <li>
                      • We respect Splitwise&apos;s terms of service and API
                      usage guidelines
                    </li>
                    <li>
                      • Splitwise data is processed in real-time and not stored
                      longer than necessary
                    </li>
                    <li>
                      • We maintain separate security protocols for each API
                      integration
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Third-Party Data Sharing */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-amber-600 dark:text-amber-500 mr-3" />
                <h2 className="text-2xl font-serif text-gray-900 dark:text-white">
                  Third-Party Data Sharing
                </h2>
              </div>
              <div className="space-y-4 text-gray-600 dark:text-gray-400">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="space-y-2">
                    <p className="text-emerald-800 dark:text-emerald-200 font-semibold text-lg">
                      Data Protection Guarantees:
                    </p>
                    <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                      <li>
                        • <strong>YNAB Data:</strong> Will not unknowingly be
                        passed to any third-party
                      </li>
                      <li>
                        • <strong>Splitwise Data:</strong> Will not unknowingly
                        be passed to any third-party
                      </li>
                      <li>
                        • <strong>Cross-Platform:</strong> Data flows only
                        between YNAB and Splitwise as you explicitly direct
                      </li>
                    </ul>
                  </div>
                </div>

                <p>
                  <strong>
                    Here&apos;s exactly how we handle third-party interactions:
                  </strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>YNAB ↔ Splitwise Sync:</strong> We only send
                    transaction data to Splitwise that you explicitly flag for
                    sharing in YNAB, and vice versa
                  </li>
                  <li>
                    <strong>No Data Brokers:</strong> We never sell, rent, or
                    share your data with data brokers or marketing companies
                  </li>
                  <li>
                    <strong>Service Providers:</strong> We only work with
                    trusted service providers (hosting, monitoring) who are
                    bound by strict data protection agreements
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> We will only disclose
                    data if required by law, and we will notify you unless
                    legally prohibited
                  </li>
                  <li>
                    <strong>API Compliance:</strong> We strictly adhere to both
                    YNAB and Splitwise API terms of service and data usage
                    policies
                  </li>
                </ul>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Transparency Promise:
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Any data sharing will always be with your explicit consent
                    and for the direct purpose of providing our synchronization
                    service. You maintain full control over what data is shared
                    and can revoke access at any time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights and Controls */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4">
                Your Rights and Controls
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400">
                <p>You have complete control over your data:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Access:</strong> Request a copy of all data we have
                    about you from both YNAB and Splitwise integrations
                  </li>
                  <li>
                    <strong>Correction:</strong> Update or correct any
                    inaccurate information in our system
                  </li>
                  <li>
                    <strong>Deletion:</strong> Request deletion of your account
                    and all associated data from our systems
                  </li>
                  <li>
                    <strong>Portability:</strong> Export your synchronization
                    history and settings in a machine-readable format
                  </li>
                  <li>
                    <strong>Revoke Access:</strong> Disconnect YNAB or Splitwise
                    integrations independently at any time
                  </li>
                  <li>
                    <strong>Selective Control:</strong> Choose which
                    transactions to sync and which to keep private
                  </li>
                </ul>

                <p className="mt-4">
                  To exercise any of these rights, please contact us at{" "}
                  <a
                    href="mailto:privacy@splitwiseforynab.com"
                    className="text-amber-700 dark:text-amber-500 hover:underline"
                  >
                    privacy@splitwiseforynab.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4">
                Data Retention
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400">
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Active Accounts:</strong> We retain your data as
                    long as your account is active and you&apos;re using our
                    service
                  </li>
                  <li>
                    <strong>Account Deletion:</strong> When you delete your
                    account, we permanently delete all your data within 30 days
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> Some data may be
                    retained longer if required by law or for legitimate
                    business purposes (e.g., fraud prevention)
                  </li>
                  <li>
                    <strong>Anonymized Analytics:</strong> We may retain
                    anonymized usage statistics that cannot be linked back to
                    you
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Security Measures */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4">
                Security Measures
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400">
                <p>We implement industry-standard security measures:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>OAuth 2.0:</strong> Secure authorization without
                    storing your YNAB or Splitwise passwords
                  </li>
                  <li>
                    <strong>HTTPS Everywhere:</strong> All communications with
                    YNAB, Splitwise, and our servers are encrypted using TLS 1.3
                  </li>
                  <li>
                    <strong>Token Security:</strong> API tokens are encrypted
                    and stored securely with automatic rotation
                  </li>
                  <li>
                    <strong>Regular Security Audits:</strong> Periodic security
                    assessments and penetration testing
                  </li>
                  <li>
                    <strong>Incident Response:</strong> Comprehensive plan for
                    handling any security incidents affecting either platform
                  </li>
                  <li>
                    <strong>Employee Training:</strong> All team members receive
                    regular security and privacy training
                  </li>
                  <li>
                    <strong>API Monitoring:</strong> Real-time monitoring of all
                    YNAB and Splitwise API interactions for anomalies
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4">
                Contact Us
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400">
                <p>
                  If you have any questions about this Privacy Policy or our
                  data practices, please contact us:
                </p>
                <ul className="space-y-2">
                  <li>
                    <strong className="text-gray-900 dark:text-white">
                      Email:
                    </strong>{" "}
                    <a
                      href="mailto:privacy@splitwiseforynab.com"
                      className="text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      privacy@splitwiseforynab.com
                    </a>
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">
                      Support:
                    </strong>{" "}
                    <a
                      href="mailto:support@splitwiseforynab.com"
                      className="text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      support@splitwiseforynab.com
                    </a>
                  </li>
                </ul>

                <p className="text-sm mt-6">
                  We will respond to all privacy-related inquiries within 30
                  days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Policy */}
          <Card className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4">
                Changes to This Policy
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400">
                <p>
                  We may update this Privacy Policy from time to time. When we
                  do:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We will notify you via email of any material changes</li>
                  <li>
                    We will update the &ldquo;Last updated&rdquo; date at the
                    top of this page
                  </li>
                  <li>We will maintain previous versions for your reference</li>
                  <li>
                    Continued use of our service after changes constitutes
                    acceptance of the new policy
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 dark:text-amber-500 hover:underline font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
