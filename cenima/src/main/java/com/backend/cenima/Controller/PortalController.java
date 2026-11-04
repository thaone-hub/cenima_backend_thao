package com.backend.cenima.Controller;

import com.backend.cenima.DTO.MovieResponse;
import com.backend.cenima.DTO.auth.RegisterRequest;
import com.backend.cenima.DTO.ticket.TicketView;
import com.backend.cenima.Service.PortalService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@Profile("integrated")
@RequiredArgsConstructor
public class PortalController {
    private final PortalService portal;
    public record ActiveRequest(@NotNull Boolean active) {}
    @PostMapping("/api/auth/register") @ResponseStatus(HttpStatus.CREATED)
    public PortalService.Account register(@Valid @RequestBody RegisterRequest input) { return portal.register(input); }
    @GetMapping("/api/account/me") public PortalService.Account me() { return portal.me(); }
    @GetMapping("/api/account/tickets") public List<TicketView> tickets() { return portal.myTickets(); }
    @GetMapping("/api/admin/stats") public PortalService.Dashboard stats() { return portal.dashboard(); }
    @GetMapping("/api/admin/users") public List<PortalService.Account> users() { return portal.accounts(); }
    @PatchMapping("/api/admin/users/{id}/active")
    public PortalService.Account active(@PathVariable Integer id,@Valid @RequestBody ActiveRequest input) { return portal.setActive(id,input.active()); }
    @GetMapping("/api/admin/movies") public List<MovieResponse> movies() { return portal.allMovies(); }
    @PostMapping("/api/admin/movies") @ResponseStatus(HttpStatus.CREATED)
    public MovieResponse create(@Valid @RequestBody PortalService.MovieInput input) { return portal.saveMovie(null,input); }
    @PutMapping("/api/admin/movies/{id}")
    public MovieResponse update(@PathVariable Integer id,@Valid @RequestBody PortalService.MovieInput input) { return portal.saveMovie(id,input); }
}
