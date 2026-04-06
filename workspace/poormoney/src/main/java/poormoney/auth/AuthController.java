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
  public ResponseEntity<AuthDtos.LoginResponse> signup(
      @Valid @RequestBody AuthDtos.SignupRequest req) {
    return ResponseEntity.ok(authService.signupAndLogin(req));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthDtos.LoginResponse> login(
      @Valid @RequestBody AuthDtos.LoginRequest req) {
    AuthDtos.LoginResponse res = authService.login(req);
    if (res.reason() != null && !res.reason().isBlank()) {
      return ResponseEntity.status(403).body(res);
    }
    return ResponseEntity.ok(res);
  }

  @GetMapping("/check-login-id")
  public ResponseEntity<AuthDtos.CheckLoginIdResponse> checkLoginId(@RequestParam String loginId) {
    return ResponseEntity.ok(authService.checkLoginId(loginId));
  }

  /**
   * 프론트 호환: GET /api/auth/exists/login?loginId=...
   * @return { exists: boolean }
   */
  @GetMapping("/exists/login")
  public ResponseEntity<AuthDtos.ExistsResponse> existsLogin(@RequestParam String loginId) {
    boolean exists = loginId != null && !loginId.isBlank() && userRepository.existsByLoginId(loginId);
    return ResponseEntity.ok(new AuthDtos.ExistsResponse(exists));
  }

  /**
   * 프론트 호환: GET /api/auth/exists/nickname?nickname=...
   * @return { exists: boolean }
   */
  @GetMapping("/exists/nickname")
  public ResponseEntity<AuthDtos.ExistsResponse> existsNickname(@RequestParam String nickname) {
    boolean exists = nickname != null && !nickname.isBlank() && userRepository.existsByNickname(nickname);
    return ResponseEntity.ok(new AuthDtos.ExistsResponse(exists));
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

