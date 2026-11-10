(async () => {
  const { api, escape: e, money, date, poster } = Space;
  const grid = document.getElementById("movie-grid");
  const catalogue = fetch("/assets/ncc-catalog.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("Catalogue unavailable");
      return response.json();
    })
    .catch(() => null);
  let movies = [],
    status = 1,
    loadId = 0;
  function renderMovies() {
    const actionLabel = "Xem chi tiết";
    const query = document
      .getElementById("movie-search")
      .value.trim()
      .toLocaleLowerCase("vi");
    const visible = movies.filter((movie) =>
      movie.title.toLocaleLowerCase("vi").includes(query),
    );
    grid.innerHTML = visible.length
      ? visible
          .map(
            (movie) =>
              `<article class="movie-card"><div class="poster"><img src="${e(poster(movie))}" alt="${e(movie.title)}" loading="lazy"><button class="poster-preview" data-movie="${e(movie.id)}" aria-label="${actionLabel} ${e(movie.title)}"></button><span class="poster-type">${e(movie.ageRating || (status === 1 ? "ĐANG CHIẾU" : "SẮP CHIẾU"))}</span><button class="poster-action" data-movie="${e(movie.id)}">${actionLabel}</button></div><p class="movie-meta">${movie.duration} PHÚT &nbsp; / &nbsp; ${e(movie.genre || "2D")}</p><h3><button class="movie-title-button" data-movie="${e(movie.id)}">${e(movie.title)}</button></h3><p class="movie-date">Khởi chiếu: ${date(movie.releaseDate)}</p></article>`,
          )
          .join("")
      : `<p class="empty-state">${query ? "Không tìm thấy phim phù hợp." : "Chưa có phim trong danh mục này."}</p>`;
    grid.querySelectorAll("img").forEach((image) =>
      image.addEventListener(
        "error",
        () => {
          if (!image.src.endsWith("/assets/galaxy.jpg"))
            image.src = "/assets/galaxy.jpg";
        },
        { once: true },
      ),
    );
    grid
      .querySelectorAll("[data-movie]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          openMovie(
            movies.find((movie) => String(movie.id) === button.dataset.movie),
          ),
        ),
      );
  }
  async function loadMovies() {
    const id = ++loadId;
    grid.innerHTML = '<p class="empty-state">Đang tải danh sách phim…</p>';
    try {
      const source = await catalogue;
      let result;
      if (source?.movies?.length) {
        result = source.movies.filter((movie) => movie.status === status);
      } else {
        result = await api(`/api/movies?status=${status}`);
      }
      if (id !== loadId) return;
      movies = result;
      renderMovies();
    } catch (error) {
      if (id === loadId) {
        grid.replaceChildren();
        const box = document.createElement("p");
        box.className = "empty-state";
        box.textContent = error.message;
        grid.append(box);
      }
    }
  }
  document.querySelectorAll("[data-status]").forEach((button) =>
    button.addEventListener("click", () => {
      status = Number(button.dataset.status);
      document
        .querySelectorAll("[data-status]")
        .forEach((tab) =>
          tab.setAttribute("aria-selected", String(tab === button)),
        );
      grid.setAttribute("aria-labelledby", button.id);
      loadMovies();
    }),
  );
  document.querySelectorAll("[role=tablist]").forEach((list) =>
    list.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const buttons = [...list.querySelectorAll("[role=tab]")];
      const i = buttons.indexOf(document.activeElement);
      const next =
        buttons[
          (i + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
            buttons.length
        ];
      next.focus();
      next.click();
      event.preventDefault();
    }),
  );
  document
    .getElementById("movie-search")
    .addEventListener("input", renderMovies);
  const dialog = document.getElementById("movie-dialog");
  const confirmDialog = document.getElementById("booking-confirm-dialog");
  let bookingMovies = [], bookingLoad = 0, ticketLoad = 0;
  async function loadBookingMovies() {
    const version = ++bookingLoad;
    const select = document.getElementById("booking-movie");
    const button = document.getElementById("choose-showtime");
    const message = document.getElementById("ticket-booking-message");
    select.disabled = button.disabled = true;
    message.textContent = "Đang tải danh sách phim tại Star Cinema…";
    try {
      const lists = await Promise.all([api("/api/movies?status=1"), api("/api/movies?status=2")]);
      if (version !== bookingLoad) return;
      bookingMovies = lists.flat();
      select.innerHTML = '<option value="">Chọn phim muốn đặt vé</option>' + bookingMovies
        .map((movie) => `<option value="${e(movie.id)}">${e(movie.title)}</option>`).join("");
      select.disabled = !bookingMovies.length;
      message.textContent = bookingMovies.length
        ? "Chỉ đặt vé cho phim có suất chiếu tại Star Cinema. Phim tham khảo từ NCC trên trang chủ thuộc danh mục riêng."
        : "Chưa có phim được mở bán tại Star Cinema. Vui lòng quay lại sau.";
    } catch (error) {
      if (version !== bookingLoad) return;
      select.innerHTML = '<option value="">Không tải được danh sách phim</option>';
      message.textContent = error.message + " Bấm Tải lại vé để thử lại.";
    }
  }
  document.getElementById("booking-movie").addEventListener("change", (event) => {
    document.getElementById("choose-showtime").disabled = !event.target.value;
  });
  document.getElementById("ticket-booking-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const movie = bookingMovies.find((item) => String(item.id) === document.getElementById("booking-movie").value);
    if (movie) openMovie(movie, true);
  });
  let detailVersion = 0;
  async function openMovie(movie, booking = false) {
    if (!movie) return;
    const version = ++detailVersion;
    const detail = document.getElementById("movie-detail");
    detail.innerHTML = `<div class="detail-grid"><img class="detail-poster" src="${e(poster(movie))}" alt="${e(movie.title)}"><div class="detail-copy"><p class="eyebrow">${movie.status === 1 ? "ĐANG CHIẾU" : "SẮP CHIẾU"}</p><h2 id="detail-title">${e(movie.title)}</h2><div class="detail-tags">${movie.ageRating ? `<span class="age-rating">${e(movie.ageRating)}</span>` : ""}<span>${e(movie.genre || "Điện ảnh")}</span><span>${e(movie.country || "")}</span><span>${movie.duration} phút</span></div><dl class="film-facts"><div><dt>Đạo diễn</dt><dd>${e(movie.director || "Đang cập nhật")}</dd></div>${movie.actors ? `<div><dt>Diễn viên</dt><dd>${e(movie.actors)}</dd></div>` : ""}<div><dt>Khởi chiếu</dt><dd>${date(movie.releaseDate)}</dd></div>${movie.ageRating ? `<div><dt>Phân loại</dt><dd>${e(movie.ageRating)}</dd></div>` : ""}</dl><h3 class="synopsis-title">Nội dung phim</h3><p class="detail-description">${e(movie.description || "Thông tin nội dung phim đang được cập nhật.")}</p><div class="detail-links">${movie.trailerUrl ? `<a class="button outline" href="${e(movie.trailerUrl)}" target="_blank" rel="noopener noreferrer">Xem trailer</a>` : ""}${movie.sourceUrl ? `<a class="source-link" href="${e(movie.sourceUrl)}" target="_blank" rel="noopener noreferrer">Nguồn: Trung tâm Chiếu phim Quốc gia</a>` : ""}</div></div></div><div class="booking-area"><h3>Lịch chiếu</h3><div id="showtimes" class="showtimes"><p class="muted">Đang tải lịch chiếu…</p></div><div id="booking-seats" hidden></div><p id="booking-message" class="form-message" role="status" hidden></p></div>`;
    dialog.setAttribute("aria-labelledby", "detail-title");
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    if (booking) requestAnimationFrame(() => {
      if (version === detailVersion) detail.querySelector(".booking-area").scrollIntoView({ block: "start" });
    });
    if (movie.sourceId) {
      document.getElementById("showtimes").innerHTML =
        `<div class="source-schedule"><p>Phim chưa được mở lịch đặt vé tại Star Cinema.</p><a class="button gold" href="${e(movie.sourceUrl)}" target="_blank" rel="noopener noreferrer">Xem lịch chiếu tại NCC</a></div>`;
      return;
    }
    try {
      const showtimes = await api(`/api/movies/${movie.id}/showtimes`);
      if (version !== detailVersion) return;
      const target = document.getElementById("showtimes");
      target.innerHTML = showtimes.length
        ? showtimes
            .map(
              (show) =>
                `<button class="showtime" data-showtime="${show.id}">${e(show.startTime.slice(11, 16))} · ${date(show.startTime)}<small>${e(show.roomName)} / Từ ${money(show.price)}</small></button>`,
            )
            .join("")
        : '<p class="muted">Phim chưa có suất chiếu sắp tới tại Star Cinema. Vui lòng chọn phim khác hoặc quay lại sau.</p>';
      target.querySelectorAll("button").forEach((button) =>
        button.addEventListener("click", () =>
          selectShowtime(
            showtimes.find(
              (show) => show.id === Number(button.dataset.showtime),
            ),
            button,
            version, movie,
          ),
        ),
      );
    } catch (error) {
      if (version === detailVersion)
        document.getElementById("showtimes").textContent = error.message;
    }
  }
  document.addEventListener("star:movie", async (event) => {
    const source = await catalogue;
    openMovie(source?.movies?.find((movie) => movie.id === event.detail.id));
  });
  let seatsVersion = 0;
  async function selectShowtime(show, button, detailId, movie) {
    const version = ++seatsVersion;
    document
      .querySelectorAll(".showtime")
      .forEach((item) => item.classList.toggle("selected", item === button));
    const target = document.getElementById("booking-seats");
    target.hidden = false;
    target.innerHTML = '<p class="muted">Đang tải sơ đồ ghế…</p>';
    document.getElementById("booking-message").hidden = true;
    try {
      const seats = await api(`/api/showtimes/${show.id}/seats`);
      if (version !== seatsVersion || detailId !== detailVersion) return;
      const selected = new Set();
      const rows = Map.groupBy
        ? Map.groupBy(seats, (seat) => seat.rowName)
        : seats.reduce(
            (map, seat) =>
              map.set(seat.rowName, [...(map.get(seat.rowName) || []), seat]),
            new Map(),
          );
      target.innerHTML = `<div class="screen">MÀN HÌNH</div><div class="seat-map" aria-label="Sơ đồ chỗ ngồi">${[...rows].map(([row, items]) => `<div class="seat-row"><span>${e(row)}</span>${items.map((seat) => `<button class="seat ${seat.seatType === "VIP" ? "vip" : ""}" data-seat="${seat.seatId}" ${seat.status !== "AVAILABLE" ? "disabled" : ""} aria-pressed="false" aria-label="Ghế ${e(seat.rowName)}${seat.seatNumber}, ${e(seat.seatType)}, ${seat.status === "AVAILABLE" ? "còn trống" : "đã đặt"}">${seat.seatNumber}</button>`).join("")}</div>`).join("")}</div><div class="seat-legend"><span>Ghế trống</span><span class="selected">Đang chọn</span><span class="booked">Đã đặt</span></div><div class="booking-total"><div><p id="selected-seats">Chưa chọn ghế</p><strong id="total-price">${money(0)}</strong><p class="small">Đặt vé demo, chưa tích hợp thanh toán thật.</p></div><button class="button gold" id="book" disabled>Kiểm tra và xác nhận</button></div>`;
      const price = (seat) =>
        Number(show.price) *
        (seat.seatType === "VIP" ? 1.5 : seat.seatType === "COUPLE" ? 2 : 1);
      target.querySelectorAll("[data-seat]").forEach((item) =>
        item.addEventListener("click", () => {
          const id = Number(item.dataset.seat);
          if (selected.has(id)) selected.delete(id);
          else selected.add(id);
          item.classList.toggle("selected", selected.has(id));
          item.setAttribute("aria-pressed", String(selected.has(id)));
          const chosen = seats.filter((seat) => selected.has(seat.seatId));
          document.getElementById("selected-seats").textContent = chosen.length
            ? `Ghế: ${chosen.map((seat) => seat.rowName + seat.seatNumber).join(", ")}`
            : "Chưa chọn ghế";
          document.getElementById("total-price").textContent = money(
            chosen.reduce((sum, seat) => sum + price(seat), 0),
          );
          document.getElementById("book").disabled = !chosen.length;
        }),
      );
      document
        .getElementById("book")
        .addEventListener("click", async (event) => {
          const bookButton = event.currentTarget;
          if (bookButton.disabled || !selected.size) return;
          bookButton.disabled = true;
          await Space.ready;
          if (!Space.me) {
            location.assign("/login.html?next=tickets");
            return;
          }
          if (version !== seatsVersion || detailId !== detailVersion) return;
          const chosen = seats.filter((seat) => selected.has(seat.seatId));
          document.getElementById("booking-confirm-summary").innerHTML =
            `<h3>${e(movie.title)}</h3><p>${date(show.startTime)} · ${e(show.startTime.slice(11, 16))}<br>${e(show.roomName)}</p><p>Ghế: <strong>${e(chosen.map((seat) => seat.rowName + seat.seatNumber).join(", "))}</strong></p><p>Tổng tiền: <strong>${money(chosen.reduce((sum, seat) => sum + price(seat), 0))}</strong></p>`;
          confirmDialog.returnValue = "cancel";
          const confirmation = new Promise((resolve) => confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "confirm"), { once: true }));
          confirmDialog.showModal();
          if (!await confirmation) { bookButton.disabled = false; return; }
          if (version !== seatsVersion || detailId !== detailVersion) return;
          const message = document.getElementById("booking-message");
          message.hidden = true;
          target.inert = true;
          document.getElementById("showtimes").inert = true;
          try {
            const result = await api("/api/bookings", {
              method: "POST",
              body: { showtimeId: show.id, seatIds: [...selected] },
            });
            dialog.close();
            Space.toast(
              `Đặt vé thành công · ${money(result.totalPrice)}. Vé đã có trong “Vé của tôi”.`,
            );
            if (location.hash === "#my-tickets") await loadTickets();
            else location.hash = "my-tickets";
            document.getElementById("my-tickets").hidden = false;
            document
              .getElementById("my-tickets")
              .scrollIntoView({ behavior: "smooth" });
          } catch (error) {
            if (version !== seatsVersion || detailId !== detailVersion) return;
            message.textContent = error.message;
            message.hidden = false;
            bookButton.disabled = false;
            if (error.status === 409) {
              await selectShowtime(show, button, detailId, movie);
              message.textContent = "Ghế vừa được người khác đặt. Sơ đồ đã được cập nhật, vui lòng chọn lại.";
              message.hidden = false;
            }
          } finally {
            target.inert = false;
            if (detailId === detailVersion) document.getElementById("showtimes").inert = false;
          }
        });
    } catch (error) {
      if (version === seatsVersion) target.textContent = error.message;
    }
  }
  async function loadTickets() {
    const version = ++ticketLoad;
    await Space.ready;
    if (version !== ticketLoad) return;
    document.getElementById("tickets-auth").hidden = !!Space.me;
    document.getElementById("ticket-booking").hidden = !Space.me;
    document.getElementById("saved-tickets-title").hidden = !Space.me;
    const target = document.getElementById("tickets-grid");
    if (!Space.me) { target.replaceChildren(); return; }
    target.innerHTML = '<p class="empty-state">Đang tải vé của bạn…</p>';
    try {
      const tickets = await api("/api/account/tickets");
      if (version !== ticketLoad) return;
      target.innerHTML = tickets.length
        ? tickets
            .map(
              (ticket) =>
                `<article class="ticket-card"><p class="eyebrow">TICKET / ${ticket.ticketId}</p><h3>${e(ticket.movieTitle)}</h3><p>${date(ticket.startTime)} · ${e(ticket.startTime.slice(11, 16))}<br>${e(ticket.roomName)} / Ghế ${e(ticket.seatCode)}</p><span class="badge">${ticket.status === "USED" ? "Đã sử dụng" : ticket.status === "CANCELLED" ? "Đã hủy" : new Date(ticket.startTime) < new Date() ? "Suất chiếu đã bắt đầu" : "Chưa sử dụng"}</span><br><button class="button outline" data-qr="${ticket.ticketId}" ${ticket.status !== "UNUSED" ? "disabled" : ""}>Xem vé / QR</button></article>`,
            )
            .join("")
        : '<p class="empty-state">Bạn chưa có vé nào. Chọn một bộ phim để bắt đầu hành trình.</p>';
      target.querySelectorAll("[data-qr]").forEach((button) =>
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await TicketQr.open(button.dataset.qr);
          } catch (error) {
            Space.toast(error.message);
          } finally {
            button.disabled = false;
          }
        }),
      );
    } catch (error) {
      if (version === ticketLoad) target.textContent = error.message;
    }
  }
  document
    .getElementById("reload-tickets")
    .addEventListener("click", () => { loadTickets(); loadBookingMovies(); });
  function renderView() {
    const catalog = document.body.dataset.view === "movies" || location.hash === "#movies";
    const tickets = location.hash === "#my-tickets";
    document.querySelector(".film-carousel").hidden = catalog || tickets;
    document.getElementById("movies").hidden = tickets;
    document.getElementById("my-tickets").hidden = !tickets;
    if (movies.length) renderMovies();
    if (tickets) { loadTickets(); loadBookingMovies(); }
  }
  renderView();
  window.addEventListener("hashchange", renderView);
  await loadMovies();
})();
