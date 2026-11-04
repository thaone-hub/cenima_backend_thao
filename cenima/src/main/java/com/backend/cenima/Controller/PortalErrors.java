package com.backend.cenima.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice(assignableTypes={PortalController.class,AuthController.class})
public class PortalErrors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",error.getReason()==null?"Yêu cầu không hợp lệ.":error.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> invalid(MethodArgumentNotValidException error) {
        return ResponseEntity.badRequest().body(Map.of("message","Kiểm tra lại thông tin. Mật khẩu cần 8–72 ký tự; email và các trường bắt buộc phải hợp lệ."));
    }
}
