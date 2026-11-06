
import {
  $,
  api,
  dateTime,
  money,
  initNav,
  setMessage
} from "./api.js";

initNav();

const q = new URLSearchParams(
  location.search
);

const movieId = Number(q.get("movieId"));
const showtimeId = Number(q.get("showtimeId"));

const selected = new Map();

let showtime;
let seats = [];

const seatFactors = {
  STANDARD: 1,
  VIP: 1.5,
  COUPLE: 2
};

// Cap nhat tong tien va ghe da chon
function updateSummary() {
  const picked = [...selected.values()];

  $("#selected-seats").textContent =
    picked.length
      ? picked
          .map(
            s => `${s.rowName}${s.seatNumber}`
          )
          .join(", ")
      : "Chưa chọn";

  const amount = picked.reduce(
    (sum, seat) =>
      sum +
      Number(showtime?.price || 0) *
      (seatFactors[seat.seatType] || 1),
    0
  );

  $("#estimated-price").textContent =
    money(amount);

  $("#continue").disabled =
    picked.length === 0;
}

// Ve so do ghe
function renderSeats() {
  const target = $("#seat-map");

  target.replaceChildren();

  const rows = new Map();

  seats.forEach((seat) => {
    if (!rows.has(seat.rowName)) {
      rows.set(seat.rowName, []);
    }

    rows.get(seat.rowName).push(seat);
  });

  for (const [rowName, list] of rows) {
    const row =
      document.createElement("div");

    row.className = "seat-row";

    const label =
      document.createElement("span");

    label.className = "row-label";
    label.textContent = rowName;

    const places =
      document.createElement("div");

    places.className = "seat-row-items";

    list.sort(
      (a, b) =>
        a.seatNumber - b.seatNumber
    ).forEach((seat) => {
      const button =
        document.createElement("button");

      button.type = "button";

      const booked =
        seat.status !== "AVAILABLE";

      button.className =
        `seat ${seat.seatType.toLowerCase()}` +
        `${booked ? " booked" : ""}`;

      button.textContent =
        String(seat.seatNumber);

      button.disabled = booked;

      button.title =
        `${seat.rowName}${seat.seatNumber}` +
        ` · ${seat.seatType}` +
        ` · ${seat.status}`;

      button.setAttribute(
        "aria-pressed",
        selected.has(seat.seatId)
          ? "true"
          : "false"
      );

      if (selected.has(seat.seatId)) {
        button.classList.add("selected");
      }

      button.addEventListener(
        "click",
        () => {
          if (selected.has(seat.seatId)) {
            selected.delete(seat.seatId);
          } else {
            selected.set(
              seat.seatId,
              seat
            );
          }

          button.classList.toggle(
            "selected",
            selected.has(seat.seatId)
          );

          button.setAttribute(
            "aria-pressed",
            String(
              selected.has(seat.seatId)
            )
          );

          updateSummary();
        }
      );

      places.append(button);
    });

    row.append(label, places);
    target.append(row);
  }

  updateSummary();
}

// Kiem tra tham so
if (
  ![movieId, showtimeId].every(
    id => Number.isInteger(id) && id > 0
  )
) {
  setMessage(
    "#message",
    "Thiếu movieId hoặc showtimeId."
  );
} else {
  (async () => {
    try {
      const [allShows, availableSeats] =
        await Promise.all([
          api(
            `/api/movies/${movieId}/showtimes`,
            { auth: false }
          ),
          api(
            `/api/showtimes/${showtimeId}/seats`,
            { auth: false }
          )
        ]);

      showtime = allShows.find(
        s => s.id === showtimeId
      );

      if (!showtime) {
        throw new Error(
          "Suất chiếu này đã hết hạn hoặc không thuộc phim được chọn."
        );
      }

      seats = availableSeats;

      $("#show-details").textContent =
        `${showtime.roomName} · ` +
        dateTime(showtime.startTime);

      renderSeats();

    } catch (error) {
      setMessage(
        "#message",
        error.message
      );
    }
  })();
}

// Chuyen sang buoc dat ve
$("#continue").addEventListener(
  "click",
  () => {
    if (!selected.size || !showtime) {
      return;
    }

    const draft = {
      movieId,
      showtimeId,
      roomName: showtime.roomName,
      startTime: showtime.startTime,
      price: showtime.price,
      seats: [...selected.values()].map(
        s => ({
          seatId: s.seatId,
          rowName: s.rowName,
          seatNumber: s.seatNumber,
          seatType: s.seatType
        })
      )
    };

    sessionStorage.setItem(
      "cinema_booking_draft",
      JSON.stringify(draft)
    );

    location.assign(
      "/cinema/booking.html"
    );
  }
);
