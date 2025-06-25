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
