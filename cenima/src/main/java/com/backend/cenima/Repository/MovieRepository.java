package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MovieRepository extends JpaRepository<Movie, Integer> {

    List<Movie> findByTitleContainingIgnoreCase(String title);

    List<Movie> findByStatus(Integer status);

    List<Movie> findByReleaseDateBetween(LocalDate startDate, LocalDate endDate);
}
