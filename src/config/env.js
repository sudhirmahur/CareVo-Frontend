const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl && import.meta.env.DEV) {
  console.warn(
    "[Carevo] VITE_API_BASE_URL is not set."
  );
}

export const env = {
  API_BASE_URL: (apiBaseUrl || "").replace(/\/+$/, ""),
  IS_DEV: import.meta.env.DEV,
};