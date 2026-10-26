package com.backend.cenima.Service;
import com.backend.cenima.DTO.ticket.*;
import com.backend.cenima.Repository.TicketRepository;
import com.backend.cenima.Security.contract.TicketActorProvider;
import com.backend.cenima.config.TicketProperties;
import com.backend.cenima.Entity.Ticket;
import lombok.RequiredArgsConstructor;
import java.time.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
public class TicketVerificationService {
    private final TicketActorProvider actors;
    private final TicketJwtValidation validation;
    private final TicketRepository tickets;
    private final TicketPolicy policy;
    private final Clock clock;
    private final TicketProperties properties;
    @Transactional(readOnly=true)
    public TicketVerifyResponse verify(String value) {
        policy.requireStaff(actors.currentActor());
        var claims=validation.validate(value);
        var ticket=tickets.findById(claims.ticketId()).orElseThrow(()->new TicketException(404,"TICKET_NOT_FOUND","Không tìm thấy vé"));
        validation.match(claims,ticket); policy.requireUsable(ticket);
        return response(ticket,false);
    }
    @Transactional(timeout=15)
    public TicketVerifyResponse checkIn(String value) {
        policy.requireStaff(actors.currentActor());
        var claims=validation.validate(value);
        // No Ticket entity is read into this persistence context before acquiring the write lock.
        var ticket=tickets.findForCheckIn(claims.ticketId()).orElseThrow(()->new TicketException(404,"TICKET_NOT_FOUND","Không tìm thấy vé"));
        validation.match(claims,ticket); policy.requireUsable(ticket);
        ticket.setStatus(Ticket.TicketStatus.USED);
        ticket.setUsedAt(LocalDateTime.ofInstant(clock.instant(),ZoneId.of(properties.zone())));
        tickets.flush();
        return response(ticket,true);
    }
    private TicketVerifyResponse response(Ticket t,boolean checkedIn) { return new TicketVerifyResponse(true,checkedIn,TicketView.of(t),t.getStatus().name(),t.getUsedAt()); }
}
