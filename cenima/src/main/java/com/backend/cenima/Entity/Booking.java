package com.backend.cenima.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Bookings")
@Getter @Setter @NoArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "BookingID")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "UserID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ShowtimeID", nullable = false)
    private Showtime showtime;

    @Column(name = "BookingTime", insertable = false, updatable = false)
    private LocalDateTime bookingTime;

    @Column(name = "TotalPrice", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status", length = 20)
    private BookingStatus status = BookingStatus.PENDING;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingDetail> details = new ArrayList<>();

    public void addDetail(BookingDetail detail) {
        details.add(detail);
        detail.setBooking(this);
    }

    public enum BookingStatus { PENDING, PAID, CANCELLED }
}