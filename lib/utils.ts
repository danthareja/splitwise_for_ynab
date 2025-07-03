import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a currency amount using the user's locale and the specified currency code
 * @param amount - The amount to format (negative values will be shown as positive)
 * @param currencyCode - ISO currency code (e.g., 'USD', 'EUR', 'CAD')
 * @param locale - Optional locale (defaults to user's browser locale)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode = "USD",
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

/**
 * Format a date with full date and time
 * @param date - Date object or date string
 * @param locale - Optional locale (defaults to 'en-US')
 * @returns Formatted date string like "January 1, 2023 at 12:00 PM"
 */
export function formatDateTime(date: Date | string, locale = "en-US"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);
}

/**
 * Format a date with short date format
 * @param date - Date object or date string
 * @param locale - Optional locale (defaults to 'en-US')
 * @returns Formatted date string like "Jan 1, 2023"
 */
export function formatDate(date: Date | string, locale = "en-US"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);
}

/**
 * Format a time with hour and minute
 * @param date - Date object or date string
 * @param locale - Optional locale (defaults to 'en-US')
 * @returns Formatted time string like "12:00 PM"
 */
export function formatTime(date: Date | string, locale = "en-US"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "just now")
 * @param date - Date object or date string
 * @param locale - Optional locale (defaults to 'en')
 * @returns Formatted relative time string
 */
export function formatTimeAgo(date: Date | string, locale = "en"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return rtf.format(-minutes, "minute");
  }

  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return rtf.format(-hours, "hour");
  }

  const days = Math.floor(diffInSeconds / 86400);
  return rtf.format(-days, "day");
}
