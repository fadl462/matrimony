const BASE_URL = "/api";

function getToken() {
  return localStorage.getItem("kindred_token");
}

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  signupEmail: (payload) => request("/auth/signup/email", { method: "POST", body: payload }),
  loginEmail: (payload) => request("/auth/login/email", { method: "POST", body: payload }),
  oauthCallback: (payload) => request("/auth/oauth/callback", { method: "POST", body: payload }),
  requestOtp: (payload) => request("/auth/phone/request-otp", { method: "POST", body: payload }),
  verifyOtp: (payload) => request("/auth/phone/verify-otp", { method: "POST", body: payload }),

  // Users
  getMe: () => request("/users/me"),
  updateProfile: (payload) => request("/users/me/profile", { method: "PUT", body: payload }),
  updatePreferences: (payload) => request("/users/me/preferences", { method: "PUT", body: payload }),
  updateHoroscope: (payload) => request("/users/me/horoscope", { method: "PUT", body: payload }),
  updateInterests: (payload) => request("/users/me/interests", { method: "PUT", body: payload }),
  getUser: (id) => request(`/users/${id}`),

  // Search
  search: (params) => request(`/search?${new URLSearchParams(params).toString()}`),

  // Match
  matchAction: (payload) => request("/match/action", { method: "POST", body: payload }),
  getMutualMatches: () => request("/match/mutual"),

  // Messages
  sendMessage: (payload) => request("/messages", { method: "POST", body: payload }),
  getThread: (otherUserId) => request(`/messages/thread/${otherUserId}`),
  getInbox: () => request("/messages/inbox"),

  // Video
  uploadVideo: (formData) => request("/video/upload", { method: "POST", body: formData, isFormData: true }),
  getVideoStatus: () => request("/video/status"),
  deleteVideo: () => request("/video", { method: "DELETE" }),

  // Admin
  getAnalyticsOverview: () => request("/admin/analytics/overview"),
  getAbTestAnalytics: () => request("/admin/analytics/ab-tests"),
  getAdminUsers: (params) => request(`/admin/users?${new URLSearchParams(params).toString()}`),
  suspendUser: (id, payload) => request(`/admin/users/${id}/suspend`, { method: "POST", body: payload }),
  verifyUser: (id) => request(`/admin/users/${id}/verify`, { method: "POST" }),
  getReports: (status) => request(`/admin/reports${status ? `?status=${status}` : ""}`),
  resolveReport: (id, payload) => request(`/admin/reports/${id}/resolve`, { method: "POST", body: payload }),
  getPendingVideos: () => request("/admin/videos/pending"),
  moderateVideo: (userId, payload) => request(`/admin/videos/${userId}/moderate`, { method: "POST", body: payload }),
};

export function setToken(token) {
  localStorage.setItem("kindred_token", token);
}

export function clearToken() {
  localStorage.removeItem("kindred_token");
}

export function videoStreamUrl(userId) {
  return `${BASE_URL}/video/stream/${userId}`;
}
