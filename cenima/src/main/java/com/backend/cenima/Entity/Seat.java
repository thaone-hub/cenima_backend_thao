package com.backend.cenima.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "Seats")
@Getter @Setter @NoArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "SeatID")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "RoomID", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Room room;

    @Column(name = "RowName", nullable = false, length = 5)
    private String rowName; // A, B, C...

    @Column(name = "SeatNumber", nullable = false)
    private Integer seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "SeatType", length = 20)
    private SeatType seatType = SeatType.STANDARD;

    public enum SeatType { STANDARD, VIP, COUPLE }
}