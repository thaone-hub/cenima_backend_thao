/* Shared navigation and authenticated API client. Credentials stay in this tab. */
window.Space = (() => {
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  let session;
  try {
    session = JSON.parse(sessionStorage.getItem("cinema.session") || "null");
  } catch {
    session = null;
  }
  let me = null,
    refreshTask = null,
    toastTimer;
  function save(value) {
    session = value;
    if (value) sessionStorage.setItem("cinema.session", JSON.stringify(value));
    else sessionStorage.removeItem("cinema.session");
  }
  async function api(path, options = {}, retry = true) {
    const headers = { Accept: "application/json", ...options.headers };
    if (session?.accessToken)
      headers.Authorization = `Bearer ${session.accessToken}`;
    if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    const response = await fetch(path, {
      ...options,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
    if (
      response.status === 401 &&
      retry &&
      session?.refreshToken &&
      !path.startsWith("/api/auth/")
    ) {
      try {
        if (!refreshTask)
          refreshTask = api(
            "/api/auth/refresh",
            { method: "POST", body: { refreshToken: session.refreshToken } },
            false,
          )
            .then(save)
            .finally(() => {
              refreshTask = null;
            });
        await refreshTask;
        return api(path, options, false);
      } catch {
        save(null);
        me = null;
        renderHeader();
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.message || data?.detail;
      if (response.status === 401)
        throw new Error(
          "Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.",
        );
      if (response.status === 403)
        throw new Error("Bạn không có quyền thực hiện thao tác này.");
      throw new Error(
        message ||
          `Không thể xử lý yêu cầu (${response.status}). Vui lòng thử lại.`,
      );
    }
    return data;
  }
  function toast(message) {
    const box = document.getElementById("toast");
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (box.hidden = true), 6000);
  }
  const brand =
    '<a class="brand" href="/" aria-label="Star Cinema — Trang chủ"><img class="brand-mark" src="/assets/star-mark.svg" alt="" width="48" height="48"><span class="brand-name">STAR CINEMA</span></a>';
  function renderHeader() {
    const header = document.getElementById("site-header");
    if (!header) return;
    header.innerHTML = `<div class="container header-inner">${brand}<nav class="main-nav" id="main-nav" aria-label="Điều hướng chính"><a href="/" class="${document.body.dataset.page === "home" ? "active" : ""}">Trang chủ</a><a href="/movies.html">Phim</a>${me ? '<a href="/#my-tickets">Vé của tôi</a>' : ""}</nav><div class="header-actions">${me ? `<span class="user-name" title="${escape(me.fullName)}">${escape(me.fullName)}</span>${me.role === "ADMIN" ? '<a class="button outline" href="/admin.html">Quản trị ↗</a>' : ""}<button class="logout" id="logout">Đăng xuất</button>` : '<a href="/login.html">Đăng nhập</a><a href="/register.html" class="button outline">Đăng ký</a>'}</div><button class="menu-toggle" aria-label="Mở menu" aria-controls="main-nav" aria-expanded="false">☰</button></div>`;
    updateNavigation();
    header.querySelector(".menu-toggle").addEventListener("click", (e) => {
      const nav = header.querySelector("nav");
      const open = nav.classList.toggle("open");
      e.currentTarget.setAttribute("aria-expanded", String(open));
    });
    header.querySelector("#logout")?.addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      try {
        if (session?.refreshToken)
          await api("/api/auth/logout", {
            method: "POST",
            body: { refreshToken: session.refreshToken },
          });
      } catch {
      } finally {
        save(null);
        location.assign("/login.html");
      }
    });
  }
  function updateNavigation() {
    document.querySelectorAll(".main-nav a").forEach((link) => {
      const active = document.body.dataset.page === "home" &&
        (new URL(link.href).hash || "") === location.hash &&
        (new URL(link.href).pathname === "/movies.html") === (document.body.dataset.view === "movies");
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", updateNavigation);
  renderHeader();
  const footer = document.getElementById("site-footer");
  if (footer)
    footer.innerHTML = `<div class="compact-footer container"><span>© ${new Date().getFullYear()} Star Cinema</span><nav aria-label="Liên kết cuối trang"><a href="/movies.html">Tất cả phim</a><a href="/login.html">Tài khoản</a></nav></div>`;
  document
    .querySelectorAll(".close-modal")
    .forEach((button) =>
      button.addEventListener("click", () => button.closest("dialog").close()),
    );
  document.querySelectorAll("dialog").forEach((dialog) =>
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          dialog.close();
      }
    }),
  );
  const ready = (async () => {
    if (session?.accessToken) {
      try {
        me = await api("/api/account/me");
      } catch {
        save(null);
        me = null;
      }
    }
    renderHeader();
    return me;
  })();
  const money = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(value))
      : "";
  function poster(movie) {
    return typeof movie.posterUrl === "string" &&
      movie.posterUrl.startsWith("/assets/")
      ? movie.posterUrl
      : movie.id <= 3
        ? `/assets/poster-${movie.id}.jpg`
        : movie.id % 2
          ? "/assets/stars.jpg"
          : "/assets/galaxy.jpg";
  }
  return {
    api,
    escape,
    save,
    ready,
    toast,
    money,
    date,
    poster,
    get me() {
      return me;
    },
  };
})();

// Use one font for the entire heading when the display font lacks a letter.
// This cmap is read from the bundled Sugo font, not from system fonts.
(() => {
  const displayGlyphs = new Set(
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u00a1\u00a2\u00a3\u00a4\u00a5\u00a6\u00a8\u00a9\u00aa\u00ab\u00ac\u00ad\u00ae\u00b0\u00b1\u00b2\u00b3\u00b4\u00b5\u00b6\u00b7\u00b8\u00b9\u00ba\u00bb\u00bc\u00bd\u00be\u00bf\u00c0\u00c1\u00c2\u00c3\u00c4\u00c5\u00c6\u00c7\u00c8\u00c9\u00ca\u00cb\u00cc\u00cd\u00ce\u00cf\u00d0\u00d1\u00d2\u00d3\u00d4\u00d5\u00d6\u00d7\u00d8\u00d9\u00da\u00db\u00dc\u00dd\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5\u00e6\u00e7\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef\u00f1\u00f2\u00f3\u00f4\u00f5\u00f6\u00f7\u00f8\u00f9\u00fa\u00fb\u00fc\u00fd\u00ff\u0102\u0103\u0106\u0107\u0108\u0109\u010a\u010b\u010f\u0110\u0111\u0114\u0115\u0116\u0117\u0118\u011c\u011d\u011e\u011f\u0120\u0121\u0123\u0124\u0125\u0127\u0128\u012c\u0131\u0132\u0133\u0134\u0139\u013a\u013d\u013e\u0141\u0143\u0144\u014e\u014f\u0152\u0153\u0154\u0155\u015a\u015b\u015c\u015d\u015e\u0160\u0165\u0166\u0167\u0168\u0169\u016c\u016d\u016e\u016f\u0172\u0174\u0175\u0176\u0177\u0178\u0179\u017a\u017b\u017c\u017d\u017e\u0192\u01fd\u02c6\u02c7\u02d8\u02d9\u02da\u02db\u02dc\u03c0\u0456\u1e80\u1e81\u1e82\u1e83\u1e84\u1e85\u1ef2\u1ef3\u2012\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2024\u2025\u2026\u2030\u2039\u203a\u203c\u2044\u2070\u207f\u20ac\u2122\u2212\ufb00\ufb01\ufb02\ufb03\ufb04\ufb06",
  );
  function updateHeadings() {
    document.querySelectorAll("h1,h2").forEach((heading) => {
      const unsupported = [...heading.textContent].some(
        (char) => /\p{L}/u.test(char) && !displayGlyphs.has(char),
      );
      heading.classList.toggle("vietnamese-heading", unsupported);
    });
  }
  updateHeadings();
  new MutationObserver(updateHeadings).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
