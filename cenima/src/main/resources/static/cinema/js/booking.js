
import {
  $,
  api,
  money,
  dateTime,
  requireLogin,
  initNav,
  setMessage
} from "./api.js";

initNav();

const draft = (() => {
  try {
    return JSON.parse(
      sessionStorage.getItem(
        "cinema_booking_draft"
      ) || "null"
    );
  } catch {
    return null;
  }
})();

const button = $("#confirm");

// Hien thi thong tin booking
if (
  !draft?.showtimeId ||
  !draft?.seats?.length
) {
  button.disabled = true;

  setMessage(
    "#message",
    "Bạn chưa chọn ghế. Hãy chọn phim và ghế trước."
  );
} else {
  $("#booking-show").textContent =
    `${draft.roomName} · ` +
    dateTime(draft.startTime);

  $("#booking-seats").textContent =
    draft.seats
      .map(
        s => `${s.rowName}${s.seatNumber}`
      )
      .join(", ");

  const factors = {
    STANDARD: 1,
    VIP: 1.5,
    COUPLE: 2
  };

  const total = draft.seats.reduce(
    (sum, seat) =>
      sum +
      draft.price *
      (factors[seat.seatType] || 1),
    0
  );

  $("#booking-total").textContent =
    money(total);
}

// Tao booking khi nguoi dung xac nhan
button.addEventListener(
  "click",
  async () => {
    if (!draft || !requireLogin()) {
      return;
    }

    button.disabled = true;

    setMessage(
      "#message",
      "Đang đặt ghế...",
      "info"
    );

    try {
      const booking = await api(
        "/api/bookings",
        {
          method: "POST",
          body: {
            showtimeId: draft.showtimeId,
            seatIds: draft.seats.map(
              s => s.seatId
            )
          }
        }
      );

      sessionStorage.removeItem(
        "cinema_booking_draft"
      );

      $("#booking-form").hidden = true;
      $("#result").hidden = false;

      $("#result-title").textContent =
        `Đặt vé thành công · Đơn #${booking.id}`;

      $("#result-details").textContent =
        `Trạng thái: ${booking.status}` +
        ` · Tổng tiền: ${money(booking.totalPrice)}`;

      const tickets = $("#ticket-links");
      tickets.replaceChildren();

      // Moi ghe co mot Ticket ID
      (booking.tickets || []).forEach(
        (ticket) => {
          const link =
            document.createElement("a");

          link.className = "ticket-link";

          link.href =
            `/cinema/ticket.html?ticketId=${
              encodeURIComponent(ticket.ticketId)
            }`;

          link.textContent =
            `🎟 Ghế ${ticket.seat}` +
            ` · Mã vé #${ticket.ticketId}` +
            ` · Xem JWT & QR`;

          tickets.append(link);
        }
      );

      setMessage(
        "#message",
        "Đặt vé thành công!",
        "success"
      );

    } catch (error) {
      setMessage(
        "#message",
        error.message
      );

      if (
        error.message.startsWith("HTTP 409")
      ) {
        const link =
          document.createElement("a");

        link.className = "text-link";

        link.href =
          `/cinema/seats.html?movieId=${
            draft.movieId
          }&showtimeId=${draft.showtimeId}`;

        link.textContent =
          "Ghế vừa được đặt. Chọn lại ghế";

        $("#message").append(
          document.createTextNode(" "),
          link
        );
      }

      button.disabled = false;
    }
  }
);
