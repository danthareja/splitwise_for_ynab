import * as Sentry from "@sentry/nextjs";
import axios, { AxiosError } from "axios";
import type { SplitwiseGroup, SplitwiseUser } from "../types/splitwise";
import { addStackToAxios } from "./utils";

export async function validateSplitwiseApiKey(apiKey: string) {
  try {
    const axiosInstance = axios.create({
      baseURL: "https://secure.splitwise.com/api/v3.0",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    addStackToAxios(axiosInstance);

    const response = await axiosInstance.get("/get_current_user");
    return {
      success: true,
      user: response.data.user as SplitwiseUser,
      error: null,
    };
  } catch (error) {
    Sentry.captureException(error);

    if (error instanceof AxiosError && error.response?.status === 401) {
      return {
        success: false,
        error: "Invalid API key. Please verify your input and try again.",
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
    const axiosInstance = axios.create({
      baseURL: "https://secure.splitwise.com/api/v3.0",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    addStackToAxios(axiosInstance);

    const response = await axiosInstance.get("/get_groups");
    return {
      success: true,
      groups: response.data.groups as SplitwiseGroup[],
    };
  } catch (error) {
    Sentry.captureException(error);

    if (error instanceof AxiosError && error.response?.status === 401) {
      return {
        success: false,
        error: "Invalid access token. Please verify your connection.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch groups",
    };
  }
}
