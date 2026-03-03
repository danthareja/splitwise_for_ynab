interface Transaction {
  name: string;
  amount: number;
  isNew?: boolean;
  flag?: "green" | "blue";
}

interface AccountData {
  checking?: Transaction[];
  splitwise?: Transaction[];
  balance: number;
}

interface AccountDemoProps {
  you: string;
  partner: string;
  note?: string;
}

function formatAmount(amount: number) {
  const prefix = amount >= 0 ? "+" : "-";
  return `${prefix}$${Math.abs(amount).toFixed(2)}`;
}

function AmountCell({ amount }: { amount: number }) {
  return (
    <span
      className={`font-semibold tabular-nums ${amount >= 0 ? "text-green-600" : "text-red-500"}`}
    >
      {formatAmount(amount)}
    </span>
  );
}

function FlagDot({ color }: { color: "green" | "blue" }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color === "green" ? "bg-green-500" : "bg-blue-500"}`}
    />
  );
}

function TransactionRow({ txn }: { txn: Transaction }) {
  return (
    <div
      className={`flex justify-between items-center py-1.5 px-2 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${txn.isNew ? "bg-yellow-50 dark:bg-yellow-900/20 rounded" : ""}`}
    >
      <span className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
        {txn.flag && <FlagDot color={txn.flag} />}
        {txn.name}
      </span>
      <AmountCell amount={txn.amount} />
    </div>
  );
}

function AccountSection({
  label,
  transactions,
  emptyText,
}: {
  label: string;
  transactions?: Transaction[];
  emptyText?: string;
}) {
  return (
    <div className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-3 mb-2 last:mb-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </div>
      {!transactions || transactions.length === 0 ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 italic py-1.5 px-2">
          {emptyText || "No transactions"}
        </div>
      ) : (
        transactions.map((txn, i) => <TransactionRow key={i} txn={txn} />)
      )}
    </div>
  );
}

function BalanceRow({ balance }: { balance: number }) {
  return (
    <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-gray-200 dark:border-gray-600 px-2">
      <span className="font-bold text-sm text-gray-900 dark:text-white">
        Balance
      </span>
      <span
        className={`font-bold text-sm tabular-nums ${balance >= 0 ? "text-green-600" : "text-red-500"}`}
      >
        {formatAmount(balance)}
      </span>
    </div>
  );
}

function UserColumn({
  label,
  data,
  variant,
}: {
  label: string;
  data: AccountData;
  variant: "you" | "partner";
}) {
  const headerColor =
    variant === "you"
      ? "text-blue-600 dark:text-blue-400"
      : "text-orange-600 dark:text-orange-400";
  const bgColor =
    variant === "you"
      ? "bg-blue-50 dark:bg-blue-950/30"
      : "bg-orange-50 dark:bg-orange-950/30";

  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <div
        className={`text-xs font-bold uppercase tracking-wider ${headerColor} mb-3`}
      >
        {label}
      </div>
      <AccountSection
        label="Checking Account"
        transactions={data.checking}
        emptyText="No transactions"
      />
      <AccountSection label="Splitwise Account" transactions={data.splitwise} />
      <BalanceRow balance={data.balance} />
    </div>
  );
}

export function AccountDemo({ you, partner, note }: AccountDemoProps) {
  const youData: AccountData = JSON.parse(you);
  const partnerData: AccountData = JSON.parse(partner);

  return (
    <div className="my-8 not-prose">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UserColumn label="Your YNAB" data={youData} variant="you" />
        <UserColumn
          label="Partner's YNAB"
          data={partnerData}
          variant="partner"
        />
      </div>
      {note && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-4 py-3 mt-3 text-sm text-gray-800 dark:text-gray-200">
          {note}
        </div>
      )}
    </div>
  );
}
