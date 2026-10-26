package com.backend.cenima.Security.auth;

import com.backend.cenima.Security.traditional.Rs256JwtSigner;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jwt.SignedJWT;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final Rs256JwtSigner jwtSigner;
    private final CustomUserDetailsService userDetailsService;
    public JwtAuthenticationFilter(Rs256JwtSigner jwtSigner,CustomUserDetailsService userDetailsService) {
        this.jwtSigner=jwtSigner;this.userDetailsService=userDetailsService;
    }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith(request.getContextPath()+"/api/auth/");
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String authorization=request.getHeader("Authorization");
        if (authorization==null || !authorization.startsWith("Bearer ")) { chain.doFilter(request,response);return; }
        String token=authorization.substring(7);
        try {
            if (token.length()>32768 || !JOSEObjectType.JWT.equals(SignedJWT.parse(token).getHeader().getType()))
                throw new SecurityException("Expected authentication JWT type");
            var claims=jwtSigner.verify(token);
            if (!"cenima-auth".equals(claims.getIssuer()) || !"ACCESS".equals(claims.getClaim("tokenType"))
                    || claims.getSubject()==null || claims.getSubject().isBlank()) throw new SecurityException("Expected access token");
            if (SecurityContextHolder.getContext().getAuthentication()==null) {
                var details=userDetailsService.loadUserByUsername(claims.getSubject());
                if (!details.isEnabled()) throw new SecurityException("Account disabled");
                var auth=new UsernamePasswordAuthenticationToken(details,null,details.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            response.setStatus(401);response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(request.getRequestURI().startsWith(request.getContextPath()+"/api/tickets")
                ? "{\"code\":\"UNAUTHENTICATED\",\"message\":\"Invalid or expired access token\"}"
                : "{\"error\":\"Invalid or expired access token\"}");
            return;
        }
        // Business failures keep their own status, for example check-in 409.
        chain.doFilter(request,response);
    }
}
