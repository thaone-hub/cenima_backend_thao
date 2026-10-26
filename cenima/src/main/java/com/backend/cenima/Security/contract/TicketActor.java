package com.backend.cenima.Security.contract;
import java.util.Set;
public record TicketActor(Integer userId, Set<String> roles) {
    public TicketActor { roles = Set.copyOf(roles); }
    public boolean hasRole(String role) { return roles.contains(role); }
}
