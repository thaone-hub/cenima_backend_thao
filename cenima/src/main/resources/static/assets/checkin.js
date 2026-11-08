
(async () => {
  const { api, escape: e, date } = Space,
    me = await Space.ready,
    guard = document.getElementById("checkin-guard");

  if (!me || !["ADMIN", "STAFF"].includes(me.role)) {
    guard.innerHTML =
      '<h2>Quầy check-in dành cho nhân viên và admin.</h2><a class="button gold" href="/login.html">Đăng nhập ↗</a>';
    return;
  }

  guard.hidden = true;
  document.getElementById("checkin-content").hidden = false;

  const input = document.getElementById("ticket-value"),
    confirmButton = document.getElementById("confirm-checkin"),
    message = document.getElementById("checkin-message"),
    output = document.getElementById("verified-ticket");

  let verified = null,
    busy = false,
    scanner = null;

  function invalidate() {
    verified = null;
    confirmButton.disabled = true;
    output.hidden = true;
  }

  function error(text) {
    message.textContent = text;
    message.classList.remove("success");
    message.hidden = false;
  }

  async function validate(checkIn) {
    if (busy) return;

    const value = input.value.trim();

    if (!value) {
      error("Vui lòng nhập hoặc quét mã vé.");
      return;
    }

    if (checkIn && verified !== value) {
      invalidate();
      return;
    }

    busy = true;

    document
      .querySelectorAll("#verify-form button")
      .forEach((button) => (button.disabled = true));

    message.hidden = true;

    try {
      const result = await api(
        `/api/tickets/${checkIn ? "check-in" : "verify"}`,
        {
          method: "POST",
          body: { value },
        },
      );

      const ticket = result.ticket;

      output.innerHTML = `
        <div class="booking-area">
          <span class="badge">
            ${result.checkedIn ? "Đã check-in" : "Vé hợp lệ"}
          </span>
          <h3>${e(ticket.movieTitle)}</h3>
          <p>
            ${date(ticket.startTime)} ·
            ${e(ticket.startTime.slice(11, 16))}
            <br>
            ${e(ticket.roomName)} / Ghế ${e(ticket.seatCode)}
          </p>
        </div>
      `;

      output.hidden = false;
      verified = result.checkedIn ? null : value;

      message.textContent = result.checkedIn
        ? "Check-in thành công. Vé đã được sử dụng."
        : "Vé hợp lệ. Kiểm tra thông tin rồi bấm Check-in để đón khách.";

      message.classList.add("success");
      message.hidden = false;
    } catch (err) {
      invalidate();
      error(err.message);
    } finally {
      busy = false;

      document.querySelector(
        "#verify-form [type=submit]",
      ).disabled = false;

      confirmButton.disabled = !verified;
    }
  }

  input.addEventListener("input", invalidate);

  document
    .getElementById("verify-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      validate(false);
    });

  confirmButton.addEventListener("click", () => validate(true));

  const { default: QrScanner } = await import(
    "/demo/vendor/qr-scanner.min.js"
  );

  // QUÉT QR BẰNG CAMERA
  document
    .getElementById("start-camera")
    .addEventListener("click", async () => {
      try {
        if (busy) return;

        invalidate();

        if (!scanner) {
          scanner = new QrScanner(
            document.getElementById("camera"),
            (result) => {
              if (busy) return;

              scanner.stop();
              input.value = result.data;
              invalidate();
              validate(false);
            },
            {
              preferredCamera: "environment",
              returnDetailedScanResult: true,
              maxScansPerSecond: 5,
            },
          );
        }

        await scanner.start();

        document.getElementById("camera-message").textContent =
          "Đưa mã QR vào khung hình.";
      } catch {
        error(
          "Không mở được camera. Kiểm tra quyền camera, hoặc chọn ảnh QR.",
        );
      }
    });

  document
    .getElementById("stop-camera")
    .addEventListener("click", () => {
      scanner?.stop();

      document.getElementById("camera-message").textContent =
        "Camera đã tắt.";
    });

  // QUÉT QR TỪ FILE ẢNH - ĐÃ SỬA
  
  // QUÉT QR TỪ FILE ẢNH
  document
    .getElementById("qr-file")
    .addEventListener("change", async (event) => {
      const file = event.target.files?.[0];

      if (!file || busy) return;

      scanner?.stop();
      invalidate();

      input.value = "";
      message.hidden = true;

      try {
        if (file.size === 0) {
          throw new Error("File ảnh rỗng.");
        }

        if (file.type && !file.type.startsWith("image/")) {
          throw new Error("Vui lòng chọn một file ảnh.");
        }

        // Đọc file thành data URL.
        // CSP của Star Cinema cho phép data: nhưng chặn blob:.
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            resolve(reader.result);
          };

          reader.onerror = () => {
            reject(
              reader.error || new Error("Không đọc được file ảnh.")
            );
          };

          reader.readAsDataURL(file);
        });

        // Nạp ảnh từ data URL được CSP cho phép.
        const img = new Image();
        img.src = dataUrl;

        await img.decode();

        if (!img.naturalWidth || !img.naturalHeight) {
          throw new Error("Kích thước ảnh không hợp lệ.");
        }

        // Giải mã nội dung QR.
        const result = await QrScanner.scanImage(img, {
          returnDetailedScanResult: true,
          disallowCanvasResizing: true,
        });

        if (!result.data) {
          throw new Error("QR không chứa dữ liệu.");
        }

        console.log("QR decoded:", {
          length: result.data.length,
          isReference: result.data.startsWith("etkt:"),
        });

        // Điền mã vé và tự động Verify.
        input.value = result.data;
        await validate(false);

      } catch (err) {
        console.error("QR image scan failed:", err);

        const detail =
          err instanceof Error ? err.message : String(err);

        error(
          detail === "No QR code found"
            ? "Đọc được ảnh nhưng không tìm thấy mã QR."
            : `Không giải mã được ảnh QR: ${detail}`
        );

      } finally {
        event.target.value = "";
      }
    });


  window.addEventListener(
    "pagehide",
    () => scanner?.destroy(),
  );
})();
