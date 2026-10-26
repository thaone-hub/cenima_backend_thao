package com.backend.cenima.config;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
@Component
@org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
public class TicketNoStoreFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        if (request.getRequestURI().startsWith(request.getContextPath()+"/api/tickets")
                || request.getRequestURI().startsWith(request.getContextPath()+"/api/auth")) {
            response.setHeader("Cache-Control","no-store");
            response.setHeader("Pragma","no-cache");
        }
        chain.doFilter(request,response);
    }
}
