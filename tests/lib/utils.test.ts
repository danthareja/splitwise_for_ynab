import { describe, it, expect } from "vitest";
import {
  stripEmojis,
  getUserFirstName,
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  pluralize,
} from "@/lib/utils";

describe("lib/utils", () => {
  describe("stripEmojis", () => {
    it("should remove emojis from string", () => {
      expect(stripEmojis("✅ Test expense")).toBe(" Test expense");
      expect(stripEmojis("🎉 Party time 🎊")).toBe(" Party time ");
      expect(stripEmojis("No emojis here")).toBe("No emojis here");
    });

    it("should handle empty string", () => {
      expect(stripEmojis("")).toBe("");
    });

    it("should handle string with only emojis", () => {
      expect(stripEmojis("✅🎉🎊")).toBe("");
    });

    it("should preserve special characters that are not emojis", () => {
      expect(stripEmojis("Test $100 @ 50%")).toBe("Test $100 @ 50%");
    });
  });

  describe("getUserFirstName", () => {
    it("should return firstName if available", () => {
      expect(getUserFirstName({ firstName: "John", name: "John Doe" })).toBe(
        "John",
      );
    });

    it("should extract first name from name field", () => {
      expect(getUserFirstName({ name: "Jane Smith" })).toBe("Jane");
    });

    it("should handle single name", () => {
      expect(getUserFirstName({ name: "Madonna" })).toBe("Madonna");
    });

    it("should return undefined for null user", () => {
      expect(getUserFirstName(null)).toBeUndefined();
    });

    it("should return undefined for undefined user", () => {
      expect(getUserFirstName(undefined)).toBeUndefined();
    });

    it("should return undefined when no name fields available", () => {
      expect(getUserFirstName({})).toBeUndefined();
    });

    it("should prefer firstName over name", () => {
      expect(getUserFirstName({ firstName: "Johnny", name: "John Doe" })).toBe(
        "Johnny",
      );
    });
  });

  describe("formatCurrency", () => {
    it("should format USD currency", () => {
      const result = formatCurrency(25.5, "USD", "en-US");
      expect(result).toBe("$25.50");
    });

    it("should format negative values as positive", () => {
      const result = formatCurrency(-25.5, "USD", "en-US");
      expect(result).toBe("$25.50");
    });

    it("should format with different currency codes", () => {
      const result = formatCurrency(100, "EUR", "en-US");
      expect(result).toContain("100.00");
    });

    it("should handle zero", () => {
      const result = formatCurrency(0, "USD", "en-US");
      expect(result).toBe("$0.00");
    });

    it("should maintain two decimal places", () => {
      const result = formatCurrency(100, "USD", "en-US");
      expect(result).toBe("$100.00");
    });
  });

  describe("formatDate", () => {
    it("should format date string", () => {
      const result = formatDate("2024-01-15", "en-US");
      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should format Date object", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatDate(date, "en-US");
      expect(result).toContain("Jan");
    });
  });

  describe("formatTime", () => {
    it("should format time from date string", () => {
      const result = formatTime("2024-01-15T14:30:00Z", "en-US");
      expect(result).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
    });

    it("should format time from Date object", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      const result = formatTime(date, "en-US");
      expect(result).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
    });
  });

  describe("formatDateTime", () => {
    it("should format full date and time", () => {
      const result = formatDateTime("2024-01-15T14:30:00Z", "en-US");
      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
      expect(result).toContain("at");
    });
  });

  describe("pluralize", () => {
    it("should return singular for count of 1", () => {
      expect(pluralize(1, "item")).toBe("item");
    });

    it("should return plural for count of 0", () => {
      expect(pluralize(0, "item")).toBe("items");
    });

    it("should return plural for count > 1", () => {
      expect(pluralize(5, "item")).toBe("items");
    });

    it("should use custom plural form", () => {
      expect(pluralize(2, "child", "children")).toBe("children");
    });

    it("should default to adding 's' for plural", () => {
      expect(pluralize(3, "dog")).toBe("dogs");
    });
  });
});
