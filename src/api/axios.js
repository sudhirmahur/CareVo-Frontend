import axios from "axios";

import { env } from "../config/env";
import { AUTH_EVENTS } from "../utils/constants";
import { tokenStorage } from "../utils/tokenStorage";
import { normalizeApiError } from "./errors";

// =====================================================
// CAREVO API - CENTRAL AXIOS INSTANCE
// =====================================================

export const http = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 20000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },

  // Required when backend uses credentials/cookies.
  // It does not hurt if currently using JWT in Authorization header.
  withCredentials: false,
});


// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

http.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get();

    // Add JWT token to protected API requests
    if (token && !config.skipAuth) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

http.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const apiError = normalizeApiError(error);

    // -----------------------------------------------
    // Unauthorized / expired token
    // -----------------------------------------------

    if (
      apiError.status === 401 &&
      !error.config?.skipAuthRedirect
    ) {
      tokenStorage.clear();

      window.dispatchEvent(
        new CustomEvent(AUTH_EVENTS.UNAUTHORIZED)
      );
    }

    return Promise.reject(apiError);
  }
);


// =====================================================
// RESPONSE DATA HELPER
// =====================================================

export const unwrap = (response) => {
  return response.data;
};