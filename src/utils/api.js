/**
 * api.js — Centralized API client for Chéri Frontend
 * Handles JWT token management and API calls to the backend.
 */
import { safeLocalStorage } from "./storage.js";

const API_BASE = ""; // Same origin (Express serves both API and frontend)

// ─── Token Management ─────────────────────────────────────────────────────

export function getToken() {
  return safeLocalStorage.getItem("cheri_token");
}

export function setToken(token) {
  safeLocalStorage.setItem("cheri_token", token);
}

export function clearToken() {
  safeLocalStorage.removeItem("cheri_token");
}

// ─── Fetch wrapper with auth header ────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If 401, clear the stored token (session expired)
  if (response.status === 401) {
    clearToken();
  }

  return response;
}

// ─── Products APIs ──────────────────────────────────────────────────────────

export async function apiGetProducts() {
  const res = await apiFetch("/api/products");
  if (!res.ok) return [];
  return await res.json();
}

// ─── Auth APIs ─────────────────────────────────────────────────────────────

export async function apiRegister({ name, email, phone, address, password, avatar }) {
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, address, password, avatar }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Đăng ký thất bại");
  // Store the JWT token
  setToken(data.token);
  return data;
}

export async function apiLogin({ email, password }) {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Đăng nhập thất bại");
  setToken(data.token);
  return data;
}

export async function apiGetMe() {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

export async function apiUpdateProfile({ name, phone, address, avatar, newPassword }) {
  const res = await apiFetch("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ name, phone, address, avatar, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");
  return data;
}

export function apiLogout() {
  clearToken();
}

// ─── Order APIs ────────────────────────────────────────────────────────────

export async function apiCreateOrder({ items, total, address, phone, email, name, note, paymentMethod, shippingMethod }) {
  const res = await apiFetch("/api/orders", {
    method: "POST",
    body: JSON.stringify({ items, total, address, phone, email, name, note, paymentMethod, shippingMethod }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Tạo đơn hàng thất bại");
  return data;
}

export async function apiGetOrders() {
  const res = await apiFetch("/api/orders");
  if (!res.ok) return [];
  const data = await res.json();
  return data.orders || [];
}

export async function apiPayOrder(orderId) {
  const res = await apiFetch(`/api/orders/${orderId}/pay`, {
    method: "PUT"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Thanh toán thất bại");
  return data;
}

// ─── Review APIs ───────────────────────────────────────────────────────────

export async function apiCreateReview({ productId, productName, rating, content }) {
  const res = await apiFetch("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ productId, productName, rating, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Tạo đánh giá thất bại");
  return data;
}

export async function apiGetReviews(productId) {
  const res = await apiFetch(`/api/reviews/${productId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.reviews || [];
}


