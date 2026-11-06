
export const $ = (selector) =>
  document.querySelector(selector);

// Hien thi tien Viet Nam
export const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

// Dinh dang ngay gio
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "Chưa có";

// Quan ly access token
const TOKEN_KEY = "cinema_access_token";

export const getToken = () =>
  sessionStorage.getItem(TOKEN_KEY);

export const setToken = (value) =>
  sessionStorage.setItem(TOKEN_KEY, value);

export const clearToken = () =>
  sessionStorage.removeItem(TOKEN_KEY);

// Chuyen den trang dang nhap
export function loginUrl() {
  return `/cinema/login.html?next=${
    encodeURIComponent(
      location.pathname + location.search
    )
  }`;
}

export function requireLogin() {
  if (getToken()) {
    return true;
  }

  location.assign(loginUrl());
  return false;
}

// Ham goi API chung
export async function api(
  path,
  {
    method = "GET",
    body,
    auth = true
  } = {}
) {
  const headers = {
    Accept: "application/json"
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  let response;

  try {
    response = await fetch(path, {
      method,
      headers,
      cache: "no-store",
      body: body === undefined
        ? undefined
        : JSON.stringify(body)
    });
  } catch {
    throw new Error(
      "Không kết nối được backend. Kiểm tra Spring Boot ở cổng 8080."
    );
  }

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearToken();
      location.assign(loginUrl());

      throw new Error(
        "Phiên đăng nhập đã hết hạn."
      );
    }

    const message =
      data?.message ||
      data?.detail ||
      data?.error ||
      response.statusText;

    throw new Error(
      `HTTP ${response.status}: ${message}`
    );
  }

  return data;
}

// Hien thi thong bao tren giao dien
export function setMessage(
  selector,
  message,
  type = "error"
) {
  const element = $(selector);

  if (!element) return;

  element.textContent = message || "";
  element.className = `notice ${type}`;
  element.hidden = !message;
}

// Cap nhat menu dang nhap / dang xuat
export function initNav() {
  document
    .querySelectorAll("[data-auth-link]")
    .forEach((link) => {
      if (getToken()) {
        link.textContent = "Đăng xuất";
        link.href = "/cinema/index.html";

        link.addEventListener("click", () => {
          clearToken();
        });
      } else {
        link.textContent = "Đăng nhập";
        link.href = "/cinema/login.html";
      }
    });
}
