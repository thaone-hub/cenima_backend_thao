package com.backend.cenima.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "RefreshTokens")
@Getter @Setter @NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "TokenID")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "UserID", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    // Keep Thao's 1000-char auth-token contract; SQL migration expands the original 500.
    @Column(name = "Token", nullable = false, unique = true, length = 1000)
    private String token;

    @Column(name = "ExpiresAt", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "IsRevoked", nullable = false)
    private Boolean isRevoked = false;

    @Column(name = "CreatedAt", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
