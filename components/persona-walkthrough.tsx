"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { YNABFlag } from "@/components/ynab-flag";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// Flag color types for the dropdown
export type FlagColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "none";

const FLAG_NAMES: Record<FlagColor, string> = {
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  none: "None",
};

// Wrapper for YNABFlag that handles empty state and highlight
function YNABFlagIcon({
  color,
  highlight,
  size = "sm",
}: {
  color?: FlagColor;
  highlight?: boolean;
  size?: "sm" | "md";
}) {
  const isEmpty = !color || color === "none";
  const dimensions =
    size === "sm" ? { width: 16, height: 12 } : { width: 20, height: 14 };

  // For empty state, show dashed outline
  if (isEmpty) {
    return (
      <div className={`relative ${highlight ? "animate-pulse" : ""}`}>
        {highlight && (
          <div className="absolute -inset-1.5 bg-amber-400/30 rounded-sm" />
        )}
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox="0 0 20 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
        >
          <path
            d="M2 0 H16 L13 7 L16 14 H2 Q0 14 0 12 V2 Q0 0 2 0 Z"
            fill="transparent"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  // For filled state, use the shared YNABFlag component
  return (
    <div className={`relative ${highlight ? "animate-pulse" : ""}`}>
      {highlight && (
        <div className="absolute -inset-1.5 bg-amber-400/30 rounded-sm" />
      )}
      <YNABFlag colorId={color} size={size} className="relative" />
    </div>
  );
}

// Flag dropdown component
function YNABFlagDropdown({
  selectedFlag,
  onSelect,
  highlight,
}: {
  selectedFlag?: FlagColor;
  onSelect?: (flag: FlagColor) => void;
  highlight?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleButtonClick = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsOpen(!isOpen);
  };

  const flagOptions: FlagColor[] = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className={`flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 transition-colors cursor-pointer ${
          highlight
            ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#1e2b3a] animate-pulse"
            : ""
        }`}
      >
        <YNABFlagIcon color={selectedFlag} highlight={false} />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            className="fixed z-9999 bg-[#1e2b3a] rounded-lg shadow-xl border border-white/10 py-2 min-w-[160px]"
          >
            {flagOptions.map((flag) => (
              <button
                key={flag}
                type="button"
                onClick={() => {
                  onSelect?.(flag);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 transition-colors"
              >
                <YNABFlagIcon color={flag} size="md" />
                <span className="text-white text-sm">{FLAG_NAMES[flag]}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

// Format date for display using locale
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

// YNAB-style Transaction Row Component
export function YNABTransaction({
  flag: initialFlag,
  account,
  date,
  payee,
  category,
  outflow,
  inflow,
  highlightFlag,
  interactive = true,
  onFlagSelect,
}: {
  flag?: FlagColor | null;
  account: string;
  date: Date | string;
  payee: string;
  category: string;
  outflow?: string;
  inflow?: string;
  highlightFlag?: boolean;
  interactive?: boolean;
  onFlagSelect?: (flag: FlagColor) => void;
}) {
  const [flag, setFlag] = useState<FlagColor | undefined>(
    initialFlag === null ? undefined : initialFlag,
  );

  // Sync flag state with prop changes (for controlled usage)
  useEffect(() => {
    if (initialFlag !== undefined) {
      setFlag(initialFlag === null ? undefined : initialFlag);
    }
  }, [initialFlag]);

  const handleFlagSelect = (selectedFlag: FlagColor) => {
    setFlag(selectedFlag);
    onFlagSelect?.(selectedFlag);
  };

  return (
    <div className="overflow-x-auto max-w-full">
      <div className="bg-[#1e2b3a] rounded-lg overflow-hidden shadow-lg text-[11px] sm:text-sm min-w-[440px] sm:min-w-[560px]">
        {/* Header */}
        <div className="grid grid-cols-[24px_70px_65px_1fr_1fr_60px_60px] sm:grid-cols-[32px_90px_80px_1fr_1fr_80px_80px] gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#171f2b] border-b border-white/10 text-white/50 text-[9px] sm:text-xs font-medium uppercase tracking-wider">
          <div className="flex items-center justify-center">
            <YNABFlagIcon color="none" size="sm" />
          </div>
          <div>Account</div>
          <div>Date</div>
          <div>Payee</div>
          <div>Category</div>
          <div className="text-right">Outflow</div>
          <div className="text-right">Inflow</div>
        </div>
        {/* Transaction Row */}
        <div className="grid grid-cols-[24px_70px_65px_1fr_1fr_60px_60px] sm:grid-cols-[32px_90px_80px_1fr_1fr_80px_80px] gap-0.5 sm:gap-1 px-2 sm:px-3 py-2 sm:py-3 items-center">
          {/* Flag */}
          <div className="flex items-center justify-center">
            {interactive ? (
              <YNABFlagDropdown
                selectedFlag={flag}
                onSelect={handleFlagSelect}
                highlight={highlightFlag}
              />
            ) : (
              <div
                className={
                  highlightFlag
                    ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#1e2b3a] rounded"
                    : ""
                }
              >
                <YNABFlagIcon color={flag} size="sm" />
              </div>
            )}
          </div>
          {/* Account */}
          <div className="text-white/70 truncate">{account}</div>
          {/* Date */}
          <div className="text-white/70">{formatDate(date)}</div>
          {/* Payee */}
          <div className="text-white/70 font-medium truncate">{payee}</div>
          {/* Category */}
          <div className="text-white truncate">{category}</div>
          {/* Outflow */}
          <div className="text-right text-red-400 font-mono">
            {outflow || ""}
          </div>
          {/* Inflow */}
          <div className="text-right text-emerald-400 font-mono">
            {inflow || ""}
          </div>
        </div>
      </div>
    </div>
  );
}

// YNAB-style Account Row Component
function YNABAccountRow({
  name,
  balance,
  isPositive,
  highlight,
}: {
  name: string;
  balance: string;
  isPositive?: boolean;
  highlight?: boolean;
}) {
  const balanceColor = isPositive
    ? "text-emerald-400"
    : isPositive === false
      ? "text-red-400"
      : "text-white";

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 ${highlight ? "bg-[#2a3a4d]" : ""}`}
    >
      <span className="text-white/90">{name}</span>
      <span className={`font-mono font-medium ${balanceColor}`}>{balance}</span>
    </div>
  );
}

// YNAB-style Accounts Widget
export function YNABAccounts({
  accounts,
  title = "Accounts",
}: {
  accounts: Array<{
    name: string;
    balance: string;
    isPositive?: boolean;
    highlight?: boolean;
  }>;
  title?: string;
}) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[#1e2b3a] rounded-lg overflow-hidden shadow-lg text-[11px] sm:text-sm">
        <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#171f2b] border-b border-white/10">
          <span className="text-white/50 text-[9px] sm:text-xs font-medium uppercase tracking-wider">
            {title}
          </span>
        </div>
        {accounts.map((account, i) => (
          <YNABAccountRow key={i} {...account} />
        ))}
      </div>
    </div>
  );
}

// Transaction type for activity popover
export type YNABActivityTransaction = {
  account: string;
  date: string;
  payee: string;
  memo?: string;
  amount: string;
};

// Inline activity table component (reusable)
function InlineActivityTable({
  transactions,
}: {
  transactions: YNABActivityTransaction[];
}) {
  return (
    <table className="w-full text-[11px] sm:text-sm border-collapse">
      <thead>
        <tr className="text-[9px] sm:text-xs text-white/40 uppercase tracking-wider">
          <th className="text-left pb-2 pr-3 font-medium border-b border-r border-white/10">
            Account
          </th>
          <th className="text-left pb-2 px-3 font-medium border-b border-r border-white/10">
            Date
          </th>
          <th className="text-left pb-2 px-3 font-medium border-b border-r border-white/10">
            Payee
          </th>
          <th className="text-right pb-2 pl-3 font-medium border-b border-white/10">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx, i) => {
          const isPositive = tx.amount.startsWith("+");
          const isNegative = tx.amount.startsWith("-");
          const amountColor = isPositive
            ? "text-emerald-400"
            : isNegative
              ? "text-red-400"
              : "text-white";

          return (
            <tr key={i} className="text-white/80 border-b border-white/10">
              <td className="py-2 pr-3 whitespace-nowrap border-white/10">
                {tx.account}
              </td>
              <td className="py-2 px-3 whitespace-nowrap border-white/10">
                {tx.date}
              </td>
              <td className="py-2 px-3 border-white/10">{tx.payee}</td>
              <td
                className={`py-2 pl-3 text-right font-mono whitespace-nowrap ${amountColor}`}
              >
                {tx.amount}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// YNAB-style Category Row
function YNABCategoryRow({
  emoji,
  name,
  assigned,
  activity,
  available,
  availableColor,
  transactions,
  defaultActivityOpen,
  inlineActivity,
}: {
  emoji: string;
  name: string;
  assigned: string;
  activity: string;
  available: string;
  availableColor: "green" | "yellow" | "red" | "gray";
  transactions?: YNABActivityTransaction[];
  defaultActivityOpen?: boolean;
  inlineActivity?: boolean;
}) {
  const [open, setOpen] = useState(defaultActivityOpen ?? false);
  const colorClasses = {
    green: "bg-[#6ac47d] text-[#1e2b3a]",
    yellow: "bg-[#e5a938] text-[#1e2b3a]",
    red: "bg-[#e55a5a] text-white",
    gray: "bg-gray-600 text-white",
  };

  return (
    <>
      <tr>
        <td className="px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base">{emoji}</span>
            <span className="text-white font-medium">{name}</span>
          </div>
        </td>
        <td className="text-right text-white/70 font-mono px-3 py-2 sm:px-4 sm:py-3">
          {assigned}
        </td>
        <td className="text-right px-3 py-2 sm:px-4 sm:py-3">
          {transactions && !inlineActivity ? (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button className="text-white/70 font-mono hover:text-white hover:underline underline-offset-2 transition-colors cursor-pointer">
                  {activity}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="center"
                sideOffset={12}
                showArrow
                arrowClassName="fill-[#232f3e]"
                className="w-auto max-w-[90vw] sm:max-w-md p-0 bg-[#232f3e] border border-white/10 shadow-2xl rounded-lg"
              >
                <div className="px-4 py-3 sm:px-5 sm:py-4">
                  <InlineActivityTable transactions={transactions} />

                  {/* Close button */}
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      className="bg-[#5b7eb5] hover:bg-[#4a6da4] text-white"
                      onClick={() => setOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <span className="text-white/70 font-mono">{activity}</span>
          )}
        </td>
        <td className="text-right px-3 py-2 sm:px-4 sm:py-3">
          <span
            className={`inline-flex items-center justify-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold text-[10px] sm:text-sm ${colorClasses[availableColor]}`}
          >
            {available}
          </span>
        </td>
      </tr>
      {/* Inline activity row */}
      {transactions && inlineActivity && (
        <tr>
          <td colSpan={4} className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="bg-[#232f3e] rounded-lg p-3 sm:p-4 mt-1">
              <InlineActivityTable transactions={transactions} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// YNAB-style Categories Widget
export function YNABCategories({
  categories,
  title = "Categories",
}: {
  categories: Array<{
    emoji: string;
    name: string;
    assigned: string;
    activity: string;
    available: string;
    availableColor: "green" | "yellow" | "red" | "gray";
    transactions?: YNABActivityTransaction[];
    defaultActivityOpen?: boolean;
    inlineActivity?: boolean;
  }>;
  title?: string;
}) {
  return (
    <div className="overflow-x-auto max-w-full">
      <div className="bg-[#1e2b3a] rounded-lg overflow-hidden shadow-lg text-[11px] sm:text-sm min-w-[320px] sm:min-w-[480px]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-[#171f2b]">
              <th className="text-left text-white/50 text-[9px] sm:text-xs font-medium uppercase tracking-wider px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap">
                {title}
              </th>
              <th className="text-right text-white/50 text-[9px] sm:text-xs font-medium uppercase tracking-wider px-3 py-1.5 sm:px-4 sm:py-2 w-16 sm:w-24 whitespace-nowrap">
                Assigned
              </th>
              <th className="text-right text-white/50 text-[9px] sm:text-xs font-medium uppercase tracking-wider px-3 py-1.5 sm:px-4 sm:py-2 w-16 sm:w-24 whitespace-nowrap">
                Activity
              </th>
              <th className="text-right text-white/50 text-[9px] sm:text-xs font-medium uppercase tracking-wider px-3 py-1.5 sm:px-4 sm:py-2 w-20 sm:w-28 whitespace-nowrap">
                Available
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <YNABCategoryRow key={i} {...cat} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Step component for walkthrough
function WalkthroughStep({
  number,
  title,
  subtitle,
  color,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  color: "blue" | "green" | "purple" | "amber";
  children: React.ReactNode;
}) {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    green:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    purple:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    amber:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  };

  return (
    <div className="mb-12 last:mb-0">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div
          className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base ${colorClasses[color]}`}
        >
          <span className="font-serif">{number}</span>
        </div>
        <div>
          <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h4>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="sm:ml-12">{children}</div>
    </div>
  );
}

// Solo YNAB User Walkthrough
function SoloWalkthrough() {
  return (
    <div className="space-y-8">
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800 mb-8">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Your setup:</strong> You use YNAB. Your partner uses Splitwise
          to log their expenses. No YNAB required for them.
        </p>
      </div>

      <WalkthroughStep
        number="1"
        title="You pay for something shared"
        subtitle="Flag it in YNAB"
        color="amber"
      >
        <div className="space-y-4">
          <YNABTransaction
            flag="blue"
            account="💰 Checking"
            date="11/25/2025"
            payee="Whole Foods"
            category="Groceries"
            outflow="$150.00"
            highlightFlag={true}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We create the Splitwise expense and add an adjustment transaction.
            Your category shows $75 spent, your half.
          </p>
          <YNABCategories
            categories={[
              {
                emoji: "🛒",
                name: "Groceries",
                assigned: "$300.00",
                activity: "-$75.00",
                available: "$225.00",
                availableColor: "green",
                transactions: [
                  {
                    account: "💰 Checking",
                    date: new Date().toLocaleDateString(),
                    payee: "Whole Foods",
                    amount: "-$150.00",
                  },
                  {
                    account: "🤝 Splitwise",
                    date: new Date().toLocaleDateString(),
                    payee: "Whole Foods",
                    amount: "+$75.00",
                  },
                ],
              },
            ]}
          />
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="2"
        title="Your partner pays for something shared"
        subtitle="They log it in Splitwise"
        color="amber"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We automatically pull their Splitwise expenses into your YNAB. Your
            Utilities category shows $25, your half of the $50 bill.
          </p>
          <YNABCategories
            categories={[
              {
                emoji: "💡",
                name: "Utilities",
                assigned: "$100.00",
                activity: "-$25.00",
                available: "$75.00",
                availableColor: "green",
                transactions: [
                  {
                    account: "🤝 Splitwise",
                    date: new Date().toLocaleDateString(),
                    payee: "Electric Co.",
                    amount: "-$25.00",
                  },
                ],
              },
            ]}
          />
          <YNABAccounts
            accounts={[
              { name: "💰 Checking", balance: "$750.00" },
              {
                name: "🤝 Splitwise",
                balance: "+$50.00",
                isPositive: true,
                highlight: true,
              },
            ]}
          />
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Your partner still owes you $50 net (+$75 − $25)
          </p>
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="3"
        title="Settle up"
        subtitle="Your partner pays you (Venmo, cash, etc.)"
        color="amber"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            When your partner pays you back, record it as a transfer from
            Splitwise to Checking. Your category totals stay accurate.
          </p>
          <YNABAccounts
            title="Accounts"
            accounts={[
              { name: "💰 Checking", balance: "$800.00" },
              { name: "🤝 Splitwise", balance: "$0.00", highlight: true },
            ]}
          />
        </div>
      </WalkthroughStep>
    </div>
  );
}

// Dual YNAB Users Walkthrough
function DualWalkthrough() {
  return (
    <div className="space-y-8">
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mb-8">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Your setup:</strong> You both use YNAB separately. Both
          connect to this app. One flag updates both budgets.
        </p>
      </div>

      <WalkthroughStep
        number="1"
        title="You pay for something shared"
        subtitle="Flag it in YNAB, both budgets update"
        color="blue"
      >
        <div className="space-y-6">
          <YNABTransaction
            flag="blue"
            account="💰 Checking"
            date="11/25/2025"
            payee="Whole Foods"
            category="Groceries"
            outflow="$150.00"
            highlightFlag={true}
          />

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  👤 Your YNAB
                </span>
              </div>
              <YNABCategories
                categories={[
                  {
                    emoji: "🛒",
                    name: "Groceries",
                    assigned: "$300.00",
                    activity: "-$75.00",
                    available: "$225.00",
                    availableColor: "green",
                    defaultActivityOpen: true,
                    transactions: [
                      {
                        account: "💰 Checking",
                        date: new Date().toLocaleDateString(),
                        payee: "Whole Foods",
                        amount: "-$150.00",
                      },
                      {
                        account: "🤝 Splitwise",
                        date: new Date().toLocaleDateString(),
                        payee: "Whole Foods",
                        amount: "+$75.00",
                      },
                    ],
                  },
                ]}
              />
            </div>
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  👤 Partner&apos;s YNAB
                </span>
              </div>
              <YNABCategories
                categories={[
                  {
                    emoji: "🍎",
                    name: "Food",
                    assigned: "$300.00",
                    activity: "-$75.00",
                    available: "$225.00",
                    availableColor: "green",
                    defaultActivityOpen: true,
                    transactions: [
                      {
                        account: "🤝 Splitwise",
                        date: new Date().toLocaleDateString(),
                        payee: "Whole Foods",
                        amount: "-$75.00",
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Both see $75 spent, even though you call it &ldquo;Groceries&rdquo;
            and they call it &ldquo;Food.&rdquo;
          </p>
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="2"
        title="Your partner pays for something shared"
        subtitle="Either partner can flag"
        color="blue"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            When your partner flags their $50 electricity bill, the same thing
            happens in reverse. Your Utilities category gets a $25 expense.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  👤 Your YNAB
                </span>
              </div>
              <YNABCategories
                categories={[
                  {
                    emoji: "💡",
                    name: "Utilities",
                    assigned: "$100.00",
                    activity: "-$25.00",
                    available: "$75.00",
                    availableColor: "green",
                    transactions: [
                      {
                        account: "🤝 Splitwise",
                        date: new Date().toLocaleDateString(),
                        payee: "Electric Co.",
                        amount: "-$25.00",
                      },
                    ],
                  },
                ]}
              />
              <YNABAccounts
                accounts={[
                  { name: "💰 Checking", balance: "$750.00" },
                  {
                    name: "🤝 Splitwise",
                    balance: "+$50.00",
                    isPositive: true,
                    highlight: true,
                  },
                ]}
              />
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ Your partner still owes you $50 net (+$75 − $25)
              </p>
            </div>
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  👤 Partner&apos;s YNAB
                </span>
              </div>
              <YNABCategories
                categories={[
                  {
                    emoji: "⚡",
                    name: "Electric",
                    assigned: "$100.00",
                    activity: "-$25.00",
                    available: "$75.00",
                    availableColor: "green",
                    transactions: [
                      {
                        account: "💰 Checking",
                        date: new Date().toLocaleDateString(),
                        payee: "Electric Co.",
                        amount: "-$50.00",
                      },
                      {
                        account: "🤝 Splitwise",
                        date: new Date().toLocaleDateString(),
                        payee: "Electric Co.",
                        amount: "+$25.00",
                      },
                    ],
                  },
                ]}
              />
              <YNABAccounts
                accounts={[
                  { name: "💰 Checking", balance: "$550.00" },
                  {
                    name: "🤝 Splitwise",
                    balance: "-$50.00",
                    isPositive: false,
                    highlight: true,
                  },
                ]}
              />
              <p className="text-xs text-red-600 dark:text-red-400">
                ✓ They still owe you $50 net (−$75 + $25)
              </p>
            </div>
          </div>
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="3"
        title="Settle up"
        subtitle="Transfer in both YNABs"
        color="blue"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            When your partner pays you back, you both record a transfer:
            Splitwise → Checking. Category totals stay accurate in both budgets.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  👤 Your YNAB
                </span>
              </div>
              <YNABAccounts
                accounts={[
                  { name: "💰 Checking", balance: "$800.00" },
                  { name: "🤝 Splitwise", balance: "$0.00", highlight: true },
                ]}
              />
            </div>
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  👤 Partner&apos;s YNAB
                </span>
              </div>
              <YNABAccounts
                accounts={[
                  { name: "💰 Checking", balance: "$500.00" },
                  { name: "🤝 Splitwise", balance: "$0.00", highlight: true },
                ]}
              />
            </div>
          </div>
        </div>
      </WalkthroughStep>
    </div>
  );
}

export function PersonaWalkthrough() {
  const [selectedPersona, setSelectedPersona] = useState<
    "solo" | "dual" | null
  >(null);

  // Handle hash-based navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#walkthrough-solo") {
        setSelectedPersona("solo");
        // Scroll to the walkthrough section after a brief delay for animation
        setTimeout(() => {
          document
            .getElementById("walkthrough")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else if (hash === "#walkthrough-dual") {
        setSelectedPersona("dual");
        setTimeout(() => {
          document
            .getElementById("walkthrough")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    // Check on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <section
      id="walkthrough"
      className="py-16 sm:py-24 bg-white dark:bg-[#141414]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500 font-medium mb-4 text-center">
          See it in action
        </p>
        <h2 className="text-3xl md:text-4xl font-serif text-center text-gray-900 dark:text-white mb-4">
          How it works for your setup
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-10 max-w-xl mx-auto">
          Pick your scenario.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {/* Persona 1: Solo */}
          <button
            onClick={() =>
              setSelectedPersona(selectedPersona === "solo" ? null : "solo")
            }
            className="text-left"
          >
            <Card
              className={`border shadow-none overflow-hidden transition-all duration-200 ${
                selectedPersona === "solo"
                  ? "border-amber-500 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] hover:border-amber-300 dark:hover:border-amber-700"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <span className="text-xl">👤</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Only I use YNAB
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Partner logs expenses in Splitwise
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${
                      selectedPersona === "solo" ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          </button>

          {/* Persona 2: Dual */}
          <button
            onClick={() =>
              setSelectedPersona(selectedPersona === "dual" ? null : "dual")
            }
            className="text-left"
          >
            <Card
              className={`border shadow-none overflow-hidden transition-all duration-200 ${
                selectedPersona === "dual"
                  ? "border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] hover:border-blue-300 dark:hover:border-blue-700"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <span className="text-xl">👥</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        We both use YNAB
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Separate budgets, synced via Splitwise
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${
                      selectedPersona === "dual" ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          </button>
        </div>

        {/* Walkthrough content */}
        {selectedPersona && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <div className="max-w-3xl mx-auto">
              {selectedPersona === "solo" ? (
                <SoloWalkthrough />
              ) : (
                <DualWalkthrough />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
