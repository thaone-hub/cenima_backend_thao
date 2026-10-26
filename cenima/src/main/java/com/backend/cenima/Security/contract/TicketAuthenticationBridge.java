package com.backend.cenima.Security.contract;
import org.springframework.security.core.Authentication;
/** Implement using Thao's actual access-token principal, never an e-ticket JWT. */
public interface TicketAuthenticationBridge {
    TicketActor resolve(Authentication authentication);
}
