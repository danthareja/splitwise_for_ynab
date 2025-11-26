"use client";

import { useState } from "react";
import Image from "next/image";

export function WorksWithYnabBadge() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src="/works_with_ynab.svg"
        alt="Works with YNAB"
        width={120}
        height={40}
        className="h-10 w-auto"
        priority
      />
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
