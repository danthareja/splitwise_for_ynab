export function addStackToAxios(axiosInstance, formatError = (e) => e) {
  axiosInstance.interceptors.request.use((config) => {
    config.errorContext = new Error("AxiosError was thrown from:");
    return config;
  });

  axiosInstance.interceptors.response.use(undefined, async (error) => {
    const errorContext = error.config?.errorContext;
    if (errorContext) {
      error.cause = error.config.errorContext;
      delete error.config.errorContext;
    }
    throw formatError(error);
  });

  return axiosInstance;
}
