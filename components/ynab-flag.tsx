"use client";

import { FLAG_COLORS } from "@/services/ynab-api";

interface YNABFlagProps {
  colorId: string;
  size?: "sm" | "md";
  className?: string;
}

export function YNABFlag({
  colorId,
  size = "sm",
  className = "",
}: YNABFlagProps) {
  const flagColor =
    FLAG_COLORS.find((c) => c.id === colorId)?.color || "#cccccc";

  const sizeClasses = {
    sm: "h-2.5 w-4",
    md: "h-3.5 w-5",
  };

  return (
    <div
      className={`inline-block relative ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: flagColor,
        clipPath: "polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)",
      }}
    />
  );
}
