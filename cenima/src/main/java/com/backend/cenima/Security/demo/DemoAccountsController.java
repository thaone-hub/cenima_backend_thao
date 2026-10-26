package com.backend.cenima.Security.demo;
import com.backend.cenima.Repository.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
@RestController
@RequestMapping("/api/demo/accounts")
@Profile("demo & !integrated")
@RequiredArgsConstructor
public class DemoAccountsController {
    private final UserRepository users;
    @GetMapping @Transactional(readOnly=true)
    public List<Account> accounts() {
        return users.findByIsActiveTrue().stream().map(u->new Account(u.getId(),u.getFullName(),u.getRole().getRoleName())).toList();
    }
    public record Account(Integer userId,String fullName,String role) {}
}
