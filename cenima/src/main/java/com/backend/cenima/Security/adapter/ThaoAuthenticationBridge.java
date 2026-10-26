package com.backend.cenima.Security.adapter;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Repository.UserRepository;
import com.backend.cenima.Service.TicketException;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
@Component
@Profile("integrated")
@RequiredArgsConstructor
public class ThaoAuthenticationBridge implements TicketAuthenticationBridge {
    private final UserRepository users;
    @Transactional(readOnly=true)
    public TicketActor resolve(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof UserDetails principal) || !principal.isEnabled())
            throw new TicketException(401,"UNAUTHENTICATED","Principal authentication không hợp lệ");
        // Thao's verified subject is an email, never a client-supplied numeric user ID.
        var user=users.findByEmail(principal.getUsername()).orElseThrow(()->new TicketException(401,"UNAUTHENTICATED","Không tìm thấy tài khoản"));
        if (!Boolean.TRUE.equals(user.getIsActive())) throw new TicketException(403,"ACCOUNT_DISABLED","Tài khoản đã khóa");
        return new TicketActor(user.getId(),Set.of(user.getRole().getRoleName()));
    }
}
