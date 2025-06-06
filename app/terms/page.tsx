import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Scale, AlertTriangle, Shield, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Legal Agreement & User Responsibilities",
  description:
    "Read the terms of service for Splitwise for YNAB, including user responsibilities, API usage limitations, and legal disclaimers.",
  keywords: [
    "terms of service",
    "legal agreement",
    "user responsibilities",
    "YNAB terms",
    "Splitwise terms",
    "API usage",
    "service agreement",
    "user agreement",
  ],
  openGraph: {
    title: "Terms of Service - Splitwise for YNAB",
    description:
      "Legal terms and user responsibilities for using Splitwise for YNAB integration service.",
  },
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Please read these terms carefully before using our service. By using
            Splitwise for YNAB, you agree to these terms.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Important Disclaimers - Required */}
        <Card className="mb-8 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
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
                      className="text-blue-600 dark:text-blue-400 hover:underline"
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
                      className="text-blue-600 dark:text-blue-400 hover:underline"
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
          {/* Acceptance of Terms */}
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Scale className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Acceptance of Terms
                </h2>
              </div>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  By accessing and using Splitwise for YNAB (&ldquo;the
                  Service&rdquo;), you accept and agree to be bound by the terms
                  and provision of this agreement.
                </p>
                <p>
                  If you do not agree to abide by the above, please do not use
                  this service. Your continued use of the Service constitutes
                  acceptance of these terms as they may be modified from time to
                  time.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Description of Service */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Description of Service
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Splitwise for YNAB is a third-party integration service that
                  automatically synchronizes flagged transactions between your
                  YNAB budget and Splitwise expense sharing groups.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    The Service connects to YNAB and Splitwise through their
                    official APIs
                  </li>
                  <li>
                    We facilitate data synchronization based on your explicit
                    instructions
                  </li>
                  <li>
                    The Service requires active accounts with both YNAB and
                    Splitwise
                  </li>
                  <li>
                    We do not provide YNAB or Splitwise functionality directly
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-green-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  User Responsibilities
                </h2>
              </div>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>As a user of our Service, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Account Security:</strong> Maintain the security of
                    your YNAB and Splitwise accounts
                  </li>
                  <li>
                    <strong>Accurate Information:</strong> Provide accurate and
                    up-to-date information
                  </li>
                  <li>
                    <strong>Compliance:</strong> Comply with YNAB and Splitwise
                    terms of service
                  </li>
                  <li>
                    <strong>Responsible Use:</strong> Use the Service only for
                    its intended purpose
                  </li>
                  <li>
                    <strong>Data Verification:</strong> Review synchronized
                    transactions for accuracy
                  </li>
                  <li>
                    <strong>Prompt Notification:</strong> Report any issues or
                    discrepancies immediately
                  </li>
                </ul>

                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mt-6">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">
                    <strong>Important:</strong> You remain responsible for the
                    accuracy of your financial data in both YNAB and Splitwise.
                    Our Service is a convenience tool and does not replace your
                    responsibility to monitor your finances.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Usage and Limitations */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                API Usage and Limitations
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Our Service operates within the constraints of third-party
                  APIs:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Rate Limits:</strong> We respect YNAB and Splitwise
                    API rate limits, which may affect sync speed
                  </li>
                  <li>
                    <strong>API Changes:</strong> Service functionality may be
                    affected by changes to YNAB or Splitwise APIs
                  </li>
                  <li>
                    <strong>Downtime:</strong> Service availability depends on
                    YNAB and Splitwise API availability
                  </li>
                  <li>
                    <strong>Data Accuracy:</strong> We sync data as provided by
                    the APIs; we cannot guarantee data accuracy
                  </li>
                  <li>
                    <strong>Feature Limitations:</strong> Our features are
                    limited by what the APIs allow
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Privacy and Data Protection */}
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Privacy and Data Protection
                </h2>
              </div>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Your privacy is important to us. Please review our{" "}
                  <Link
                    href="/privacy"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Privacy Policy
                  </Link>{" "}
                  for detailed information about how we collect, use, and
                  protect your data.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We only access data necessary for synchronization</li>
                  <li>We use OAuth for secure authentication</li>
                  <li>We do not store your YNAB or Splitwise passwords</li>
                  <li>You can revoke access at any time</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimers and Limitations */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Disclaimers and Limitations
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
                  <h3 className="font-bold text-red-800 dark:text-red-200 mb-2">
                    Service Disclaimer:
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTY
                    OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
                    INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
                    FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                </div>

                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>No Financial Advice:</strong> We do not provide
                    financial advice or recommendations
                  </li>
                  <li>
                    <strong>Third-Party Dependencies:</strong> Service
                    functionality depends on YNAB and Splitwise availability
                  </li>
                  <li>
                    <strong>Data Accuracy:</strong> We are not responsible for
                    data accuracy or financial decisions based on synchronized
                    data
                  </li>
                  <li>
                    <strong>Service Interruptions:</strong> We may experience
                    downtime or service interruptions
                  </li>
                  <li>
                    <strong>Beta Features:</strong> Some features may be in beta
                    and subject to changes or removal
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Limitation of Liability
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium text-sm">
                    IN NO EVENT SHALL SPLITWISE FOR YNAB BE LIABLE FOR ANY
                    INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                    DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS,
                    DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                  </p>
                </div>

                <p>
                  Our total liability to you for any claims arising from or
                  related to this Service shall not exceed the amount you have
                  paid us in the twelve (12) months preceding the claim.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Termination
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>Either party may terminate this agreement at any time:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>User Termination:</strong> You may stop using the
                    Service and revoke API access at any time
                  </li>
                  <li>
                    <strong>Service Termination:</strong> We may suspend or
                    terminate the Service with reasonable notice
                  </li>
                  <li>
                    <strong>Data Retention:</strong> Upon termination, we will
                    delete your data according to our Privacy Policy
                  </li>
                  <li>
                    <strong>Survival:</strong> Certain provisions (disclaimers,
                    limitations) survive termination
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Changes to Terms
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We reserve the right to modify these terms at any time. When
                  we do:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We will notify you via email of any material changes</li>
                  <li>
                    We will update the &ldquo;Last updated&rdquo; date at the
                    top of this page
                  </li>
                  <li>
                    Continued use of the Service after changes constitutes
                    acceptance
                  </li>
                  <li>
                    If you disagree with changes, you may terminate your use of
                    the Service
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Governing Law
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  These terms shall be governed by and construed in accordance
                  with the laws of the jurisdiction where our company is
                  incorporated, without regard to its conflict of law
                  provisions.
                </p>
                <p>
                  Any disputes arising from these terms or the Service shall be
                  resolved through binding arbitration in accordance with the
                  rules of the American Arbitration Association.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Contact Information
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  If you have any questions about these Terms of Service, please
                  contact us:
                </p>
                <ul className="space-y-2">
                  <li>
                    <strong>Email:</strong>{" "}
                    <a
                      href="mailto:legal@splitwiseforynab.com"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      legal@splitwiseforynab.com
                    </a>
                  </li>
                  <li>
                    <strong>Support:</strong>{" "}
                    <a
                      href="mailto:support@splitwiseforynab.com"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      support@splitwiseforynab.com
                    </a>
                  </li>
                </ul>

                <p className="text-sm mt-6">
                  We will respond to all legal inquiries within 30 days.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
