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

export async function getSplitwiseGroup(accessToken: string, groupId: string) {
  try {
    const axiosInstance = createSplitwiseAxios({ accessToken });

    const response = await axiosInstance.get(`/get_group/${groupId}`, {
      _operation: "get group",
    });
    return {
      success: true,
      group: response.data.group as SplitwiseGroup,
      error: null,
    };
  } catch (error) {
    // 403 means user doesn't have access to this group
    if (error instanceof AxiosError && error.response?.status === 403) {
      return {
        success: false,
        error: "No access to group",
        group: null,
      };
    }

    // 404 means group doesn't exist
    if (error instanceof AxiosError && error.response?.status === 404) {
      return {
        success: false,
        error: "Group not found",
        group: null,
      };
    }

    Sentry.captureException(error);

    if (error instanceof SplitwiseError) {
      return {
        success: false,
        error: error.message,
        group: null,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch group",
      group: null,
    };
  }
}
