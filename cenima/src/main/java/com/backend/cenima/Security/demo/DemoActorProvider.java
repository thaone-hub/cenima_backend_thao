package com.backend.cenima.Security.demo;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Repository.UserRepository;
import com.backend.cenima.Service.TicketException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
@Profile("demo & !integrated")
@RequiredArgsConstructor
public class DemoActorProvider implements TicketActorProvider {
    private final HttpServletRequest request;
    private final UserRepository users;
    @Transactional(readOnly = true)
    public TicketActor currentActor() {
        String header = request.getHeader("X-User-Id");
        int id;
        try { id = Integer.parseInt(header); if (id <= 0) throw new NumberFormatException(); }
        catch (NumberFormatException e) { throw new TicketException(401, "UNAUTHENTICATED", "Cần X-User-Id hợp lệ trong demo"); }
        var user = users.findById(id).orElseThrow(() -> new TicketException(401, "UNAUTHENTICATED", "Tài khoản không tồn tại"));
        if (!Boolean.TRUE.equals(user.getIsActive())) throw new TicketException(403, "ACCOUNT_DISABLED", "Tài khoản đã khóa");
        return new TicketActor(user.getId(), Set.of(user.getRole().getRoleName()));
    }
}
