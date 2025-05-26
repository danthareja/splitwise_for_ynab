import axios, { type AxiosInstance, type AxiosError } from "axios";
import { addStackToAxios } from "./utils";
import { auth } from "@/auth";
import { prisma } from "@/db";

// Extend the request config type to include our retry flag
declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
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

  // Add response interceptor to handle token refresh
  axiosInstance.interceptors.response.use(
    (response) => response,
    createYNABTokenRefreshInterceptor({
      axiosInstance,
      onRefreshFailure,
    }),
  );

  return axiosInstance;
}

interface TokenRefreshInterceptorOptions {
  logPrefix?: string;
  onRefreshFailure?: () => void;
  axiosInstance: AxiosInstance;
}

function createYNABTokenRefreshInterceptor({
  logPrefix = "",
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
      console.log(
        `🚨 ${logPrefix}Received 401 response, attempting token refresh`,
      );
      console.log(`📍 ${logPrefix}Failed request URL: ${originalRequest.url}`);

      originalRequest._retry = true;

      try {
        console.log(
          `🔄 ${logPrefix}Attempting to refresh YNAB access token...`,
        );

        // Use the local refresh function
        const newAccessToken = await refreshYNABAccessToken();

        console.log(
          `✅ ${logPrefix}Token refresh successful, updating headers`,
        );

        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        axiosInstance.defaults.headers.Authorization = `Bearer ${newAccessToken}`;

        console.log(`🔁 ${logPrefix}Retrying original request with new token`);

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error(`❌ ${logPrefix}Token refresh failed:`, refreshError);

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

export async function refreshYNABAccessToken() {
  console.log("🔄 Starting YNAB access token refresh process");

  const session = await auth();

  if (!session?.user?.id) {
    console.error("❌ Token refresh failed: User not authenticated");
    throw new Error("User not authenticated");
  }

  console.log(`🔍 Looking up YNAB account for user: ${session.user.id}`);

  // Get the YNAB account from the database
  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "ynab",
    },
  });

  if (!account?.refresh_token) {
    console.error(
      "❌ Token refresh failed: YNAB refresh token not found in database",
    );
    throw new Error("YNAB refresh token not found");
  }

  console.log(`✅ Found YNAB account with ID: ${account.id}`);
  console.log(
    `🔑 Refresh token available (length: ${account.refresh_token.length})`,
  );

  try {
    console.log("📡 Making request to YNAB OAuth refresh endpoint");

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

    console.log(
      `🔑 New access token received (length: ${access_token.length})`,
    );
    console.log(
      `🔑 New refresh token ${refresh_token ? `received (length: ${refresh_token.length})` : "not provided - keeping existing"}`,
    );

    console.log("💾 Updating database with new tokens");

    // Update the database with new tokens
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token,
        refresh_token: refresh_token || account.refresh_token, // Keep old refresh token if new one not provided
      },
    });

    console.log("✅ Successfully updated database with new tokens");
    console.log("🎉 YNAB access token refresh completed successfully");

    return access_token;
  } catch (error) {
    console.error("❌ Error during YNAB access token refresh:", error);

    if (axios.isAxiosError(error)) {
      console.error("📡 HTTP Status:", error.response?.status);
      console.error("📡 Response Data:", error.response?.data);
      console.error("📡 Request URL:", error.config?.url);
    }

    throw new Error("Failed to refresh YNAB access token");
  }
}
