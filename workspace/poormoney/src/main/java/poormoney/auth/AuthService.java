package poormoney.auth;

import java.time.LocalDateTime;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import poormoney.auth.dto.AuthDtos;
import poormoney.security.JwtService;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;
import poormoney.users.UserRole;

@Service
public class AuthService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      AuthenticationManager authenticationManager,
      JwtService jwtService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
  }

  @Transactional
  public AuthDtos.AuthUserResponse signup(AuthDtos.SignupRequest req) {
    if (userRepository.existsByLoginId(req.loginId())) {
      throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
    }
    if (userRepository.existsByNickname(req.nickname())) {
      throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
    }
    UserEntity u = new UserEntity();
    u.setLoginId(req.loginId());
    u.setPasswordHash(passwordEncoder.encode(req.password()));
    u.setNickname(req.nickname());
    u.setBio("");
    u.setProfileImageUrl("");
    u.setRole(UserRole.USER);
    u.setBanned(false);
    u.setBanReason("");
    u.setCreatedAt(LocalDateTime.now());
    UserEntity saved = userRepository.save(u);
    return toResponse(saved);
  }

  /**
   * 프론트 호환: 회원가입 후 즉시 로그인 응답 형태로 반환 (accessToken 포함).
   */
  @Transactional
  public AuthDtos.LoginResponse signupAndLogin(AuthDtos.SignupRequest req) {
    AuthDtos.AuthUserResponse user = signup(req);
    String role = user.role() == null ? "USER" : user.role();
    String token = jwtService.createAccessToken(user.id(), user.loginId(), role);
    return new AuthDtos.LoginResponse(token, token, user, null);
  }

  @Transactional(readOnly = true)
  public AuthDtos.LoginResponse login(AuthDtos.LoginRequest req) {
    UserEntity u =
        userRepository
            .findByLoginId(req.loginId())
            .orElseThrow(() -> new BadCredentialsException("아이디 또는 비밀번호가 올바르지 않습니다."));

    if (u.isBanned()) {
      AuthDtos.AuthUserResponse userRes = toResponse(u);
      return new AuthDtos.LoginResponse(null, null, userRes, u.getBanReason());
    }

    Authentication auth =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.loginId(), req.password()));

    if (!auth.isAuthenticated()) {
      throw new BadCredentialsException("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    String role = u.getRole() == null ? "USER" : u.getRole().name();
    String token = jwtService.createAccessToken(u.getId(), u.getLoginId(), role);
    return new AuthDtos.LoginResponse(token, token, toResponse(u), null);
  }

  @Transactional(readOnly = true)
  public AuthDtos.CheckLoginIdResponse checkLoginId(String loginId) {
    boolean available = loginId != null && !loginId.isBlank() && !userRepository.existsByLoginId(loginId);
    return new AuthDtos.CheckLoginIdResponse(available);
  }

  static AuthDtos.AuthUserResponse toResponse(UserEntity u) {
    String role = u.getRole() == null ? "USER" : u.getRole().name();
    return new AuthDtos.AuthUserResponse(
        u.getId(),
        u.getLoginId(),
        u.getNickname(),
        u.getBio(),
        u.getProfileImageUrl(),
        role,
        u.isBanned(),
        u.getBanReason());
  }
}

