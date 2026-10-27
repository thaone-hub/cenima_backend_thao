
import {
  $,
  api,
  money,
  dateTime,
  initNav,
  setMessage
} from "./api.js";

initNav();

const movieId = Number(
  new URLSearchParams(
    location.search
  ).get("movieId")
);

if (!Number.isInteger(movieId) || movieId < 1) {
  setMessage(
    "#message",
    "Chưa chọn phim. Hãy quay lại trang chủ."
  );
} else {
  (async () => {
    try {
      const [movies, showtimes] =
        await Promise.all([
          api("/api/movies", {
            auth: false
          }),
          api(
            `/api/movies/${movieId}/showtimes`,
            { auth: false }
          )
        ]);

      const movie = movies.find(
        (item) => item.id === movieId
      );

      $("#movie-title").textContent =
        movie?.title || `Phim #${movieId}`;

      $("#movie-meta").textContent = movie
        ? `${movie.duration} phút · ${
            movie.director || "Đang cập nhật"
          }`
        : "";

      const list = $("#showtime-list");
      list.replaceChildren();

      if (!showtimes.length) {
        const empty = document.createElement("p");

        empty.className = "muted";
        empty.textContent =
          "Chưa có suất chiếu sắp tới.";

        list.append(empty);
        return;
      }

      // Nhom suat chieu theo ngay
      const groups = new Map();

      for (const show of showtimes) {
        const day =
          show.startTime?.slice(0, 10) ||
          "Khác";

        if (!groups.has(day)) {
          groups.set(day, []);
        }

        groups.get(day).push(show);
      }

      // Tao cac o chon suat chieu
      for (const [day, values] of groups) {
        const block =
          document.createElement("section");

        block.className = "showtime-day";

        const heading =
          document.createElement("h3");

        heading.textContent =
          day === "Khác"
            ? day
            : new Date(
                day + "T00:00:00"
              ).toLocaleDateString(
                "vi-VN",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long"
                }
              );

        const rows =
          document.createElement("div");

        rows.className = "showtime-grid";

        values.forEach((show) => {
          const link =
            document.createElement("a");

          link.className = "showtime-slot";

          link.href =
            `/cinema/seats.html?movieId=${movieId}` +
            `&showtimeId=${show.id}`;

          const time =
            document.createElement("strong");

          time.textContent =
            dateTime(show.startTime)
              .split(" ")
              .slice(-1)[0];

          const room =
            document.createElement("span");

          room.textContent = show.roomName;

          const price =
            document.createElement("small");

          price.textContent =
            `Từ ${money(show.price)}`;

          link.append(time, room, price);
          rows.append(link);
        });

        block.append(heading, rows);
        list.append(block);
      }
    } catch (error) {
      setMessage(
        "#message",
        error.message
      );
    }
  })();
}
