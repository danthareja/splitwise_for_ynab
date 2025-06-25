import { z } from "zod";

// Shared Zod schemas for sync request validation
export const YNABRequestSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  userId: z.string().min(1, "User ID is required"),
  budgetId: z.string().min(1, "Budget ID is required"),
  splitwiseAccountId: z.string().min(1, "Splitwise account ID is required"),
  manualFlagColor: z.enum(
    ["red", "orange", "yellow", "green", "blue", "purple", "null"],
    {
      errorMap: () => ({
        message:
          "Must be a valid YNAB flag color: red, orange, yellow, green, blue, purple, or null",
      }),
    },
  ),
  syncedFlagColor: z.enum(
    ["red", "orange", "yellow", "green", "blue", "purple", "null"],
    {
      errorMap: () => ({
        message:
          "Must be a valid YNAB flag color: red, orange, yellow, green, blue, purple, or null",
      }),
    },
  ),
});

export const SplitwiseRequestSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  userId: z.string().min(1, "User ID is required"),
  splitwiseUserId: z
    .number()
    .positive("Splitwise user ID must be a positive number"),
  groupId: z.string().min(1, "Group ID is required"),
  knownEmoji: z.string().min(1, "Known emoji is required"),
  currencyCode: z
    .string()
    .length(3, "Currency code must be 3 characters (e.g., USD, EUR)"),
  defaultSplitRatio: z
    .string()
    .regex(/^\d+:\d+$/, "Split ratio must be in format 'X:Y' (e.g., '2:1')")
    .optional()
    .default("1:1"),
});

export const SyncStateSchema = z.object({
  strategy: z.enum(["prisma", "filesystem", "upstash"]),
  options: z
    .object({
      basePath: z.string().optional(),
      keyPrefix: z.string().optional(),
      url: z.string().optional(),
      token: z.string().optional(),
    })
    .optional(),
});

export const SyncRequestSchema = z.object({
  ynab: YNABRequestSchema,
  splitwise: SplitwiseRequestSchema,
  syncState: SyncStateSchema,
});

// Helper function to validate and return formatted errors
export function validateSyncRequest(body: unknown) {
  const result = SyncRequestSchema.safeParse(body);

  if (!result.success) {
    const errors = result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    );
    return {
      success: false as const,
      errors,
      data: undefined,
    };
  }

  return {
    success: true as const,
    errors: [],
    data: result.data,
  };
}

export type SyncRequest = z.infer<typeof SyncRequestSchema>;
