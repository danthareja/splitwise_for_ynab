import axios, { type AxiosInstance, type AxiosError } from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry";
import { addStackToAxios } from "./utils";
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

  addStackToAxios(axiosInstance);

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

  constructor(originalError: AxiosError, operation: string) {
    const ynabError = (originalError.response?.data as YNABErrorResponse)
      ?.error;
    const helpfulMessage = ynabError
      ? `YNAB can't ${operation}: ${ynabError.detail} (${ynabError.id})`
      : `YNAB can't ${operation}`;

    super(helpfulMessage, { cause: originalError });
    this.name = this.constructor.name;
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
}

// Client Error Classes (4xx)
export class YNABClientError extends YNABError {}

export class YNABBadRequestError extends YNABClientError {}

export class YNABUnauthorizedError extends YNABClientError {}

export class YNABForbiddenError extends YNABClientError {}
export class YNABSubscriptionLapsedError extends YNABForbiddenError {}
export class YNABTrialExpiredError extends YNABForbiddenError {}
export class YNABUnauthorizedScopeError extends YNABForbiddenError {}
export class YNABDataLimitReachedError extends YNABForbiddenError {}

export class YNABNotFoundError extends YNABClientError {}
export class YNABResourceNotFoundError extends YNABNotFoundError {}

export class YNABConflictError extends YNABClientError {}

export class YNABRateLimitError extends YNABClientError {}

// Server Error Classes (5xx)
export class YNABServerError extends YNABError {}

export class YNABInternalServerError extends YNABServerError {}

export class YNABServiceUnavailableError extends YNABServerError {}

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
