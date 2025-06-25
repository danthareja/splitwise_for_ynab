import Image from "next/image";
import type { SplitwiseMember } from "@/types/splitwise";

interface GroupMembersDisplayProps {
  members: SplitwiseMember[];
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function GroupMembersDisplay({
  members,
  size = "sm",
  isLoading = false,
}: GroupMembersDisplayProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {/* Show skeleton avatars */}
          {[0, 1].map((index) => (
            <div
              key={index}
              className={`relative ${sizeClasses[size]} overflow-hidden rounded-full border-1 border-muted-foreground bg-gray-200 animate-pulse`}
            />
          ))}
        </div>
        <div className={`${textSizeClasses[size]} text-muted-foreground`}>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {members.slice(0, 2).map((member, index) => (
          <div
            key={`${member.id}-${index}`}
            className={`relative ${sizeClasses[size]} overflow-hidden rounded-full border-1 border-muted-foreground`}
          >
            <Image
              src={member.picture?.medium || "https://placecats.com/50/50"}
              alt={`${member.first_name} ${member.last_name}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <span className={`${textSizeClasses[size]} text-muted-foreground`}>
        {members.map((m) => m.first_name).join(" & ")}
      </span>
    </div>
  );
}
