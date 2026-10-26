const $ = (id) => document.getElementById(id);
const page = document.body.dataset.page;
let demo = false;
let busy = false;
let verifiedValue = null;
let consumed = false;

function message(text, error = false) {
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
}
function updateButtons() {
  document.querySelectorAll("[data-action]").forEach((button) => { button.disabled = busy; });
  if ($("check-in")) $("check-in").disabled = busy || consumed || verifiedValue !== $("value").value.trim();
  $("account").disabled = busy;
  $("access-token").disabled = busy;
  if ($("qr-file")) $("qr-file").disabled = busy;
}
async function api(path, body) {
  const headers = { Accept: "application/json" };
  if (demo && $("account").value) headers["X-User-Id"] = $("account").value;
  const access = $("access-token").value.trim();
  if (!demo && access) headers.Authorization = `Bearer ${access}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", headers,
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", credentials: "same-origin" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} · ${data?.code || "REQUEST_FAILED"}: ${data?.message || "Không thực hiện được yêu cầu"}`);
  return data;
}
async function run(action) {
  if (busy) return;
  busy = true; updateButtons(); message("Đang xử lý…");
  try { await action(); } catch (error) { message(error instanceof Error ? error.message : String(error || "Không đọc được mã QR"), true); }
  finally { busy = false; updateButtons(); }
}
function renderTicket(ticket) {
  $("movie-title").textContent = ticket.movieTitle;
  const rows = [ ["Mã ticket", ticket.ticketId], ["Mã vé", ticket.ticketCode], ["Suất chiếu", ticket.startTime?.replace("T", " · ") + " (giờ Việt Nam)"],
    ["Phòng", ticket.roomName], ["Ghế", ticket.seatCode], ["Trạng thái", ticket.status], ["Đã check-in", ticket.usedAt?.replace("T", " · ") || "Chưa sử dụng"] ];
  $("ticket-details").replaceChildren();
  for (const [label, value] of rows) {
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    $("ticket-details").append(dt, dd);
  }
}
function clearOutput() {
  verifiedValue = null; consumed = false;
  if ($("verification-output")) $("verification-output").hidden = true;
  if ($("ticket-output")) $("ticket-output").hidden = true;
  if ($("empty-ticket")) $("empty-ticket").hidden = false;
  if ($("jwt")) $("jwt").value = "";
  if ($("qr-image")) $("qr-image").removeAttribute("src");
  updateButtons();
}
async function identity() {
  try {
    const accounts = await api("/api/demo/accounts");
    if (!Array.isArray(accounts)) return;
    demo = true;
    $("demo-warning").hidden = false;
    $("demo-account-label").hidden = false;
    $("integrated-identity").hidden = true;
    for (const account of accounts) {
      const option = document.createElement("option"); option.value = account.userId;
      option.textContent = `${account.fullName} · ${account.role} · #${account.userId}`;
      if ((page === "checkin" && account.role === "STAFF") || (page === "ticket" && account.role === "CUSTOMER")) option.selected = true;
      $("account").append(option);
    }
  } catch { /* Integrated profile uses the actual login module's access token. */ }
  $("account").addEventListener("change", clearOutput);
  $("access-token").addEventListener("input", clearOutput);
}
async function setupTicket() {
  async function providers() {
    const algorithms = await api("/api/tickets/algorithms");
    $("algorithm").replaceChildren();
    for (const item of algorithms) {
      const option = document.createElement("option"); option.value = item.algorithm;
      option.textContent = `${item.algorithm} · ${item.available ? "Sẵn sàng" : "Chưa kết nối"}`;
      option.disabled = !item.available; $("algorithm").append(option);
    }
    const active = algorithms.find((item) => item.available);
    $("algorithm").value = active?.algorithm || "";
    $("provider-status").textContent = active ? "Chỉ những thuật toán có đủ signer và verifier mới có thể phát hành." : "Chưa có provider ký/xác minh hoạt động.";
  }
  function ticketId() {
    const raw = $("ticket-id").value;
    if (!/^[1-9]\d*$/.test(raw) || Number(raw) > 2147483647) throw new Error("Ticket ID phải là số nguyên dương hợp lệ.");
    return raw;
  }
  $("ticket-id").addEventListener("input", clearOutput);
  $("view").addEventListener("click", () => run(async () => {
    clearOutput(); const ticket = await api(`/api/tickets/${ticketId()}`);
    renderTicket(ticket); $("ticket-output").hidden = false; $("empty-ticket").hidden = true; $("qr-output").hidden = true;
    message("Đã lấy thông tin vé từ database.");
  }));
  $("ticket-form").addEventListener("submit", (event) => { event.preventDefault(); run(async () => {
    clearOutput(); if (!$("algorithm").value) throw new Error("Chọn một thuật toán đã có provider.");
    const result = await api(`/api/tickets/${ticketId()}/token`, { algorithm: $("algorithm").value });
    renderTicket(result.ticket); $("ticket-output").hidden = false; $("empty-ticket").hidden = true; $("qr-output").hidden = false;
    $("qr-image").src = `data:image/png;base64,${result.qr.pngBase64}`;
    $("qr-mode").textContent = result.qr.mode === "JWT" ? "QR chứa JWT trực tiếp" : "QR chứa mã tham chiếu · lưu trong SQL Server";
    $("expiry").textContent = `Hết hạn: ${new Intl.DateTimeFormat("vi-VN", {dateStyle:"medium",timeStyle:"medium",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(result.expiresAt))} · Giờ Việt Nam`;
    $("jwt").value = result.token; message("Đã phát hành vé. Phát hành lại không gia hạn thời gian sử dụng.");
  }); });
  $("copy-token").addEventListener("click", () => run(async () => {
    await navigator.clipboard.writeText($("jwt").value); message("Đã sao chép JWT.");
  }));
  if (!demo) {
    let providerRefresh;
    $("provider-status").textContent = "Nhập access token đăng nhập để tải các thuật toán tích hợp.";
    $("algorithm").replaceChildren(new Option("Cần access token đăng nhập", ""));
    $("access-token").addEventListener("input", () => {
      clearTimeout(providerRefresh);
      $("algorithm").replaceChildren(new Option("Đang chờ xác thực…", ""));
      if (!$("access-token").value.trim()) return;
      providerRefresh = setTimeout(() => run(async () => { await providers(); message("Đã tải thuật toán tích hợp. Có thể xem hoặc phát hành vé."); }), 250);
    });
  } else {
    try { await providers(); } catch (error) { message(error.message, true); }
  }
}
async function setupCheckin() {
  let scanner = null;
  let handled = false;
  const { default: QrScanner } = await import("./vendor/qr-scanner.min.js");
  function invalidate() { verifiedValue = null; consumed = false; $("verification-output").hidden = true; updateButtons(); }
  async function validate(checkIn) {
    const value = $("value").value.trim();
    if (!value) throw new Error("Nhập JWT hoặc mã tham chiếu trước.");
    try {
      const result = await api(`/api/tickets/${checkIn ? "check-in" : "verify"}`, { value });
      renderTicket(result.ticket); $("verification-output").hidden = false;
      $("verification-state").textContent = result.checkedIn ? "Đã check-in · USED" : "Vé hợp lệ · chưa sử dụng";
      verifiedValue = value; consumed = result.checkedIn;
      message(result.checkedIn ? "Check-in thành công. Vé đã được sử dụng." : "Xác minh thành công. Vé vẫn chưa sử dụng; bấm Check-in để đón khách.");
    } catch (error) { invalidate(); throw error; }
  }
  $("value").addEventListener("input", invalidate);
  $("verify-form").addEventListener("submit", (event) => { event.preventDefault(); run(() => validate(false)); });
  $("check-in").addEventListener("click", () => run(() => validate(true)));
  $("start-camera").addEventListener("click", () => run(async () => {
    if (!window.isSecureContext) throw new Error("Camera cần HTTPS hoặc localhost. Xem README để kết nối bằng điện thoại.");
    $("value").value = ""; invalidate();
    handled = false;
    if (!scanner) scanner = new QrScanner($("camera"), (result) => {
      if (handled || busy) return;
      handled = true; scanner.stop(); $("camera-status").textContent = "Đã đọc mã. Camera đã dừng; đang xác minh vé.";
      $("value").value = result.data; invalidate(); run(() => validate(false));
    }, { preferredCamera: "environment", returnDetailedScanResult: true, maxScansPerSecond: 5 });
    await scanner.start(); $("camera-status").textContent = "Đưa mã QR vào khung hình."; message("Camera đang quét. Sau khi đọc được mã, hệ thống chỉ verify.");
  }));
  $("stop-camera").addEventListener("click", () => { scanner?.stop(); $("camera-status").textContent = "Camera đã tắt."; });
  $("qr-file").addEventListener("change", (event) => {
    const file = event.target.files[0]; if (!file) return;
    scanner?.stop();
    $("value").value = ""; invalidate();
    run(async () => {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      $("value").value = result.data; invalidate(); await validate(false);
    }).finally(() => { $("qr-file").value = ""; });
  });
  window.addEventListener("pagehide", () => scanner?.destroy());
  updateButtons();
}
await identity();
if (page === "ticket") await setupTicket();
else await setupCheckin().catch((error) => message(error instanceof Error ? error.message : String(error), true));
