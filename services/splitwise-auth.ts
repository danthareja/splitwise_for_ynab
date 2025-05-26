import axios, { AxiosError } from "axios";
import { addStackToAxios } from "./utils";

export interface SplitwiseUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  picture: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface SplitwiseGroup {
  id: number;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
  members: SplitwiseMember[];
  simplify_by_default: boolean;
  original_debts: any[];
  simplified_debts: any[];
  whiteboard: string | null;
  group_type: string | null;
  invite_link: string | null;
  group_reminders: any | null;
  avatar: {
    small: string;
    medium: string;
    large: string;
    original: string;
  };
  custom_avatar: boolean;
  cover_photo: {
    xxlarge: string;
    xlarge: string;
  };
}

export interface SplitwiseMember {
  user_id: number;
  first_name: string;
  last_name: string;
  picture: {
    medium: string;
  };
  email: string;
  registration_status: string;
  balance: any[];
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
