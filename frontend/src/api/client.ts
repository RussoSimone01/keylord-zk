import axios from "axios";
import type { AuthResponse } from "../types";
import { useAuthStore } from "../store/authStore";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL });

// Same base URL but no interceptors: a 401 from the refresh call must not trigger another refresh
const refreshClient = axios.create({ baseURL });

// A 401 from these endpoints means wrong credentials or an invalid refresh token, not an expired access token
const PUBLIC_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/salt/",
];

// Refresh tokens are single-use: concurrent 401s share one rotation instead of each presenting the same token
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { username, encryptionKey, refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error("No refresh token");
  }
  const { data } = await refreshClient.post<AuthResponse>("/auth/refresh", {
    refreshToken,
  });
  useAuthStore
    .getState()
    .setAuth(username, encryptionKey, data.accessToken, data.refreshToken);
  return data.accessToken;
}

client.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
      originalRequest?.url?.startsWith(endpoint),
    );
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isPublicEndpoint
    ) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    // Refresh only if the request carried the current token: otherwise another request has already rotated it
    const currentAccessToken = useAuthStore.getState().accessToken;
    if (
      !currentAccessToken ||
      originalRequest.headers?.Authorization === `Bearer ${currentAccessToken}`
    ) {
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        await refreshPromise;
      } catch {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }
    }
    // The request interceptor sets the current token; a 401 on the retry is not retried again
    return client(originalRequest);
  },
);

export default client;
