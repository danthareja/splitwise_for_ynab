/**
 * Stripe Pricing Configuration
 *
 * Uses multi-currency prices + Adaptive Pricing for automatic localization.
 * Only two price IDs needed (monthly + annual), each with multiple currency options.
 */

export const TRIAL_DAYS = 34; // Same as YNAB

export type PricingInterval = "month" | "year";

// Display pricing for the UI (in smallest unit)
export const PRICING_DISPLAY = {
  USD: {
    monthly: 499,
    annual: 3900,
    monthlyDisplay: "$4.99",
    annualDisplay: "$39",
    annualPerMonth: "$3.25",
    currency: "USD",
    symbol: "$",
  },
  GBP: {
    monthly: 399,
    annual: 2900,
    monthlyDisplay: "£3.99",
    annualDisplay: "£29",
    annualPerMonth: "£2.42",
    currency: "GBP",
    symbol: "£",
  },
  EUR: {
    monthly: 449,
    annual: 3500,
    monthlyDisplay: "€4.49",
    annualDisplay: "€35",
    annualPerMonth: "€2.92",
    currency: "EUR",
    symbol: "€",
  },
  CAD: {
    monthly: 599,
    annual: 4900,
    monthlyDisplay: "CA$5.99",
    annualDisplay: "CA$49",
    annualPerMonth: "CA$4.08",
    currency: "CAD",
    symbol: "CA$",
  },
  AUD: {
    monthly: 599,
    annual: 4900,
    monthlyDisplay: "A$5.99",
    annualDisplay: "A$49",
    annualPerMonth: "A$4.08",
    currency: "AUD",
    symbol: "A$",
  },
} as const;

export type SupportedCurrency = keyof typeof PRICING_DISPLAY;

/**
 * Get pricing display for a currency (falls back to USD)
 */
export function getPricingDisplay(currencyCode: string | null | undefined) {
  const code = currencyCode?.toUpperCase() as SupportedCurrency;
  if (code && code in PRICING_DISPLAY) {
    return PRICING_DISPLAY[code];
  }
  return PRICING_DISPLAY.USD;
}

/**
 * Get Stripe Price ID for the given interval
 * Uses the same price ID for all currencies (multi-currency price)
 */
export function getStripePriceId(interval: PricingInterval): string {
  if (interval === "year") {
    return process.env.STRIPE_PRICE_ANNUAL || "";
  }
  return process.env.STRIPE_PRICE_MONTHLY || "";
}

/**
 * Calculate savings percentage when choosing annual over monthly
 */
export function calculateAnnualSavings(currencyCode?: string): {
  percentage: number;
  months: number;
} {
  const pricing = getPricingDisplay(currencyCode);
  const monthlyAnnualized = pricing.monthly * 12;
  const savings = monthlyAnnualized - pricing.annual;
  const percentage = Math.round((savings / monthlyAnnualized) * 100);
  const monthsFree = Math.round((savings / pricing.monthly) * 10) / 10;

  return {
    percentage,
    months: monthsFree,
  };
}

/**
 * Check if a currency has explicit pricing configured
 */
export function hasExplicitPricing(currencyCode: string): boolean {
  const code = currencyCode?.toUpperCase();
  return code in PRICING_DISPLAY;
}

/**
 * Get all supported currencies for display
 */
export function getSupportedCurrencies(): SupportedCurrency[] {
  return Object.keys(PRICING_DISPLAY) as SupportedCurrency[];
}

/**
 * Map country codes to currencies for geo-localized pricing
 */
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  // USD countries
  US: "USD",
  // GBP countries
  GB: "GBP",
  // EUR countries (Eurozone)
  AT: "EUR", // Austria
  BE: "EUR", // Belgium
  CY: "EUR", // Cyprus
  EE: "EUR", // Estonia
  FI: "EUR", // Finland
  FR: "EUR", // France
  DE: "EUR", // Germany
  GR: "EUR", // Greece
  IE: "EUR", // Ireland
  IT: "EUR", // Italy
  LV: "EUR", // Latvia
  LT: "EUR", // Lithuania
  LU: "EUR", // Luxembourg
  MT: "EUR", // Malta
  NL: "EUR", // Netherlands
  PT: "EUR", // Portugal
  SK: "EUR", // Slovakia
  SI: "EUR", // Slovenia
  ES: "EUR", // Spain
  // CAD
  CA: "CAD",
  // AUD
  AU: "AUD",
};

/**
 * Get currency based on country code (from geo-IP)
 * Falls back to USD for unknown countries
 */
export function getCurrencyFromCountry(
  countryCode: string | null | undefined,
): SupportedCurrency {
  if (!countryCode) return "USD";
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || "USD";
}
