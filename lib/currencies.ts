/**
 * Currency definitions for the application
 * All currencies are validated against Intl.NumberFormat compatibility
 */

// Common currencies (matching YNAB's "Common Currencies" section)
// These have localized Stripe pricing
export const COMMON_CURRENCIES = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "GBP", label: "UK Pound Sterling", symbol: "£" },
  { value: "CAD", label: "Canadian Dollar", symbol: "$" },
  { value: "AUD", label: "Australian Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
] as const;

// All currencies supported by both Splitwise AND YNAB
// Sorted alphabetically by label
// Each currency code is validated against Intl.NumberFormat
export const ALL_CURRENCIES = [
  { value: "ALL", label: "Albanian Lek", symbol: "L" },
  { value: "DZD", label: "Algerian Dinar", symbol: "DA" },
  { value: "AOA", label: "Angolan Kwanza", symbol: "Kz" },
  { value: "ARS", label: "Argentine Peso", symbol: "$" },
  { value: "AMD", label: "Armenian Dram", symbol: "AMD" },
  { value: "AWG", label: "Aruban Florin", symbol: "Afl." },
  { value: "AUD", label: "Australian Dollar", symbol: "$" },
  { value: "AZN", label: "Azerbaijani Manat", symbol: "m." },
  { value: "BHD", label: "Bahraini Dinar", symbol: "BD" },
  { value: "BDT", label: "Bangladeshi Taka", symbol: "Tk" },
  { value: "BBD", label: "Barbadian Dollar", symbol: "$" },
  { value: "BYN", label: "Belarusian Ruble", symbol: "Br" },
  { value: "BZD", label: "Belize Dollar", symbol: "BZ$" },
  { value: "BOB", label: "Boliviano", symbol: "Bs." },
  { value: "BWP", label: "Botswana Pula", symbol: "P" },
  { value: "BRL", label: "Brazilian Real", symbol: "R$" },
  { value: "BND", label: "Brunei Dollar", symbol: "B$" },
  { value: "BGN", label: "Bulgarian Lev", symbol: "BGN" },
  { value: "KHR", label: "Cambodian Riel", symbol: "៛" },
  { value: "CAD", label: "Canadian Dollar", symbol: "$" },
  { value: "CVE", label: "Cape Verdean Escudo", symbol: "$" },
  { value: "KYD", label: "Cayman Islands Dollar", symbol: "CI$" },
  { value: "XAF", label: "Central African CFA Franc", symbol: "CFA" },
  { value: "XPF", label: "CFP Franc", symbol: "F" },
  { value: "CLP", label: "Chilean Peso", symbol: "$" },
  { value: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { value: "COP", label: "Colombian Peso", symbol: "$" },
  { value: "BAM", label: "Convertible Mark", symbol: "KM" },
  { value: "CRC", label: "Costa Rican Colón", symbol: "₡" },
  { value: "HRK", label: "Croatian Kuna", symbol: "HRK" },
  { value: "CZK", label: "Czech Koruna", symbol: "Kč" },
  { value: "DKK", label: "Danish Krone", symbol: "kr" },
  { value: "DJF", label: "Djiboutian Franc", symbol: "Fdj" },
  { value: "DOP", label: "Dominican Peso", symbol: "$" },
  { value: "XCD", label: "Eastern Caribbean Dollar", symbol: "EC$" },
  { value: "EGP", label: "Egyptian Pound", symbol: "E£" },
  { value: "ETB", label: "Ethiopian Birr", symbol: "Br" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "FJD", label: "Fijian Dollar", symbol: "$" },
  { value: "GMD", label: "Gambian Dalasi", symbol: "D" },
  { value: "GEL", label: "Georgian Lari", symbol: "GEL" },
  { value: "GHS", label: "Ghanaian Cedi", symbol: "GH₵" },
  { value: "GTQ", label: "Guatemalan Quetzal", symbol: "Q" },
  { value: "GYD", label: "Guyanese Dollar", symbol: "G$" },
  { value: "HTG", label: "Haitian Gourde", symbol: "G" },
  { value: "HNL", label: "Honduran Lempira", symbol: "L" },
  { value: "HKD", label: "Hong Kong Dollar", symbol: "$" },
  { value: "HUF", label: "Hungarian Forint", symbol: "Ft" },
  { value: "ISK", label: "Icelandic Króna", symbol: "kr" },
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { value: "IRR", label: "Iranian Rial", symbol: "IRR" },
  { value: "IQD", label: "Iraqi Dinar", symbol: "IQD" },
  { value: "ILS", label: "Israeli New Shekel", symbol: "₪" },
  { value: "JMD", label: "Jamaican Dollar", symbol: "J$" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" },
  { value: "JOD", label: "Jordanian Dinar", symbol: "JOD" },
  { value: "KZT", label: "Kazakhstani Tenge", symbol: "₸" },
  { value: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { value: "KRW", label: "Korean Won", symbol: "₩" },
  { value: "KWD", label: "Kuwaiti Dinar", symbol: "KWD" },
  { value: "KGS", label: "Kyrgyzstani Som", symbol: "KGS" },
  { value: "LAK", label: "Lao Kip", symbol: "₭" },
  { value: "LBP", label: "Lebanese Pound", symbol: "ل.ل" },
  { value: "LYD", label: "Libyan Dinar", symbol: "LD" },
  { value: "MOP", label: "Macanese Pataca", symbol: "MOP$" },
  { value: "MKD", label: "Macedonian Denar", symbol: "ден" },
  { value: "MGA", label: "Malagasy Ariary", symbol: "Ar" },
  { value: "MWK", label: "Malawian Kwacha", symbol: "K" },
  { value: "MYR", label: "Malaysian Ringgit", symbol: "RM" },
  { value: "MVR", label: "Maldivian Rufiyaa", symbol: "MVR" },
  { value: "MUR", label: "Mauritian Rupee", symbol: "₨" },
  { value: "MXN", label: "Mexican Peso", symbol: "$" },
  { value: "MDL", label: "Moldovan Leu", symbol: "MDL" },
  { value: "MNT", label: "Mongolian Tugrik", symbol: "₮" },
  { value: "MAD", label: "Moroccan Dirham", symbol: "MAD" },
  { value: "MZN", label: "Mozambican Metical", symbol: "MT" },
  { value: "NPR", label: "Nepalese Rupee", symbol: "Rs." },
  { value: "TWD", label: "New Taiwan Dollar", symbol: "NT$" },
  { value: "NZD", label: "New Zealand Dollar", symbol: "$" },
  { value: "NIO", label: "Nicaraguan Córdoba", symbol: "C$" },
  { value: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { value: "NOK", label: "Norwegian Krone", symbol: "kr" },
  { value: "OMR", label: "Omani Rial", symbol: "OMR" },
  { value: "PKR", label: "Pakistani Rupee", symbol: "Rs" },
  { value: "PAB", label: "Panamanian Balboa", symbol: "B/." },
  { value: "PGK", label: "Papua New Guinean Kina", symbol: "K" },
  { value: "PYG", label: "Paraguayan Guaraní", symbol: "₲" },
  { value: "PEN", label: "Peruvian Sol", symbol: "S/." },
  { value: "PHP", label: "Philippine Peso", symbol: "₱" },
  { value: "PLN", label: "Polish Złoty", symbol: "zł" },
  { value: "QAR", label: "Qatari Riyal", symbol: "QR" },
  { value: "RON", label: "Romanian Leu", symbol: "RON" },
  { value: "RUB", label: "Russian Ruble", symbol: "₽" },
  { value: "RWF", label: "Rwandan Franc", symbol: "FRw" },
  { value: "SAR", label: "Saudi Riyal", symbol: "SR" },
  { value: "RSD", label: "Serbian Dinar", symbol: "RSD" },
  { value: "SLL", label: "Sierra Leonean Leone", symbol: "SLL" },
  { value: "SGD", label: "Singapore Dollar", symbol: "$" },
  { value: "ZAR", label: "South African Rand", symbol: "R" },
  { value: "LKR", label: "Sri Lankan Rupee", symbol: "Rs." },
  { value: "SDG", label: "Sudanese Pound", symbol: "SDG" },
  { value: "SEK", label: "Swedish Krona", symbol: "kr" },
  { value: "CHF", label: "Swiss Franc", symbol: "Fr." },
  { value: "SYP", label: "Syrian Pound", symbol: "£S" },
  { value: "TZS", label: "Tanzanian Shilling", symbol: "TZS" },
  { value: "THB", label: "Thai Baht", symbol: "฿" },
  { value: "TOP", label: "Tongan Paʻanga", symbol: "T$" },
  { value: "TTD", label: "Trinidad Dollar", symbol: "TT$" },
  { value: "TND", label: "Tunisian Dinar", symbol: "DT" },
  { value: "TRY", label: "Turkish Lira", symbol: "TL" },
  { value: "AED", label: "UAE Dirham", symbol: "DH" },
  { value: "UGX", label: "Ugandan Shilling", symbol: "USh" },
  { value: "GBP", label: "UK Pound Sterling", symbol: "£" },
  { value: "UAH", label: "Ukrainian Hryvnia", symbol: "₴" },
  { value: "UYU", label: "Uruguayan Peso", symbol: "$" },
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "UZS", label: "Uzbekistani Som", symbol: "UZS" },
  { value: "VND", label: "Vietnamese Đồng", symbol: "₫" },
  { value: "XOF", label: "West African CFA Franc", symbol: "CFA" },
  { value: "YER", label: "Yemeni Rial", symbol: "YER" },
  { value: "ZMW", label: "Zambian Kwacha", symbol: "ZMW" },
] as const;

export type CommonCurrencyCode = (typeof COMMON_CURRENCIES)[number]["value"];
export type AllCurrencyCode = (typeof ALL_CURRENCIES)[number]["value"];
export type CurrencyCode = CommonCurrencyCode | AllCurrencyCode;

// Combined currency options with group information for dropdown display
export type CurrencyOption = {
  value: string;
  label: string;
  symbol: string;
  group: "common" | "all";
};

// Get all unique currencies, with common currencies first
export const CURRENCY_OPTIONS: CurrencyOption[] = [
  // Common currencies first
  ...COMMON_CURRENCIES.map((c) => ({
    ...c,
    group: "common" as const,
  })),
  // Then all other currencies (excluding duplicates from common)
  ...ALL_CURRENCIES.filter(
    (c) => !COMMON_CURRENCIES.some((cc) => cc.value === c.value),
  ).map((c) => ({
    ...c,
    group: "all" as const,
  })),
];

// Currencies with localized Stripe pricing
export const LOCALIZED_PRICING_CURRENCIES = [
  "USD",
  "GBP",
  "CAD",
  "AUD",
  "EUR",
] as const;
export type LocalizedCurrency = (typeof LOCALIZED_PRICING_CURRENCIES)[number];

export function hasLocalizedPricing(
  currencyCode: string,
): currencyCode is LocalizedCurrency {
  return LOCALIZED_PRICING_CURRENCIES.includes(
    currencyCode as LocalizedCurrency,
  );
}

// Get currency by code
export function getCurrency(code: string): CurrencyOption | undefined {
  return CURRENCY_OPTIONS.find((c) => c.value === code);
}

// Check if a currency code is valid (exists in our list)
export function isValidCurrencyCode(code: string): boolean {
  return CURRENCY_OPTIONS.some((c) => c.value === code);
}

// Get common currency codes as array
export function getCommonCurrencyCodes(): string[] {
  return COMMON_CURRENCIES.map((c) => c.value);
}
