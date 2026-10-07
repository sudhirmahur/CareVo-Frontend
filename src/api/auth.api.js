import { http, unwrap } from "./axios";

export const authApi = {
  // ==========================================
  // REGISTER
  // ==========================================

  register: async (userData) => {
    const response = await http.post(
      "/auth/register",
      userData,
      {
        skipAuth: true,
        skipAuthRedirect: true,
      }
    );

    return unwrap(response);
  },

  // ==========================================
  // LOGIN
  // ==========================================

  login: async (userData) => {
    const response = await http.post(
      "/auth/login",
      userData,
      {
        skipAuth: true,
        skipAuthRedirect: true,
      }
    );

    return unwrap(response);
  },

  // ==========================================
  // CURRENT USER
  // ==========================================

  me: async () => {
    const response = await http.get("/users/me");

    return unwrap(response);
  },

  // ==========================================
  // LOGOUT
  // ==========================================

  logout: async () => {
    return {
      message: "Logged out successfully",
    };
  },
};