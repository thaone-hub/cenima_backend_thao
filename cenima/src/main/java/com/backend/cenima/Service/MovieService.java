package com.backend.cenima.Service;

import com.backend.cenima.DTO.MovieResponse;
import com.backend.cenima.DTO.ShowtimeResponse;
import com.backend.cenima.Entity.Movie;
import com.backend.cenima.Entity.Showtime;
import com.backend.cenima.Repository.MovieRepository;
import com.backend.cenima.Repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.Clock;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MovieService {
    private final Clock clock;

    private final MovieRepository movieRepo;
    private final ShowtimeRepository showtimeRepo;

    // Danh sách phim theo trạng thái (1 = đang chiếu), mới nhất lên đầu
    @Transactional(readOnly = true)
    public List<MovieResponse> getMovies(Integer status) {
        return movieRepo.findByStatus(status).stream()
                .sorted(Comparator.comparing(Movie::getReleaseDate).reversed())
                .map(this::toMovieResponse)
                .toList();
    }

    // Suất chiếu chưa bắt đầu của một phim
    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getUpcomingShowtimes(Integer movieId) {
        if (!movieRepo.existsById(movieId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Phim không tồn tại");
        }
        return showtimeRepo.findByMovie_IdAndStartTimeAfterOrderByStartTimeAsc(movieId, LocalDateTime.now(clock))
                .stream()
                .map(this::toShowtimeResponse)
                .toList();
    }

    private MovieResponse toMovieResponse(Movie m) {
        return new MovieResponse(m.getId(), m.getTitle(), m.getDescription(), m.getDuration(),
                m.getReleaseDate(), m.getDirector(), m.getPosterUrl(), m.getStatus());
    }

    private ShowtimeResponse toShowtimeResponse(Showtime s) {
        return new ShowtimeResponse(s.getId(), s.getMovie().getId(), s.getRoom().getId(),
                s.getRoom().getRoomName(), s.getStartTime(), s.getPrice());
    }
}
