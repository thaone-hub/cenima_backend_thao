
import {
  $,
  api,
  initNav,
  setMessage
} from "./api.js";

initNav();

const grid = $("#movie-grid");
const search = $("#search");

let movies = [];

function render() {
  grid.replaceChildren();

  const visible = movies.filter((movie) =>
    movie.title
      .toLocaleLowerCase("vi")
      .includes(
        search.value
          .trim()
          .toLocaleLowerCase("vi")
      )
  );

  $("#movie-count").textContent =
    `${visible.length} phim`;

  if (!visible.length) {
    const empty = document.createElement("p");

    empty.className = "muted";
    empty.textContent = "Không có phim phù hợp.";

    grid.append(empty);
    return;
  }

  visible.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";

    const poster = document.createElement("div");
    poster.className = "poster";

    // Hien thi poster neu API co posterUrl
    if (
      movie.posterUrl &&
      /^https?:\/\//i.test(movie.posterUrl)
    ) {
      const image = document.createElement("img");

      image.src = movie.posterUrl;
      image.alt = `Poster ${movie.title}`;
      image.loading = "lazy";

      image.addEventListener("error", () => {
        poster.replaceChildren(
          document.createTextNode("🎬")
        );
        poster.classList.add(
          "poster-placeholder"
        );
      });

      poster.append(image);
    } else {
      poster.textContent = "🎬";
      poster.classList.add(
        "poster-placeholder"
      );
    }

    const info = document.createElement("div");
    info.className = "movie-info";

    const title = document.createElement("h3");
    title.textContent = movie.title;

    const meta = document.createElement("p");
    meta.className = "muted";

    meta.textContent =
      `${movie.duration || "—"} phút · ${
        movie.director ||
        "Đang cập nhật đạo diễn"
      }`;

    const detail = document.createElement("p");
    detail.className = "desc";

    detail.textContent =
      movie.description ||
      "Khám phá bộ phim tại rạp.";

    const link = document.createElement("a");
    link.className = "btn primary full";

    link.href =
      `/cinema/showtimes.html?movieId=${
        encodeURIComponent(movie.id)
      }`;

    link.textContent = "Chọn suất chiếu";

    info.append(title, meta, detail, link);
    card.append(poster, info);
    grid.append(card);
  });
}

search.addEventListener("input", render);

// Goi API lay danh sach phim
(async () => {
  try {
    movies = await api(
      "/api/movies",
      { auth: false }
    );

    render();
  } catch (error) {
    setMessage("#message", error.message);
  }
})();
