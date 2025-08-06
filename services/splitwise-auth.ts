import * as Sentry from "@sentry/nextjs";
import { AxiosError } from "axios";
import type { SplitwiseGroup, SplitwiseUser } from "../types/splitwise";
import { createSplitwiseAxios, SplitwiseError } from "./splitwise-axios";

export async function validateSplitwiseApiKey(apiKey: string) {
  try {
    const axiosInstance = createSplitwiseAxios({ accessToken: apiKey });

    const response = await axiosInstance.get("/get_current_user", {
      _operation: "validate API key",
    });
    return {
      success: true,
      user: response.data.user as SplitwiseUser,
      error: null,
    };
  } catch (error) {
    Sentry.captureException(error);

    if (error instanceof SplitwiseError) {
      return {
        success: false,
        error: error.message,
        user: null,
      };
    }

    if (error instanceof AxiosError && error.response?.status === 401) {
      return {
        success: false,
        error: "Invalid API key. Did you revoke access to the app?",
        user: null,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to validate API key",
      user: null,
    };
  }
}

export async function getSplitwiseGroups(accessToken: string) {
  try {
    const axiosInstance = createSplitwiseAxios({ accessToken });

    const response = await axiosInstance.get("/get_groups", {
      _operation: "get groups",
    });
    return {
      success: true,
      groups: response.data.groups as SplitwiseGroup[],
      error: null,
    };
  } catch (error) {
    Sentry.captureException(error);

    if (error instanceof SplitwiseError) {
      return {
        success: false,
        error: error.message,
        groups: null,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch groups",
      groups: null,
    };
  }
}
