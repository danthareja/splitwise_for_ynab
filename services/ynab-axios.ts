import axios, { type AxiosInstance, type AxiosError } from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry";
import { prisma } from "@/db";

// Extend the request config type to include our retry flag and operation context
declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
    _operation?: string;
  }
}

interface CreateYNABAxiosOptions {
  accessToken: string;
  path?: string;
  onRefreshFailure?: () => void;
}

export function createYNABAxios({
  accessToken,
  path = "",
  onRefreshFailure,
}: CreateYNABAxiosOptions) {
  const baseURL = `https://api.youneedabudget.com/v1${path}`;
  const axiosInstance = axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  axiosRetry(axiosInstance, {
    retries: 2,
    shouldResetTimeout: true,
    retryCondition: (e) =>
      e?.code === "ECONNABORTED" ||
      e instanceof YNABServerError ||
      isNetworkOrIdempotentRequestError(e),
  });

  // Add response interceptor to handle token refresh
  // This MUST be done before the error interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    createTokenRefreshInterceptor({
      axiosInstance,
      onRefreshFailure,
    }),
  );

  // Add response interceptor to log 400 errors
  axiosInstance.interceptors.response.use(
    (response) => response,
    createErrorInterceptor(),
  );

  return axiosInstance;
}

interface TokenRefreshInterceptorOptions {
  onRefreshFailure?: () => void;
  axiosInstance: AxiosInstance;
}

function createTokenRefreshInterceptor({
  onRefreshFailure,
  axiosInstance,
}: TokenRefreshInterceptorOptions) {
  return async (error: AxiosError) => {
    const originalRequest = error.config;

    // Check if originalRequest exists and hasn't been retried yet
    if (
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      console.log(`🚨 Received 401 response, attempting token refresh`);

      originalRequest._retry = true;

      try {
        const originalAccessToken =
          originalRequest.headers.Authorization?.toString().split(" ")[1];

        if (!originalAccessToken) {
          console.error("❌ Token refresh failed: No access token in request");
          throw new Error("No access token received from YNAB");
        }

        // Use the local refresh function
        const newAccessToken =
          await refreshYNABAccessToken(originalAccessToken);

        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        axiosInstance.defaults.headers.Authorization = `Bearer ${newAccessToken}`;

        console.log(`🔁 Retrying original request with new token`);

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error(`❌ Token refresh failed:`, refreshError);

        // Call optional cleanup callback
        if (onRefreshFailure) {
          onRefreshFailure();
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  };
}

export async function refreshYNABAccessToken(originalAccessToken: string) {
  console.log("🔄 Starting YNAB access token refresh process");

  console.log(
    `🔍 Looking up YNAB account for user with access token: ${originalAccessToken}`,
  );

  // Get the YNAB account from the database
  const account = await prisma.account.findFirst({
    where: {
      access_token: originalAccessToken,
      provider: "ynab",
    },
  });

  if (!account?.refresh_token) {
    throw new Error("YNAB refresh token not found");
  }

  // Use YNAB's OAuth refresh endpoint
  try {
    const response = await axios.post(
      "https://app.youneedabudget.com/oauth/token",
      {
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
        client_id: process.env.AUTH_YNAB_ID,
        client_secret: process.env.AUTH_YNAB_SECRET,
      },
    );

    console.log("✅ Successfully received response from YNAB OAuth endpoint");

    const { access_token, refresh_token } = response.data;

    if (!access_token) {
      console.error("❌ Token refresh failed: No access token in response");
      throw new Error("No access token received from YNAB");
    }

    // Update the database with new tokens
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token,
        refresh_token: refresh_token || account.refresh_token, // Keep old refresh token if new one not provided
      },
    });

    console.log("🔑 YNAB access token refresh completed successfully");

    return access_token;
  } catch (err: unknown) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data as
      | { error?: { id?: string; detail?: string } }
      | { error?: string; error_description?: string }
      | unknown;

    // Extract both YNAB API error shape and OAuth error shape
    const apiErrorId = (data as any)?.error?.id as string | undefined;
    const apiErrorDetail = (data as any)?.error?.detail as string | undefined;
    const oauthError =
      typeof (data as any)?.error === "string"
        ? ((data as any).error as string)
        : undefined;
    const oauthErrorDescription = (data as any)?.error_description as
      | string
      | undefined;

    const summary =
      apiErrorDetail ||
      oauthErrorDescription ||
      axiosErr.message ||
      "Unknown error";
    const codeTag = apiErrorId
      ? `[${apiErrorId}]`
      : oauthError
        ? `[${oauthError}]`
        : "";

    console.error(
      `🔻 YNAB refresh failed (${status ?? "no-status"}) ${codeTag}: ${summary}`,
    );

    // Emit raw response body for faster diagnosis
    try {
      console.error(`🧾 YNAB OAuth response body: ${JSON.stringify(data)}`);
    } catch {
      // best effort
    }

    // Map common OAuth errors to actionable error types
    if (oauthError === "invalid_grant") {
      // User needs to reconnect: token expired/revoked or wrong client binding
      console.error("🛠️ YNAB invalid_grant: user needs to reconnect");
      throw new YNABUnauthorizedError(axiosErr, "refresh access token");
    }

    if (oauthError === "invalid_client") {
      console.error(
        "🛠️ YNAB invalid_client: verify AUTH_YNAB_ID/SECRET match the client used to authorize existing tokens.",
      );
    }

    throw err;
  }
}

function createErrorInterceptor() {
  return async (error: AxiosError) => {
    const statusCode = error.response?.status;

    // Handle all YNAB API errors (4xx and 5xx with proper error format)
    if (statusCode && statusCode >= 400 && error.response) {
      const responseData = error.response.data as YNABErrorResponse;
      if (responseData?.error) {
        const originalRequest = error.config;
        const operation = originalRequest?._operation || "do operation";

        const ynabError = createYNABError(error, operation);
        console.error(`🎯 ${ynabError.message}`);

        return Promise.reject(ynabError);
      }
    }

    return Promise.reject(error);
  };
}

// Factory function to create appropriate error type
export function createYNABError(
  originalError: AxiosError,
  operation: string,
): YNABError {
  const statusCode = originalError.response?.status;
  const ynabError = (originalError.response?.data as YNABErrorResponse)?.error;
  const errorId = ynabError?.id;

  switch (statusCode) {
    case 400:
      return new YNABBadRequestError(originalError, operation);

    case 401:
      return new YNABUnauthorizedError(originalError, operation);

    case 403:
      switch (errorId) {
        case "403.1":
          return new YNABSubscriptionLapsedError(originalError, operation);
        case "403.2":
          return new YNABTrialExpiredError(originalError, operation);
        case "403.3":
          return new YNABUnauthorizedScopeError(originalError, operation);
        case "403.4":
          return new YNABDataLimitReachedError(originalError, operation);
        default:
          return new YNABForbiddenError(originalError, operation);
      }

    case 404:
      switch (errorId) {
        case "404.2":
          return new YNABResourceNotFoundError(originalError, operation);
        default:
          return new YNABNotFoundError(originalError, operation);
      }

    case 409:
      return new YNABConflictError(originalError, operation);

    case 429:
      return new YNABRateLimitError(originalError, operation);

    case 500:
      return new YNABInternalServerError(originalError, operation);

    case 503:
      return new YNABServiceUnavailableError(originalError, operation);

    default:
      // Fallback for unknown status codes - use appropriate base class
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        return new YNABClientError(originalError, operation);
      } else {
        return new YNABServerError(originalError, operation);
      }
  }
}

interface YNABErrorResponse {
  error: YNABErrorDetail;
}

interface YNABErrorDetail {
  id: string;
  name: string;
  detail: string;
}

export abstract class YNABError extends Error {
  public readonly operation: string;
  public readonly statusCode: number;
  public readonly requires_action: boolean = false;

  constructor(originalError: AxiosError, operation: string) {
    const responseData = originalError.response?.data as
      | YNABErrorResponse
      | { error?: string; error_description?: string }
      | undefined;

    const apiError =
      typeof (responseData as any)?.error === "object"
        ? ((responseData as any).error as YNABErrorDetail)
        : undefined;
    const oauthError =
      typeof (responseData as any)?.error === "string"
        ? ((responseData as any).error as string)
        : undefined;
    const oauthErrorDescription = (responseData as any)?.error_description as
      | string
      | undefined;

    let helpfulMessage = `YNAB can't ${operation}`;
    if (apiError?.detail) {
      const idSuffix = apiError.id ? ` (${apiError.id})` : "";
      helpfulMessage = `YNAB can't ${operation}: ${apiError.detail}${idSuffix}`;
    } else if (oauthError || oauthErrorDescription) {
      const parts = [oauthError, oauthErrorDescription].filter(Boolean);
      helpfulMessage = `YNAB can't ${operation}: ${parts.join(" - ")}`;
    }

    super(helpfulMessage, { cause: originalError });
    this.name = "YNABError";
    this.operation = operation;
    this.statusCode = originalError.response?.status || 0;
  }

  get originalError(): AxiosError {
    return (this as Error & { cause: AxiosError }).cause;
  }

  get ynabError(): YNABErrorDetail | undefined {
    const responseData = this.originalError.response?.data as YNABErrorResponse;
    return responseData?.error;
  }

  get suggestedFix(): string | undefined {
    return undefined;
  }
}

// Client Error Classes (4xx)
export class YNABClientError extends YNABError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABClientError";
  }
}

export class YNABBadRequestError extends YNABClientError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABBadRequestError";
  }
}

export class YNABUnauthorizedError extends YNABClientError {
  public override readonly requires_action = true;

  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABUnauthorizedError";
  }

  override get suggestedFix(): string {
    return "Your YNAB authorization has expired or is invalid. Please reconnect your YNAB account.";
  }
}

export class YNABForbiddenError extends YNABClientError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABForbiddenError";
  }
}

export class YNABSubscriptionLapsedError extends YNABForbiddenError {
  public override readonly requires_action = true;

  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABSubscriptionLapsedError";
  }

  override get suggestedFix(): string {
    return "Your YNAB subscription has lapsed. Please renew your YNAB subscription to continue syncing.";
  }
}

export class YNABTrialExpiredError extends YNABForbiddenError {
  public override readonly requires_action = true;

  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABTrialExpiredError";
  }

  override get suggestedFix(): string {
    return "Your YNAB trial has expired. Please subscribe to YNAB to continue syncing.";
  }
}

export class YNABUnauthorizedScopeError extends YNABForbiddenError {
  public override readonly requires_action = true;

  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABUnauthorizedScopeError";
  }

  override get suggestedFix(): string {
    return "Your YNAB authorization is missing required permissions. Please reconnect your YNAB account with the proper permissions.";
  }
}

export class YNABDataLimitReachedError extends YNABForbiddenError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABDataLimitReachedError";
  }
}

export class YNABNotFoundError extends YNABClientError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABNotFoundError";
  }
}

export class YNABResourceNotFoundError extends YNABNotFoundError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABResourceNotFoundError";
  }
}

export class YNABConflictError extends YNABClientError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABConflictError";
  }
}

export class YNABRateLimitError extends YNABClientError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABRateLimitError";
  }
}

// Server Error Classes (5xx)
export class YNABServerError extends YNABError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABServerError";
  }
}

export class YNABInternalServerError extends YNABServerError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABInternalServerError";
  }
}

export class YNABServiceUnavailableError extends YNABServerError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "YNABServiceUnavailableError";
  }
}
