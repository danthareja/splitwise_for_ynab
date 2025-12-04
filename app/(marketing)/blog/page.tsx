import { getAllPosts } from "@/lib/blog";
import { PostCard } from "@/components/blog";
import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.splitwiseforynab.com";

export const metadata: Metadata = {
  title: "Blog | Splitwise for YNAB",
  description:
    "Tips, guides, and insights for YNAB users who split expenses with a partner or roommate. Learn how to track shared expenses while keeping accurate category spending.",
  keywords: [
    "YNAB blog",
    "Splitwise YNAB",
    "shared expenses",
    "couples budgeting",
    "phantom account YNAB",
    "expense splitting tips",
    "budget tracking couples",
  ],
  openGraph: {
    title: "Blog | Splitwise for YNAB",
    description:
      "Tips, guides, and insights for YNAB users who split expenses with a partner or roommate.",
    type: "website",
    url: `${baseUrl}/blog`,
  },
  twitter: {
    card: "summary",
    title: "Blog | Splitwise for YNAB",
    description:
      "Tips, guides, and insights for YNAB users who split expenses.",
  },
  alternates: {
    canonical: `${baseUrl}/blog`,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  // JSON-LD for Blog/CollectionPage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Splitwise for YNAB Blog",
    description:
      "Tips, guides, and insights for YNAB users who split expenses with a partner or roommate.",
    url: `${baseUrl}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Splitwise for YNAB",
      url: baseUrl,
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      url: `${baseUrl}/blog/${post.slug}`,
      author: {
        "@type": "Person",
        name: post.author.name,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Header */}
        <header className="text-center mb-12 sm:mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700 dark:text-amber-500 font-medium mb-4">
            Blog
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4">
            Insights for YNAB users
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Tips, guides, and stories about budgeting as a couple, managing
            shared expenses, and getting the most out of YNAB.
          </p>
        </header>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">
              No posts yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </>
  );
}
