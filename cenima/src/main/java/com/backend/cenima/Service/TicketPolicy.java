package com.backend.cenima.Service;
import com.backend.cenima.Entity.*;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.config.TicketProperties;
import com.backend.cenima.DTO.ticket.*;
import java.time.*;
import org.springframework.stereotype.Component;
@Component
public class TicketPolicy {
    private final Clock clock;
    private final ZoneId zone;
    public TicketPolicy(Clock clock, TicketProperties p) { this.clock=clock; this.zone=ZoneId.of(p.zone()); }
    public void requireOwnerOrAdmin(TicketActor actor, Ticket t) {
        if (!actor.hasRole("ADMIN") && !t.getUser().getId().equals(actor.userId()))
            throw new TicketException(403,"FORBIDDEN","Chỉ chủ vé hoặc ADMIN được xem/phát hành vé");
    }
    public void requireStaff(TicketActor actor) {
        if (!actor.hasRole("STAFF") && !actor.hasRole("ADMIN"))
            throw new TicketException(403,"FORBIDDEN","Cần quyền STAFF hoặc ADMIN");
    }
    public long expiration(Ticket t) {
        var duration=t.getMovie().getDuration();
        if (duration==null || duration<=0 || t.getShowtime().getStartTime()==null)
            throw new TicketException(422,"TICKET_DATA_INVALID","Suất chiếu thiếu thời gian hoặc thời lượng phim hợp lệ");
        try { return t.getShowtime().getStartTime().plusMinutes(duration).atZone(zone).toEpochSecond(); }
        catch (DateTimeException | ArithmeticException e) { throw new TicketException(422,"TICKET_DATA_INVALID","Thời gian kết thúc không hợp lệ"); }
    }
    public void requireUsable(Ticket t) {
        if (!t.getUser().getId().equals(t.getBooking().getUser().getId())
            || !t.getShowtime().getId().equals(t.getBooking().getShowtime().getId())
            || !t.getMovie().getId().equals(t.getShowtime().getMovie().getId())
            || !t.getSeat().getRoom().getId().equals(t.getShowtime().getRoom().getId()))
            throw new TicketException(422,"TICKET_DATA_INVALID","Quan hệ dữ liệu vé không nhất quán");
        if (t.getBooking().getStatus()!=Booking.BookingStatus.PAID)
            throw new TicketException(409,"BOOKING_NOT_PAID","Booking chưa thanh toán hoặc đã hủy");
        if (t.getStatus()==Ticket.TicketStatus.USED) throw new TicketException(409,"TICKET_USED","Vé đã sử dụng");
        if (t.getStatus()!=Ticket.TicketStatus.UNUSED) throw new TicketException(409,"TICKET_CANCELLED","Vé đã hủy");
        if (clock.instant().getEpochSecond()>=expiration(t)) throw new TicketException(422,"TICKET_EXPIRED","Suất chiếu đã kết thúc");
    }
    public JwtPayload payload(Ticket t) {
        return new JwtPayload(t.getId(),t.getMovie().getId(),t.getShowtime().getId(),
            t.getSeat().getRowName()+t.getSeat().getSeatNumber(),clock.instant().getEpochSecond(),expiration(t));
    }
}
