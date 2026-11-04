(async () => {
  const { api, escape: e, date, toast } = Space;
  const guard = document.getElementById("admin-guard");
  const me = await Space.ready;
  if (!me || me.role !== "ADMIN") {
    guard.innerHTML = `<h2>${me ? "Khu vực dành cho quản trị viên" : "Vui lòng đăng nhập"}</h2><p>${me ? "Tài khoản của bạn không có quyền quản trị." : "Đăng nhập bằng tài khoản admin để tiếp tục."}</p><a class="button gold" href="${me ? "/" : "/login.html"}">${me ? "Về trang chủ" : "Đăng nhập"}</a>`;
    return;
  }
  guard.hidden = true;
  document.getElementById("admin-content").hidden = false;
  let movies = [];
  const modal = document.getElementById("edit-dialog"),
    form = document.getElementById("movie-form");
  const statusLabel = (status) =>
    ({ 0: "Ngừng chiếu", 1: "Đang chiếu", 2: "Sắp chiếu" })[status];
  async function load() {
    try {
      const [stats, accounts, allMovies] = await Promise.all([
        api("/api/admin/stats"),
        api("/api/admin/users"),
        api("/api/admin/movies"),
      ]);
      movies = allMovies;
      document.getElementById("stats").innerHTML = [
        ["Thành viên", stats.users],
        ["Bộ phim", stats.movies],
        ["Đơn đặt vé", stats.bookings],
        ["Vé điện tử", stats.tickets],
      ]
        .map(
          ([label, value]) =>
            `<article class="stat-card"><strong>${value}</strong><span>${label}</span></article>`,
        )
        .join("");
      document.getElementById("users-body").innerHTML = accounts
        .map(
          (account) =>
            `<tr><td>${e(account.fullName)}</td><td>${e(account.email)}</td><td><span class="badge ${account.role === "ADMIN" ? "admin" : ""}">${account.role === "USER" ? "Người dùng" : account.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}</span></td><td><span class="${account.active ? "status-active" : "status-off"}">${account.active ? "Đang hoạt động" : "Đã khóa"}</span></td><td>${account.role === "ADMIN" ? '<span class="small muted">Được bảo vệ</span>' : `<button class="button subtle" data-user="${account.id}" data-active="${!account.active}">${account.active ? "Khóa tài khoản" : "Mở khóa"}</button>`}</td></tr>`,
        )
        .join("");
      document.querySelectorAll("[data-user]").forEach((button) =>
        button.addEventListener("click", async () => {
          const active = button.dataset.active === "true";
          if (
            !confirm(
              active
                ? "Mở khóa tài khoản này?"
                : "Khóa tài khoản này? Người dùng sẽ không thể đăng nhập hoặc dùng API.",
            )
          )
            return;
          button.disabled = true;
          try {
            await api(`/api/admin/users/${button.dataset.user}/active`, {
              method: "PATCH",
              body: { active },
            });
            toast(active ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
            await load();
          } catch (error) {
            toast(error.message);
            button.disabled = false;
          }
        }),
      );
      document.getElementById("movies-body").innerHTML = movies
        .map(
          (movie) =>
            `<tr><td>${e(movie.title)}</td><td>${movie.duration} phút</td><td>${date(movie.releaseDate)}</td><td><span class="badge">${statusLabel(movie.status)}</span></td><td><button class="button subtle" data-edit="${movie.id}">Chỉnh sửa ↗</button></td></tr>`,
        )
        .join("");
      document
        .querySelectorAll("[data-edit]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            editMovie(
              movies.find((movie) => movie.id === Number(button.dataset.edit)),
            ),
          ),
        );
    } catch (error) {
      toast(error.message);
    }
  }
  function editMovie(movie) {
    form.reset();
    form.elements.id.value = movie?.id || "";
    document.getElementById("edit-title").textContent = movie
      ? "Chỉnh sửa phim"
      : "Thêm phim";
    document.getElementById("edit-message").hidden = true;
    for (const key of [
      "title",
      "description",
      "duration",
      "releaseDate",
      "director",
      "posterUrl",
      "status",
    ])
      if (movie) form.elements[key].value = movie[key] ?? "";
    modal.showModal();
  }
  document
    .getElementById("add-movie")
    .addEventListener("click", () => editMovie(null));
  document.querySelectorAll("[data-admin-tab]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-admin-tab]")
        .forEach((tab) =>
          tab.setAttribute("aria-selected", String(tab === button)),
        );
      const films = button.dataset.adminTab === "movies";
      document.getElementById("admin-users").hidden = films;
      document.getElementById("admin-movies").hidden = !films;
      document.getElementById("add-movie").hidden = !films;
    }),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(form));
    const id = input.id;
    delete input.id;
    input.duration = Number(input.duration);
    input.status = Number(input.status);
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    const message = document.getElementById("edit-message");
    message.hidden = true;
    try {
      await api(id ? `/api/admin/movies/${id}` : "/api/admin/movies", {
        method: id ? "PUT" : "POST",
        body: input,
      });
      modal.close();
      toast("Đã lưu thông tin phim.");
      await load();
    } catch (error) {
      message.textContent = error.message;
      message.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
  await load();
})();
