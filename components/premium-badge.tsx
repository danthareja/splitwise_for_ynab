import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PremiumBadgeProps {
  variant?: "default" | "small" | "inline";
  className?: string;
}

export function PremiumBadge({
  variant = "default",
  className = "",
}: PremiumBadgeProps) {
  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold text-primary ${className}`}
      >
        <Crown className="h-3 w-3" />
        Premium
      </span>
    );
  }

  if (variant === "small") {
    return (
      <Badge
        className={`bg-gradient-to-r from-amber-500 to-orange-500 text-xs ${className}`}
      >
        <Crown className="h-3 w-3 mr-1" />
        Premium
      </Badge>
    );
  }

  return (
    <Badge
      className={`bg-gradient-to-r from-amber-500 to-orange-500 ${className}`}
    >
      <Crown className="h-4 w-4 mr-1" />
      Premium
    </Badge>
  );
}
