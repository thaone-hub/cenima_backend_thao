package com.backend.cenima.Controller;
import com.backend.cenima.Service.TicketException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
/** Preserve Tùng's booking errors; translate only errors from the shared identity adapter. */
@RestControllerAdvice(assignableTypes=BookingController.class)
public class BookingActorErrors {
    @ExceptionHandler(TicketException.class)
    ResponseEntity<TicketErrors.Error> identity(TicketException e) {
        return ResponseEntity.status(e.status()).body(new TicketErrors.Error(e.code(),e.getMessage()));
    }
}
