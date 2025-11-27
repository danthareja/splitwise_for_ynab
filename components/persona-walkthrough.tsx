"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { YNABFlag } from "@/components/ynab-flag";

// Flag color types for the dropdown
type FlagColor =
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
            className="fixed z-[9999] bg-[#1e2b3a] rounded-lg shadow-xl border border-white/10 py-2 min-w-[160px]"
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
}: {
  flag?: FlagColor;
  account: string;
  date: Date | string;
  payee: string;
  category: string;
  outflow?: string;
  inflow?: string;
  highlightFlag?: boolean;
  interactive?: boolean;
}) {
  const [flag, setFlag] = useState<FlagColor | undefined>(initialFlag);

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
                onSelect={setFlag}
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

// YNAB-style Category Row
function YNABCategoryRow({
  emoji,
  name,
  assigned,
  activity,
  available,
  availableColor,
}: {
  emoji: string;
  name: string;
  assigned: string;
  activity: string;
  available: string;
  availableColor: "green" | "yellow" | "red" | "gray";
}) {
  const colorClasses = {
    green: "bg-[#6ac47d] text-[#1e2b3a]",
    yellow: "bg-[#e5a938] text-[#1e2b3a]",
    red: "bg-[#e55a5a] text-white",
    gray: "bg-gray-600 text-white",
  };

  return (
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
      <td className="text-right text-white/70 font-mono px-3 py-2 sm:px-4 sm:py-3">
        {activity}
      </td>
      <td className="text-right px-3 py-2 sm:px-4 sm:py-3">
        <span
          className={`inline-flex items-center justify-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold text-[10px] sm:text-sm ${colorClasses[availableColor]}`}
        >
          {available}
        </span>
      </td>
    </tr>
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
          className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base ${colorClasses[color]}`}
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
          <strong>The setup:</strong> You use YNAB, your partner doesn&apos;t.
          You share a Splitwise group to track who owes what.
        </p>
      </div>

      <WalkthroughStep
        number="1"
        title="You pay $150 for groceries"
        subtitle="A shared expense you fronted"
        color="amber"
      >
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-100 dark:border-amber-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong className="text-amber-800 dark:text-amber-300">
                Your action:
              </strong>{" "}
              Flag the shared transaction with a color in YNAB. That&apos;s it.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Flag the <i>outflow</i> in your spending account:
            </p>
            <YNABTransaction
              flag="blue"
              account="💰 Checking"
              date="11/25/2025"
              payee="Whole Foods"
              category="Groceries"
              outflow="$150.00"
              highlightFlag={true}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              👆 Just flag it—we handle the rest
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              We&apos;ll add a matching <i>inflow</i> to your Splitwise account:
            </p>
            <YNABTransaction
              flag="none"
              account="🤝 Splitwise"
              date="11/25/2025"
              payee="Whole Foods"
              category="Groceries"
              inflow="$75.00"
              interactive={false}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ✓ Auto-created—your partner owes you $75
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Your Groceries category shows your half:
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
                },
              ]}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ✓ Only $75 spent (your half), not $150
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Your Splitwise shows a positive balance:
            </p>
            <YNABAccounts
              accounts={[
                { name: "💰 Checking", balance: "$750.00" },
                {
                  name: "🤝 Splitwise",
                  balance: "+$75.00",
                  isPositive: true,
                  highlight: true,
                },
              ]}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ✓ Your partner owes you $75
            </p>
          </div>
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="2"
        title="Your partner pays $50 for electricity"
        subtitle="They just add it to your shared Splitwise group — no YNAB account needed"
        color="amber"
      >
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-100 dark:border-amber-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong className="text-amber-800 dark:text-amber-300">
                Their action:
              </strong>{" "}
              Add the expense to your shared Splitwise group.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              We&apos;ll add a matching <i>outflow</i> to your Splitwise
              account:
            </p>
            <YNABTransaction
              flag="none"
              account="🤝 Splitwise"
              date="11/25/2025"
              payee="Electric Co."
              category="Utilities"
              outflow="$25.00"
              interactive={false}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ✓ Auto-created for your half of the $50 bill
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Utilities shows your half of the bill:
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
                },
              ]}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ✓ $25 expense added (your half of $50)
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Your Splitwise account shows the net balance:
            </p>
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ✓ Your partner still owes you $50 net (+$75 - $25)
            </p>
          </div>
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="3"
        title="Settle up"
        subtitle="Your partner pays you (Venmo, cash, house chores)"
        color="purple"
      >
        <div className="space-y-6">
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-100 dark:border-purple-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong className="text-purple-800 dark:text-purple-300">
                In YNAB:
              </strong>{" "}
              Record the payment as a <strong>transfer</strong> from Splitwise →
              Checking account
            </p>
          </div>

          <YNABAccounts
            title="Accounts (after settling)"
            accounts={[
              { name: "💰 Checking", balance: "$800.00" },
              { name: "🤝 Splitwise", balance: "$0.00", highlight: true },
            ]}
          />

          <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Key:</strong> Because it&apos;s a transfer, your category
              totals don&apos;t change. Groceries still shows $75, Utilities
              still shows $25—your actual share.
            </p>
          </div>
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
          <strong>The setup:</strong> You both use YNAB separately. You share a
          Splitwise group, and both connect to this app.
        </p>
      </div>

      <WalkthroughStep
        number="1"
        title="You pay $150 for groceries"
        subtitle="Flag it—both budgets update automatically"
        color="blue"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-100 dark:border-blue-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong className="text-blue-800 dark:text-blue-300">
                Your action:
              </strong>{" "}
              Flag the shared transaction with a color in YNAB. That&apos;s it.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Flag the <i>outflow</i> in your spending account:
            </p>
            <YNABTransaction
              flag="blue"
              account="💰 Checking"
              date="11/25/2025"
              payee="Whole Foods"
              category="Groceries"
              outflow="$150.00"
              highlightFlag={true}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              👆 Just flag it—we handle the rest
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">👤</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Your YNAB
                </span>
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                We add a matching <i>inflow</i>:
              </p>
              <YNABTransaction
                flag="none"
                account="🤝 Splitwise"
                date="11/25/2025"
                payee="Whole Foods"
                category="Groceries"
                inflow="$75.00"
                interactive={false}
              />
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Your category shows your half:
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
                  },
                ]}
              />
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Your Splitwise shows a positive balance:
              </p>
              <YNABAccounts
                accounts={[
                  { name: "💰 Checking", balance: "$750.00" },
                  {
                    name: "🤝 Splitwise",
                    balance: "+$75.00",
                    isPositive: true,
                    highlight: true,
                  },
                ]}
              />
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ Your partner owes you $75
              </p>
            </div>
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">👤</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Partner&apos;s YNAB
                </span>
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                We add an <i>outflow</i> for their share:
              </p>
              <YNABTransaction
                flag="none"
                account="🤝 Splitwise"
                date="11/25/2025"
                payee="Whole Foods"
                category="Food"
                outflow="$75.00"
                interactive={false}
              />
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Partner&apos;s category shows their half:
              </p>
              <YNABCategories
                categories={[
                  {
                    emoji: "🍎",
                    name: "Food",
                    assigned: "$300.00",
                    activity: "-$75.00",
                    available: "$225.00",
                    availableColor: "green",
                  },
                ]}
              />
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Their Splitwise shows a negative balance:
              </p>
              <YNABAccounts
                accounts={[
                  { name: "💰 Checking", balance: "$600.00" },
                  {
                    name: "🤝 Splitwise",
                    balance: "-$75.00",
                    isPositive: false,
                    highlight: true,
                  },
                ]}
              />
              <p className="text-xs text-red-600 dark:text-red-400">
                ✓ They owe you $75
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>The magic:</strong> Both budgets show $75 spent—each
              person&apos;s actual share. Different category names? Different
              budgets? No problem.
            </p>
          </div>
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="2"
        title="Your partner pays $50 for electricity"
        subtitle="Same process—either partner can flag expenses"
        color="blue"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-100 dark:border-blue-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your partner flags the electricity bill in their YNAB. It&apos;s
              the same process as above, but in reverse.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">👤</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Your YNAB
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
                ✓ Your partner still owes you $50 net (+$75 - $25)
              </p>
            </div>
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">👤</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Partner&apos;s YNAB
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
                ✓ They still owe you $50 net (-$75 + $25)
              </p>
            </div>
          </div>
        </div>
      </WalkthroughStep>

      <WalkthroughStep
        number="3"
        title="Settle up"
        subtitle="Your partner pays you (Venmo, cash, house chores)"
        color="purple"
      >
        <div className="space-y-6">
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-100 dark:border-purple-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Partner owes you $50 net. Record the payment as a{" "}
              <strong>transfer</strong> from Splitwise → Checking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">👤</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Your YNAB
                </span>
              </div>
              <YNABAccounts
                accounts={[
                  { name: "💰 Checking", balance: "$800.00" },
                  { name: "🤝 Splitwise", balance: "$0.00", highlight: true },
                ]}
              />
            </div>
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">👤</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Partner&apos;s YNAB
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

          <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Key:</strong> Because it&apos;s a transfer, category
              totals don&apos;t change. Both budgets still show their actual
              share of every expense.
            </p>
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
    <section id="walkthrough" className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-serif text-center text-gray-900 dark:text-white mb-4">
          Which sounds like you?
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-xl mx-auto">
          Click to see how it works for your situation.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
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
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        I use YNAB. My partner doesn&apos;t.
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        You track every dollar. They ...don&apos;t.
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
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
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        We both use YNAB. Separately.
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Two budgets, one household.
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
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
