import api from "./api";

export async function registerUser(payload) {
  const response = await api.post("/api/auth/register/", payload);
  return response.data;
}

export async function loginUser(payload) {
  const response = await api.post("/api/auth/login/", payload);
  return response.data;
}

export async function refreshTokens(refresh) {
  const response = await api.post("/api/auth/refresh/", { refresh });
  return response.data;
}

export async function logoutUser(refresh) {
  const response = await api.post("/api/auth/logout/", { refresh });
  return response.data;
}

export async function getProfile() {
  const response = await api.get("/api/auth/profile/");
  return response.data;
}

export async function updateProfile(payload) {
  const response = await api.patch("/api/auth/profile/", payload);
  return response.data;
}

export async function changePassword(payload) {
  await api.post("/api/auth/change-password/", payload);
}

export async function verifyEmail(payload) {
  const response = await api.post("/api/auth/verify-email/", payload);
  return response.data;
}

export async function resendVerification(email) {
  const response = await api.post("/api/auth/resend-verification/", { email });
  return response.data;
}

export async function googleLogin(id_token) {
  const response = await api.post("/api/auth/google/", { id_token });
  return response.data;
}

