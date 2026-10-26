package com.backend.cenima.Controller;
import com.backend.cenima.Service.TicketException;
import io.jsonwebtoken.JwtException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.PessimisticLockingFailureException;
@RestControllerAdvice(assignableTypes=TicketController.class)
public class TicketErrors {
    public record Error(String code,String message) {}
    @ExceptionHandler(TicketException.class) ResponseEntity<Error> ticket(TicketException e) { return ResponseEntity.status(e.status()).body(new Error(e.code(),e.getMessage())); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class})
    ResponseEntity<Error> badInput(Exception e) { return ResponseEntity.badRequest().body(new Error("INPUT_INVALID","Dữ liệu đầu vào không hợp lệ")); }
    @ExceptionHandler(JwtException.class) ResponseEntity<Error> jwt(JwtException e) { return ResponseEntity.status(422).body(new Error("TOKEN_INVALID","JWT sai hoặc đã hết hạn")); }
    @ExceptionHandler(PessimisticLockingFailureException.class) ResponseEntity<Error> locked(Exception e) { return ResponseEntity.status(409).body(new Error("TICKET_BUSY","Vé đang được xử lý, thử lại")); }
}
