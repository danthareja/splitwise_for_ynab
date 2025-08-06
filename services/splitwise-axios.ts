import axios, { type AxiosInstance, type AxiosError } from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry";

declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
    _operation?: string;
  }
}

interface CreateSplitwiseAxiosOptions {
  accessToken: string;
  path?: string;
}

export function createSplitwiseAxios({
  accessToken,
  path = "",
}: CreateSplitwiseAxiosOptions): AxiosInstance {
  const baseURL = `https://secure.splitwise.com/api/v3.0${path}`;
  const axiosInstance = axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  axiosRetry(axiosInstance, {
    retries: 2,
    shouldResetTimeout: true,
    retryCondition: (e) =>
      e?.code === "ECONNABORTED" ||
      e instanceof SplitwiseServerError ||
      isNetworkOrIdempotentRequestError(e),
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    createErrorInterceptor(),
  );

  return axiosInstance;
}

function createErrorInterceptor() {
  return async (error: AxiosError) => {
    const statusCode = error.response?.status;

    if (statusCode && statusCode >= 400 && error.response) {
      const originalRequest = error.config;
      const operation = originalRequest?._operation || "do operation";

      const splitwiseError = createSplitwiseError(error, operation);

      return Promise.reject(splitwiseError);
    }

    return Promise.reject(error);
  };
}

export function createSplitwiseError(
  originalError: AxiosError,
  operation: string,
): SplitwiseError {
  const statusCode = originalError.response?.status;

  switch (statusCode) {
    case 400:
      return new SplitwiseBadRequestError(originalError, operation);

    case 401:
      return new SplitwiseUnauthorizedError(originalError, operation);

    case 403:
      return new SplitwiseForbiddenError(originalError, operation);

    case 404:
      return new SplitwiseNotFoundError(originalError, operation);

    default:
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        return new SplitwiseClientError(originalError, operation);
      } else {
        return new SplitwiseServerError(originalError, operation);
      }
  }
}

interface SplitwiseUnauthorizedResponse {
  error: string;
}

interface SplitwiseForbiddenResponse {
  errors: {
    base: string[];
  };
}

interface SplitwiseNotFoundResponse {
  errors: {
    base: string[];
  };
}

type SplitwiseErrorResponse =
  | SplitwiseUnauthorizedResponse
  | SplitwiseForbiddenResponse
  | SplitwiseNotFoundResponse
  | Record<string, unknown>;

export abstract class SplitwiseError extends Error {
  public readonly operation: string;
  public readonly statusCode: number;
  public readonly requires_action: boolean = false;

  constructor(originalError: AxiosError, operation: string) {
    const helpfulMessage = SplitwiseError.createHelpfulMessage(
      originalError,
      operation,
    );

    super(helpfulMessage, { cause: originalError });
    this.name = "SplitwiseError";
    this.operation = operation;
    this.statusCode = originalError.response?.status || 0;
  }

  private static createHelpfulMessage(
    originalError: AxiosError,
    operation: string,
  ): string {
    const responseData = originalError.response?.data as SplitwiseErrorResponse;
    const statusCode = originalError.response?.status;

    if (
      statusCode === 401 &&
      responseData &&
      "error" in responseData &&
      responseData.error
    ) {
      return `Splitwise can't ${operation}: ${responseData.error}`;
    }

    if (statusCode === 403 && responseData && "errors" in responseData) {
      const forbiddenResponse = responseData as SplitwiseForbiddenResponse;
      if (forbiddenResponse.errors?.base) {
        const errorMessage = Array.isArray(forbiddenResponse.errors.base)
          ? forbiddenResponse.errors.base.join(", ")
          : forbiddenResponse.errors.base;
        return `Splitwise can't ${operation}: ${errorMessage}`;
      }
    }

    if (statusCode === 404 && responseData && "errors" in responseData) {
      const notFoundResponse = responseData as SplitwiseNotFoundResponse;
      if (notFoundResponse.errors?.base) {
        const errorMessage = Array.isArray(notFoundResponse.errors.base)
          ? notFoundResponse.errors.base.join(", ")
          : notFoundResponse.errors.base;
        return `Splitwise can't ${operation}: ${errorMessage}`;
      }
    }

    return `Splitwise can't ${operation}`;
  }

  get originalError(): AxiosError {
    return (this as Error & { cause: AxiosError }).cause;
  }

  get splitwiseError(): SplitwiseErrorResponse | undefined {
    return this.originalError.response?.data as SplitwiseErrorResponse;
  }

  get suggestedFix(): string | undefined {
    return undefined;
  }
}

// Client Error Classes (4xx)
export class SplitwiseClientError extends SplitwiseError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "SplitwiseClientError";
  }
}

export class SplitwiseBadRequestError extends SplitwiseClientError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "SplitwiseBadRequestError";
  }
}

export class SplitwiseUnauthorizedError extends SplitwiseClientError {
  public override readonly requires_action = true;

  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "SplitwiseUnauthorizedError";
  }

  override get suggestedFix(): string {
    return "Please reconnect your Splitwise account.";
  }
}

export class SplitwiseForbiddenError extends SplitwiseClientError {
  public override readonly requires_action = true;

  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "SplitwiseForbiddenError";
  }

  override get suggestedFix(): string {
    return "Please check your Splitwise group settings and make sure you are a member of the selected group.";
  }
}

export class SplitwiseNotFoundError extends SplitwiseClientError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "SplitwiseNotFoundError";
  }
}

export class SplitwiseServerError extends SplitwiseError {
  constructor(originalError: AxiosError, operation: string) {
    super(originalError, operation);
    this.name = "SplitwiseServerError";
  }
}
