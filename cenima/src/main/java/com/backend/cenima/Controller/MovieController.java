package com.backend.cenima.Controller;

import com.backend.cenima.DTO.MovieResponse;
import com.backend.cenima.DTO.ShowtimeResponse;
import com.backend.cenima.Service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    // GET /api/movies           -> phim đang chiếu
    // GET /api/movies?status=2  -> phim sắp chiếu
    @GetMapping
    public List<MovieResponse> list(@RequestParam(defaultValue = "1") Integer status) {
        return movieService.getMovies(status);
    }

    // GET /api/movies/{id}/showtimes
    @GetMapping("/{id}/showtimes")
    public List<ShowtimeResponse> showtimes(@PathVariable Integer id) {
        return movieService.getUpcomingShowtimes(id);
    }
}