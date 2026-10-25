package com.backend.cenima.Repository;

import com.backend.cenima.Entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Integer> {

    Optional<RefreshToken> findByToken(String token);

    List<RefreshToken> findByUser_Id(Integer userId);

    List<RefreshToken> findByUser_IdAndIsRevokedFalse(Integer userId);

    void deleteByUser_Id(Integer userId);
}
