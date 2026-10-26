package com.backend.cenima.Security.adapter;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Service.TicketException;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.stereotype.Component;
@Component
@Profile("integrated")
public class IntegratedActorProvider implements TicketActorProvider {
    private final TicketAuthenticationBridge bridge;
    public IntegratedActorProvider(TicketAuthenticationBridge bridge) { this.bridge = bridge; }
    public TicketActor currentActor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken)
            throw new TicketException(401, "UNAUTHENTICATED", "Cần đăng nhập");
        var actor = bridge.resolve(auth);
        if (actor == null || actor.userId() == null || actor.userId() <= 0)
            throw new TicketException(401, "UNAUTHENTICATED", "Principal chưa được ánh xạ hợp lệ");
        return actor;
    }
}
