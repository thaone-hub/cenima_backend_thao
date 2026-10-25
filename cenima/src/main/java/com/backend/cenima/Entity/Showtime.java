package com.backend.cenima.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Showtimes")
@Getter @Setter @NoArgsConstructor
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ShowtimeID")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "MovieID", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "RoomID", nullable = false)
    private Room room;

    @Column(name = "StartTime", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "Price", nullable = false, precision = 18, scale = 2)
    private BigDecimal price; // giá vé cơ bản
}