package poormoney.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {
  public record SignupRequest(
      @NotBlank @Size(max = 50) String loginId,
      @NotBlank @Size(min = 4, max = 100) String password,
      @NotBlank @Size(max = 50) String nickname) {}

  public record LoginRequest(
      @NotBlank @Size(max = 50) String loginId,
      @NotBlank @Size(min = 4, max = 100) String password) {}

  public record AuthUserResponse(
      long id,
      String loginId,
      String nickname,
      String levelTitle,
      String role,
      boolean banned,
      String banReason) {}

  public record LoginResponse(
      String token,
      AuthUserResponse user,
      String reason) {}

  public record CheckLoginIdResponse(boolean available) {}
}

