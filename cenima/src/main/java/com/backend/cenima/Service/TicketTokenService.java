package com.backend.cenima.Service;
import com.backend.cenima.DTO.ticket.*;
import com.backend.cenima.Repository.TicketRepository;
import com.backend.cenima.Security.contract.TicketActorProvider;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
@Service
@RequiredArgsConstructor
public class TicketTokenService {
    private final TicketRepository tickets;
    private final TicketActorProvider actors;
    private final TicketPolicy policy;
    private final JwtProviderRegistry registry;
    private final QrCodeService qrCodes;
    @Transactional(readOnly=true)
    public TicketView view(Integer id) {
        var actor=actors.currentActor();
        var ticket=tickets.findById(id).orElseThrow(() -> new TicketException(404,"TICKET_NOT_FOUND","Không tìm thấy vé"));
        policy.requireOwnerOrAdmin(actor,ticket);
        return TicketView.of(ticket);
    }
    @Transactional
    public TicketTokenResponse issue(Integer id,String algorithm) {
        var actor=actors.currentActor();
        var ticket=tickets.findById(id).orElseThrow(() -> new TicketException(404,"TICKET_NOT_FOUND","Không tìm thấy vé"));
        policy.requireOwnerOrAdmin(actor,ticket);
        policy.requireUsable(ticket);
        var signer=registry.signer(algorithm);
        var payload=policy.payload(ticket);
        String token=signer.sign(payload.claims());
        var qr=qrCodes.create(token,ticket,payload.exp());
        return new TicketTokenResponse(TicketView.of(ticket),token,algorithm,Instant.ofEpochSecond(payload.iat()),Instant.ofEpochSecond(payload.exp()),qr);
    }
}
