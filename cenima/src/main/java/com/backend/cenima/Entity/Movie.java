package com.backend.cenima.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "Movies")
@Getter @Setter @NoArgsConstructor
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MovieID")
    private Integer id;

    @Column(name = "Title", nullable = false, length = 200)
    private String title;

    @Column(name = "Description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "Duration", nullable = false)
    private Integer duration; // phút

    @Column(name = "ReleaseDate", nullable = false)
    private LocalDate releaseDate;

    @Column(name = "Director", length = 100)
    private String director;

    @Column(name = "PosterURL", length = 500)
    private String posterUrl;

    // 1: Đang chiếu, 2: Sắp chiếu, 0: Ngừng chiếu
    @Column(name = "Status")
    private Integer status = 1;
}