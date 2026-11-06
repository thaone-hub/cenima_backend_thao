
import {
  $,
  api,
  dateTime,
  requireLogin,
  initNav,
  setMessage
} from "./api.js";

initNav();

const ticketId = Number(
  new URLSearchParams(
    location.search
  ).get("ticketId")
);

const issueButton = $("#issue-token");

// Lay thong tin ve va danh sach thuat toan
async function load() {
  if (!requireLogin()) {
    return;
  }

  if (
    !Number.isInteger(ticketId) ||
    ticketId < 1
  ) {
    setMessage(
      "#message",
      "Thiếu ticketId. Mở từ trang đặt vé."
    );
    return;
  }

  try {
    const [ticket, algorithms] =
      await Promise.all([
        api(`/api/tickets/${ticketId}`),
        api("/api/tickets/algorithms")
      ]);

    $("#ticket-heading").textContent =
      `${ticket.movieTitle} · Ghế ${ticket.seatCode}`;

    $("#ticket-info").textContent =
      `${ticket.roomName}` +
      ` · ${dateTime(ticket.startTime)}` +
      ` · Vé #${ticket.ticketId}` +
      ` · ${ticket.status}`;

    const select = $("#algorithm");

    select.replaceChildren();

    // Hien thi thuat toan JWT
    for (const item of algorithms) {
      const option = new Option(
        `${item.algorithm}${
          item.available
            ? " · Sẵn sàng"
            : " · Chưa hỗ trợ"
        }`,
        item.algorithm
      );

      option.disabled = !item.available;

      select.add(option);
    }

    const firstReady = algorithms.find(
      item => item.available
    );

    if (firstReady) {
      select.value = firstReady.algorithm;
      issueButton.disabled = false;
    } else {
      setMessage(
        "#message",
        "Chưa có thuật toán ký nào sẵn sàng."
      );
    }

  } catch (error) {
    setMessage(
      "#message",
      error.message
    );
  }
}

// Phat hanh JWT va QR
issueButton.addEventListener(
  "click",
  async () => {
    issueButton.disabled = true;

    setMessage(
      "#message",
      "Đang phát hành JWT...",
      "info"
    );

    try {
      const data = await api(
        `/api/tickets/${ticketId}/token`,
        {
          method: "POST",
          body: {
            algorithm: $("#algorithm").value
          }
        }
      );

      $("#issued").hidden = false;

      // QR image duoc backend tra ve Base64
      $("#qr-image").src =
        `data:image/png;base64,${
          data.qr.pngBase64
        }`;

      $("#qr-mode").textContent =
        data.qr.mode === "JWT"
          ? "QR chứa JWT"
          : "QR chứa mã tham chiếu (server lưu JWT)";

      $("#token").value = data.token;

      $("#expires").textContent =
        `Hết hạn: ${dateTime(data.expiresAt)}`;

      setMessage(
        "#message",
        "Phát hành JWT + QR thành công!",
        "success"
      );

    } catch (error) {
      setMessage(
        "#message",
        error.message
      );
    } finally {
      issueButton.disabled = false;
    }
  }
);

// Sao chep JWT
$("#copy-token").addEventListener(
  "click",
  async () => {
    const token = $("#token").value;

    if (!token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        token
      );

      setMessage(
        "#message",
        "Đã sao chép JWT.",
        "success"
      );

    } catch {
      $("#token").select();
      document.execCommand("copy");
    }
  }
);

// Tai du lieu khi mo trang
load();
