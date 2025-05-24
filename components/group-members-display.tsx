import Image from "next/image";
import type { SplitwiseMember } from "@/services/splitwise-auth";

interface GroupMembersDisplayProps {
  members: SplitwiseMember[];
  size?: "sm" | "md" | "lg";
}

export function GroupMembersDisplay({
  members,
  size = "sm",
}: GroupMembersDisplayProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {members.slice(0, 2).map((member, index) => (
          <div
            key={`${member.user_id}-${index}`}
            className={`relative ${sizeClasses[size]} overflow-hidden rounded-full border-1 border-primary`}
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
      <span className={`${textSizeClasses[size]} text-gray-600`}>
        {members.map((m) => m.first_name).join(" & ")}
      </span>
    </div>
  );
}
