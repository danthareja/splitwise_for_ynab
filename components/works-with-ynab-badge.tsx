"use client";

import { useState } from "react";

export function WorksWithYnabBadge() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img src="/works_with_ynab.svg" alt="Works with YNAB" className="h-10" />
      {isHovered && (
        <span
          className="absolute text-xl pointer-events-none animate-party-emoji"
          style={{ top: "50%", left: "50%" }}
        >
          🎉
        </span>
      )}
    </div>
  );
}
