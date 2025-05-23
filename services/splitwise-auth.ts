import axios, { AxiosError } from "axios"
import { addStackToAxios } from "./utils"

export interface SplitwiseUser {
  id: number
  first_name: string
  last_name: string
  email: string
  picture: {
    small: string
    medium: string
    large: string
  }
}

export async function validateSplitwiseApiKey(apiKey: string) {
  console.log("validateSplitwiseApiKey", apiKey)
  try {
    const axiosInstance = axios.create({
      baseURL: "https://secure.splitwise.com/api/v3.0",
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    addStackToAxios(axiosInstance)

    const response = await axiosInstance.get("/get_current_user")
    return {
      success: true,
      user: response.data.user as SplitwiseUser,
    }
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      return {
        success: false,
        error: "Invalid API key. Please verify your input and try again.",
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate API key",
    }
  }
}
