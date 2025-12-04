import Link from "next/link";
import Image from "next/image";
import type { BlogPostMeta } from "@/lib/blog";
import { formatDate } from "@/lib/blog";

interface PostCardProps {
  post: BlogPostMeta;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="group">
      <Link href={`/blog/${post.slug}`} className="block">
        {/* Cover Image */}
        <div className="relative aspect-[16/9] mb-4 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Date & Reading Time */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-serif font-medium text-gray-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
            {post.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
            {post.description}
          </p>

          {/* Author */}
          <div className="flex items-center gap-3 pt-2">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <Image
                src={post.author.image}
                alt={post.author.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-white">
                {post.author.name}
              </p>
              {post.author.title && (
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {post.author.title}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
