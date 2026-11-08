(() => {
  const form = document.getElementById("auth-form"),
    message = document.getElementById("form-message");
  document.querySelectorAll(".password-toggle").forEach((button) =>
    button.addEventListener("click", () => {
      const input = button.previousElementSibling,
        show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Ẩn" : "Hiện";
      button.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    }),
  );
  if (new URLSearchParams(location.search).has("registered")) {
    message.textContent = "Đăng ký thành công. Đăng nhập để bắt đầu đặt vé.";
    message.classList.add("success");
    message.hidden = false;
  }
  document.getElementById("forgot-password")?.addEventListener("click", () => {
    message.textContent =
      "Vui lòng liên hệ quản trị viên để được hỗ trợ khôi phục tài khoản. Website chưa hỗ trợ gửi email đặt lại mật khẩu.";
    message.classList.remove("success");
    message.hidden = false;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("[type=submit]");
    message.hidden = true;
    message.classList.remove("success");
    if (document.body.dataset.page === "register") {
      data.fullName = `${data.lastName.trim()} ${data.firstName.trim()}`;
      if (
        !data.lastName.trim() ||
        !data.firstName.trim() ||
        data.fullName.length > 100
      ) {
        message.textContent = "Vui lòng nhập họ và tên, tối đa 100 ký tự.";
        message.hidden = false;
        return;
      }
      delete data.lastName;
      delete data.firstName;
    }
    if (
      document.body.dataset.page === "register" &&
      data.password !== data.confirmPassword
    ) {
      message.textContent = "Mật khẩu nhập lại chưa khớp.";
      message.hidden = false;
      return;
    }
    if (new TextEncoder().encode(data.password).length > 72) {
      message.textContent =
        "Mật khẩu tối đa 72 byte. Hãy dùng mật khẩu ngắn hơn.";
      message.hidden = false;
      return;
    }
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Đang xử lý…";
    try {
      if (document.body.dataset.page === "register") {
        delete data.confirmPassword;
        await Space.api("/api/auth/register", { method: "POST", body: data });
        location.assign("/login.html?registered=1");
      } else {
        const session = await Space.api("/api/auth/login", {
          method: "POST",
          body: {
            email: data.email.trim().toLowerCase(),
            password: data.password,
          },
        });
        Space.save(session);
        const account = await Space.api("/api/account/me");
        const next = new URLSearchParams(location.search).get("next");
        location.assign(next === "tickets" ? "/#my-tickets" : account.role === "ADMIN" ? "/admin.html" : "/#movies");
      }
    } catch (error) {
      message.textContent = error.message;
      message.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
})();
