import axios, { AxiosError } from "axios";
import { addStackToAxios } from "./utils";
import { SplitwiseUser, SplitwiseGroup } from "./splitwise-types";

export async function validateSplitwiseApiKey(apiKey: string) {
  console.log("validateSplitwiseApiKey", apiKey);
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

export async function getSplitwiseGroups(apiKey: string) {
  try {
    const axiosInstance = axios.create({
      baseURL: "https://secure.splitwise.com/api/v3.0",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    addStackToAxios(axiosInstance);

    const response = await axiosInstance.get("/get_groups");
    return {
      success: true,
      groups: response.data.groups as SplitwiseGroup[],
    };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      return {
        success: false,
        error: "Invalid API key. Please verify your connection.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch groups",
    };
  }
}
