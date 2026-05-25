import axios from "axios";

function resolveApiBaseUrl() {
  const rawUrl = (import.meta.env.VITE_API_URL || "").trim();

  // When Vite proxy is used, keep the axios base empty and call /api/... directly.
  // This prevents accidental /api/api/... requests that caused "Route not found".
  if (!rawUrl || rawUrl === "/api") return "";

  return rawUrl.replace(/\/$/, "");
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}
