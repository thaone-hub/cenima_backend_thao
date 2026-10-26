package com.backend.cenima.Controller;
import com.backend.cenima.DTO.ticket.*;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import com.backend.cenima.Service.TicketTokenService;
import com.backend.cenima.Service.TicketVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {
    private final TicketTokenService tokens;
    private final JwtProviderRegistry providers;
    private final TicketVerificationService verification;
    @PostMapping("/verify") public TicketVerifyResponse verify(@Valid @RequestBody TicketVerifyRequest request) { return verification.verify(request.value()); }
    @PostMapping("/check-in") public TicketVerifyResponse checkIn(@Valid @RequestBody TicketVerifyRequest request) { return verification.checkIn(request.value()); }
    @GetMapping("/algorithms") public List<JwtProviderRegistry.Availability> algorithms() { return providers.algorithms(); }
    @GetMapping("/{ticketId}") public TicketView view(@PathVariable Integer ticketId) { return tokens.view(ticketId); }
    @PostMapping("/{ticketId}/token") public TicketTokenResponse issue(@PathVariable Integer ticketId, @Valid @RequestBody TicketTokenRequest request) {
        return tokens.issue(ticketId,request.algorithm());
    }
}
