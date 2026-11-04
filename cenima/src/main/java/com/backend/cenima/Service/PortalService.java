package com.backend.cenima.Service;

import com.backend.cenima.DTO.MovieResponse;
import com.backend.cenima.DTO.auth.RegisterRequest;
import com.backend.cenima.DTO.ticket.TicketView;
import com.backend.cenima.Entity.*;
import com.backend.cenima.Repository.*;
import com.backend.cenima.Security.contract.TicketActorProvider;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;

@Service
@Profile("integrated")
@RequiredArgsConstructor
public class PortalService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final MovieRepository movies;
    private final TicketRepository tickets;
    private final BookingRepository bookings;
    private final TicketActorProvider actors;
    private final PasswordEncoder passwords;

    public record Account(Integer id, String fullName, String email, String phoneNumber, String role, boolean active) {}
    public record Dashboard(long users, long movies, long bookings, long tickets) {}
    public record MovieInput(@NotBlank @Size(max=200) String title, @Size(max=10000) String description,
        @NotNull @Min(1) @Max(600) Integer duration, @NotNull LocalDate releaseDate,
        @Size(max=100) String director, @Size(max=500) String posterUrl, @NotNull @Min(0) @Max(2) Integer status) {}

    @Transactional
    public Account register(RegisterRequest input) {
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        if (input.fullName().trim().isEmpty() || input.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw error(HttpStatus.BAD_REQUEST, "Tên hoặc mật khẩu không hợp lệ (mật khẩu tối đa 72 byte).");
        if (users.existsByEmail(email)) throw error(HttpStatus.CONFLICT, "Email đã được đăng ký.");
        User user = new User();
        user.setFullName(input.fullName().trim()); user.setEmail(email);
        user.setPasswordHash(passwords.encode(input.password())); user.setPhoneNumber(input.phoneNumber());
        // Public registration never accepts a role supplied by the client.
        user.setRole(roles.findByRoleName("CUSTOMER").orElseThrow(() -> error(HttpStatus.SERVICE_UNAVAILABLE, "Chưa cấu hình quyền người dùng.")));
        user.setIsActive(true);
        try { return account(users.saveAndFlush(user)); }
        catch (DataIntegrityViolationException e) { throw error(HttpStatus.CONFLICT, "Email đã được đăng ký."); }
    }

    @Transactional(readOnly=true)
    public Account me() { return account(current()); }
    @Transactional(readOnly=true)
    public List<TicketView> myTickets() {
        return tickets.findByUser_Id(current().getId()).stream()
            .sorted(Comparator.comparing(Ticket::getId).reversed()).map(TicketView::of).toList();
    }
    @Transactional(readOnly=true)
    public List<Account> accounts() { return users.findAll().stream().map(this::account).toList(); }
    @Transactional(readOnly=true)
    public Dashboard dashboard() { return new Dashboard(users.count(),movies.count(),bookings.count(),tickets.count()); }
    @Transactional
    public Account setActive(Integer id, boolean active) {
        User user=users.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản."));
        if ("ADMIN".equals(user.getRole().getRoleName()))
            throw error(HttpStatus.CONFLICT,"Không khóa tài khoản quản trị tại đây.");
        user.setIsActive(active); return account(user);
    }
    @Transactional(readOnly=true)
    public List<MovieResponse> allMovies() { return movies.findAll().stream().map(this::movieResponse).toList(); }
    @Transactional
    public MovieResponse saveMovie(Integer id, MovieInput input) {
        String poster=input.posterUrl();
        if (poster != null && !poster.isBlank() && !poster.startsWith("/assets/"))
            throw error(HttpStatus.BAD_REQUEST,"Ảnh phim cần nằm trong /assets/ của website.");
        Movie movie=id==null?new Movie():movies.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Không tìm thấy phim."));
        movie.setTitle(input.title().trim()); movie.setDescription(input.description()); movie.setDuration(input.duration());
        movie.setReleaseDate(input.releaseDate()); movie.setDirector(input.director()); movie.setPosterUrl(poster); movie.setStatus(input.status());
        return movieResponse(movies.save(movie));
    }
    private User current() { return users.findById(actors.currentActor().userId()).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED,"Vui lòng đăng nhập.")); }
    private Account account(User u) { return new Account(u.getId(),u.getFullName(),u.getEmail(),u.getPhoneNumber(),
        "CUSTOMER".equals(u.getRole().getRoleName())?"USER":u.getRole().getRoleName(),Boolean.TRUE.equals(u.getIsActive())); }
    private MovieResponse movieResponse(Movie m) { return new MovieResponse(m.getId(),m.getTitle(),m.getDescription(),m.getDuration(),m.getReleaseDate(),m.getDirector(),m.getPosterUrl(),m.getStatus()); }
    private ResponseStatusException error(HttpStatus status,String message) { return new ResponseStatusException(status,message); }
}
