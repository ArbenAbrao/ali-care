import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
let csrf = "";
export async function loadCsrf() {
  const r = await api.get("/auth/csrf");
  csrf = r.data.csrfToken;
  return csrf;
}
api.interceptors.request.use(async (config) => {
  if (
    !["get", "head", "options"].includes((config.method || "get").toLowerCase())
  ) {
    if (!csrf) await loadCsrf();
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});
export function messageFromError(e) {
  return e?.response?.data?.error || "Something went wrong. Please try again.";
}
api.interceptors.response.use(async (response) => {
  if (
    ["/auth/admin/login", "/auth/superadmin/verify-otp"].includes(
      response.config?.url,
    )
  ) {
    csrf = "";
    await loadCsrf();
  }
  return response;
});
