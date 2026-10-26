package com.backend.cenima.DTO.ticket;
import java.util.Map;
public record JwtPayload(Integer ticketId, Integer movieId, Integer showtimeId, String seatCode, long iat, long exp) {
    public Map<String,Object> claims() {
        return Map.of("ticketId",ticketId,"movieId",movieId,"showtimeId",showtimeId,"seatCode",seatCode,
            "iat",iat,"exp",exp,"iss","cinema-ticket","aud","cinema-checkin");
    }
}
