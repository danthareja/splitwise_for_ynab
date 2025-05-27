"use client";

import { YNABFlagColor } from "@/types/ynab";

export const FLAG_COLORS: YNABFlagColor[] = [
  { id: "red", name: "Red", color: "#ea5e5e" },
  { id: "orange", name: "Orange", color: "#f8a058" },
  { id: "yellow", name: "Yellow", color: "#f8df58" },
  { id: "green", name: "Green", color: "#8ec648" },
  { id: "blue", name: "Blue", color: "#3cb5e5" },
  { id: "purple", name: "Purple", color: "#9768d1" },
];

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
