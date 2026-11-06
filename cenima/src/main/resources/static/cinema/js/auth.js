
import {
  $,
  api,
  setToken,
  getToken,
  setMessage,
  initNav
} from "./api.js";

initNav();

const form = $("#login-form");
const submit = $("#login-submit");

const next = new URLSearchParams(
  location.search
).get("next");

const destination =
  next?.startsWith("/cinema/") &&
  !next.startsWith("//")
    ? next
    : "/cinema/index.html";

if (getToken()) {
  $("#already-logged").hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submit.disabled = true;

  setMessage(
    "#message",
    "Đang đăng nhập...",
    "info"
  );

  try {
    const data = await api(
      "/api/auth/login",
      {
        method: "POST",
        auth: false,
        body: {
          email: $("#email").value.trim(),
          password: $("#password").value
        }
      }
    );

    if (!data?.accessToken) {
      throw new Error(
        "Backend không trả về accessToken."
      );
    }

    setToken(data.accessToken);

    location.replace(destination);

  } catch (error) {
    setMessage("#message", error.message);
    submit.disabled = false;
  }
});
