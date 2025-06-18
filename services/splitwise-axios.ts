import axios, { type AxiosInstance } from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry";
import { addStackToAxios } from "./utils";

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

  addStackToAxios(axiosInstance);

  axiosRetry(axiosInstance, {
    retries: 2,
    shouldResetTimeout: true,
    retryCondition: (e) =>
      e?.code === "ECONNABORTED" || isNetworkOrIdempotentRequestError(e),
  });

  return axiosInstance;
}
