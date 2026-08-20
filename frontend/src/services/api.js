import axios from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../utils/tokenStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getHealth() {
  const response = await api.get("/health/");
  return response.data;
}

function isAuthEndpoint(url = "") {
  return (
    url.includes("/api/auth/login/") ||
    url.includes("/api/auth/register/") ||
    url.includes("/api/auth/refresh/")
  );
}

let refreshRequest = null;

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("No refresh token");
  }

  const response = await axios.post(
    `${api.defaults.baseURL}/api/auth/refresh/`,
    { refresh },
    { headers: { "Content-Type": "application/json" } },
  );
  setTokens({
    access: response.data.access,
    refresh: response.data.refresh,
  });
  return response.data.access;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (
      status !== 401 ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = refreshAccessToken().finally(() => {
          refreshRequest = null;
        });
      }
      const access = await refreshRequest;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearTokens();
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshError);
    }
  },
);

export default api;
