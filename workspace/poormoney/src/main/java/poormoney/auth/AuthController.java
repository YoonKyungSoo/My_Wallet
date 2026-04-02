package poormoney.auth;

import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import poormoney.auth.dto.AuthDtos;
import poormoney.users.UserRepository;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;
  private final UserRepository userRepository;

  public AuthController(AuthService authService, UserRepository userRepository) {
    this.authService = authService;
    this.userRepository = userRepository;
  }

  @PostMapping("/signup")
  public ResponseEntity<AuthDtos.AuthUserResponse> signup(
      @Valid @RequestBody AuthDtos.SignupRequest req) {
    return ResponseEntity.ok(authService.signup(req));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthDtos.LoginResponse> login(
      @Valid @RequestBody AuthDtos.LoginRequest req) {
    return ResponseEntity.ok(authService.login(req));
  }

  @GetMapping("/check-login-id")
  public ResponseEntity<AuthDtos.CheckLoginIdResponse> checkLoginId(@RequestParam String loginId) {
    return ResponseEntity.ok(authService.checkLoginId(loginId));
  }

  @GetMapping("/me")
  public ResponseEntity<AuthDtos.AuthUserResponse> me(Principal principal) {
    if (principal == null) {
      return ResponseEntity.status(401).build();
    }
    return userRepository
        .findByLoginId(principal.getName())
        .map(AuthService::toResponse)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.status(401).build());
  }
}

