"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function ScheduledSyncInfo() {
  const [localTimeRange, setLocalTimeRange] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark that we're now on the client side
    setIsClient(true);

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Check if Temporal is available (using type assertion to avoid complex declarations)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (globalThis as any).Temporal !== "undefined") {
      try {
        calculateWithTemporal(userTimezone);
      } catch (error) {
        // If Temporal fails for any reason, fall back to Date API
        console.warn("Temporal API failed, falling back to Date API:", error);
        fallbackToDateAPI();
      }
    } else {
      // Fallback to Date API for browsers without Temporal support
      fallbackToDateAPI();
    }

    function calculateWithTemporal(userTimezone: string) {
      // Use Temporal API for more precise timezone handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Temporal = (globalThis as any).Temporal;
      const userTimeZone = Temporal.TimeZone.from(userTimezone);

      // Create PlainTime for 17:00 and 17:59 UTC
      const startTimeUTC = Temporal.PlainTime.from("17:00");
      const endTimeUTC = Temporal.PlainTime.from("17:59");

      // Create a PlainDate for today (we just need any date for conversion)
      const today = Temporal.Now.plainDateISO();

      // Create PlainDateTime objects in UTC
      const startDateTimeUTC = today.toPlainDateTime(startTimeUTC);
      const endDateTimeUTC = today.toPlainDateTime(endTimeUTC);

      // Convert to ZonedDateTime in UTC, then to user's timezone
      const startZoned = startDateTimeUTC
        .toZonedDateTime("UTC")
        .withTimeZone(userTimeZone);
      const endZoned = endDateTimeUTC
        .toZonedDateTime("UTC")
        .withTimeZone(userTimeZone);

      // Format times in user's local timezone
      const startTime = startZoned.toLocaleString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: userTimezone,
      });

      const endTime = endZoned.toLocaleString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: userTimezone,
      });

      setLocalTimeRange(`${startTime} - ${endTime}`);
    }

    function fallbackToDateAPI() {
      const utcDate = new Date();
      utcDate.setUTCHours(17, 0, 0, 0);

      const utcDateEnd = new Date();
      utcDateEnd.setUTCHours(17, 59, 59, 999);

      const startTime = utcDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const endTime = utcDateEnd.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      setLocalTimeRange(`${startTime} - ${endTime}`);
    }
  }, []);

  return (
    <div className="mb-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-900 dark:text-white">
            Automatic sync:
          </span>{" "}
          Daily between{" "}
          {isClient && localTimeRange ? (
            localTimeRange
          ) : (
            <span className="inline-block h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 align-middle"></span>
          )}
        </p>
      </div>
    </div>
  );
}
