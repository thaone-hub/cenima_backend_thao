/* Shared ticket dialog. One selected algorithm, one explicit issuance, one QR. */
window.TicketQr = (() => {
  let current = null, boundDialog = null;

  function active(state) {
    return current === state && state.dialog.open;
  }

  async function open(ticketId) {
    const { api, date } = Space;
    const dialog = document.getElementById("qr-dialog");
    const content = document.getElementById("qr-content");
    if (boundDialog !== dialog) {
      dialog.addEventListener("close", () => {
        if (dialog.open) return;
        current = null;
        content.replaceChildren();
      });
      boundDialog = dialog;
    }
    const state = { dialog, version: 0, pending: false, algorithms: [] };
    current = state;
    dialog.setAttribute("aria-labelledby", "qr-title");
    content.innerHTML = `
      <p class="muted">Chọn thuật toán ký vé, sau đó bấm Phát hành QR.</p>
      <form id="qr-issue-form" class="qr-issue-form">
        <label for="qr-algorithm">Thuật toán ký vé</label>
        <select id="qr-algorithm" disabled></select>
        <button id="qr-issue" class="button gold" type="submit" disabled>Phát hành QR</button>
      </form>
      <p id="qr-message" class="qr-status" role="status" aria-live="polite"></p>
      <button id="qr-retry" class="button outline" type="button" hidden>Thử tải lại</button>
      <section id="qr-result" class="qr-result" aria-label="Vé đã phát hành" hidden></section>`;
    const select = content.querySelector("#qr-algorithm");
    const issueButton = content.querySelector("#qr-issue");
    const message = content.querySelector("#qr-message");
    const retry = content.querySelector("#qr-retry");
    const resultBox = content.querySelector("#qr-result");
    if (!dialog.open) dialog.showModal();

    function clearResult() {
      resultBox.hidden = true;
      resultBox.replaceChildren();
    }
    function selectable() {
      return state.algorithms.some((item) => item.algorithm === select.value && item.available === true);
    }
    select.addEventListener("change", () => {
      ++state.version;
      state.pending = false;
      clearResult();
      issueButton.disabled = !selectable();
      message.textContent = "Bấm Phát hành QR để tạo mã theo thuật toán đã chọn.";
    });

    async function load() {
      const version = ++state.version;
      clearResult();
      state.pending = false;
      state.algorithms = [];
      select.replaceChildren();
      select.disabled = issueButton.disabled = true;
      retry.hidden = true;
      message.textContent = "Đang tải thông tin vé và thuật toán…";
      try {
        const [ticket, algorithms] = await Promise.all([
          api(`/api/tickets/${ticketId}`), api("/api/tickets/algorithms"),
        ]);
        if (!active(state) || version !== state.version) return;
        state.algorithms = algorithms;
        for (const item of algorithms) {
          const option = document.createElement("option");
          option.value = item.algorithm;
          option.textContent = item.algorithm + (item.available ? "" : " — Chưa khả dụng");
          option.disabled = item.available !== true;
          select.append(option);
        }
        const first = algorithms.find((item) => item.available === true);
        select.value = first?.algorithm || "";
        select.disabled = !first;
        const usable = ticket.status === "UNUSED";
        issueButton.disabled = !first || !usable;
        if (!usable) select.disabled = true;
        message.textContent = !usable ? "Vé đã sử dụng hoặc đã hủy, không thể phát hành QR."
          : first ? "Chưa phát hành QR. Chọn thuật toán rồi bấm Phát hành QR."
          : "Chưa có thuật toán khả dụng. Vui lòng thử lại sau.";
        retry.hidden = !!first && usable;
      } catch (error) {
        if (!active(state) || version !== state.version) return;
        message.textContent = error.message;
        retry.hidden = false;
      }
    }
    retry.addEventListener("click", load);
    content.querySelector("#qr-issue-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (issueButton.disabled || state.pending || !selectable()) return;
      const algorithm = select.value, version = ++state.version;
      state.pending = true;
      issueButton.disabled = true;
      clearResult();
      message.textContent = `Đang phát hành QR ${algorithm}…`;
      try {
        const result = await api(`/api/tickets/${ticketId}/token`, {
          method: "POST", body: { algorithm },
        });
        if (!active(state) || version !== state.version) return;
        if (result.algorithm !== algorithm || String(result.ticket.ticketId) !== String(ticketId))
          throw new Error("Kết quả không khớp vé hoặc thuật toán đã chọn. Vui lòng thử lại.");
        const imageUrl = `data:image/png;base64,${result.qr.pngBase64}`;
        const image = document.createElement("img");
        image.className = "qr-image";
        image.src = imageUrl;
        image.alt = `Mã QR vé ${result.ticket.movieTitle}, ${result.algorithm}`;
        const info = document.createElement("p");
        info.className = "qr-note";
        info.textContent = `${result.ticket.movieTitle}\n${date(result.ticket.startTime)} · ${result.ticket.startTime.slice(11, 16)}\n${result.ticket.roomName} · Ghế ${result.ticket.seatCode}\nMã vé: ${result.ticket.ticketCode}`;
        const meta = document.createElement("p");
        meta.className = "small muted";
        const expiry = new Date(result.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        meta.textContent = `JWT ký số ${result.algorithm} · Hạn vé: ${expiry} (giờ Việt Nam). `
          + (result.qr.mode === "REFERENCE" ? "QR chứa mã tham chiếu đến JWT. " : "QR chứa JWT của vé. ")
          + "Mỗi vé chỉ check-in một lần, kể cả khi phát hành bằng thuật toán khác.";
        const download = document.createElement("a");
        download.className = "button outline";
        download.href = imageUrl;
        download.download = `star-cinema-ticket-${result.ticket.ticketId}.png`;
        download.textContent = "Tải mã QR";
        const details = document.createElement("details");
        details.className = "qr-token-details";
        const summary = document.createElement("summary");
        summary.textContent = "Xem JWT đã ký";
        const token = document.createElement("textarea");
        token.readOnly = true;
        token.rows = 4;
        token.setAttribute("aria-label", "JWT vé đã ký");
        token.spellcheck = false;
        token.value = result.token;
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "button outline";
        copy.textContent = "Sao chép JWT";
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(result.token);
            if (active(state) && version === state.version) message.textContent = "Đã sao chép JWT.";
          } catch {
            if (!active(state) || version !== state.version) return;
            token.focus(); token.select();
            message.textContent = "Không thể tự sao chép. Nhấn Ctrl+C để sao chép JWT đã chọn.";
          }
        });
        details.append(summary, token, copy);
        resultBox.replaceChildren(image, info, meta, download, details);
        resultBox.hidden = false;
        message.textContent = `Đã phát hành QR ${result.algorithm}.`;
      } catch (error) {
        if (active(state) && version === state.version) message.textContent = error.message;
      } finally {
        if (active(state) && version === state.version) {
          state.pending = false;
          issueButton.disabled = !selectable();
        }
      }
    });
    await load();
  }
  return { open };
})();
