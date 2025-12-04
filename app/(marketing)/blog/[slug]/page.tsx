import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPostSlugs, getPostBySlug, formatDate } from "@/lib/blog";
import { mdxComponents } from "@/components/blog";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.splitwiseforynab.com";

  if (!post) {
    return {
      title: "Post Not Found | Splitwise for YNAB",
    };
  }

  const ogImage = post.coverImage.startsWith("http")
    ? post.coverImage
    : `${baseUrl}${post.coverImage}`;

  return {
    title: `${post.title} | Splitwise for YNAB`,
    description: post.description,
    keywords: [
      "YNAB",
      "Splitwise",
      "shared expenses",
      "couples budgeting",
      "phantom account",
      "expense splitting",
      "budget tracking",
    ],
    authors: [{ name: post.author.name }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [post.author.name],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      url: `${baseUrl}/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.splitwiseforynab.com";

  if (!post || !post.published) {
    notFound();
  }

  const authorImage = post.author.image.startsWith("http")
    ? post.author.image
    : `${baseUrl}${post.author.image}`;

  const coverImage = post.coverImage.startsWith("http")
    ? post.coverImage
    : `${baseUrl}${post.coverImage}`;

  // JSON-LD structured data for Article (SEO + AI optimization)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: coverImage,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.title,
      image: authorImage,
    },
    publisher: {
      "@type": "Organization",
      name: "Splitwise for YNAB",
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${slug}`,
    },
    keywords: [
      "YNAB",
      "Splitwise",
      "shared expenses",
      "couples budgeting",
      "phantom account",
      "expense splitting",
    ].join(", "),
    articleSection: "Finance",
    wordCount: post.content.split(/\s+/).length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          {/* Meta */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-6">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            {post.description}
          </p>

          {/* Author */}
          <div className="flex items-center gap-4 pb-8 border-b border-gray-200 dark:border-gray-800">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <Image
                src={post.author.image}
                alt={post.author.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {post.author.name}
              </p>
              {post.author.title && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {post.author.title}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Cover Image */}
        <div className="relative aspect-[16/9] mb-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="prose-custom">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>

        {/* Footer CTA */}
        <footer className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-[#141414] rounded-xl p-8 text-center">
            <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-3">
              Ready to see your true spending?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start your free 34-day trial. No credit card required.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </footer>
      </article>
    </>
  );
}
