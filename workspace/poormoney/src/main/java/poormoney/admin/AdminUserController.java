package poormoney.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;
import poormoney.users.UserRole;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
  private final UserRepository userRepository;

  public AdminUserController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  record AdminUserRow(String loginId, String nickname, String role, boolean banned) {}

  @GetMapping
  public ResponseEntity<List<AdminUserRow>> list() {
    List<AdminUserRow> rows =
        userRepository.findAll().stream()
            .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
            .map(u -> new AdminUserRow(
                u.getLoginId(),
                u.getNickname(),
                u.getRole() == null ? "USER" : u.getRole().name(),
                u.isBanned()))
            .toList();
    return ResponseEntity.ok(rows);
  }

  record BannedPatch(boolean banned) {}

  @PatchMapping("/{loginId}/banned")
  public ResponseEntity<Void> setBanned(@PathVariable String loginId, @RequestBody BannedPatch req) {
    UserEntity u =
        userRepository.findByLoginId(loginId).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    u.setBanned(req.banned());
    if (!req.banned()) {
      u.setBanReason(null);
    } else if (u.getBanReason() == null) {
      u.setBanReason("관리자에 의해 정지되었습니다.");
    }
    userRepository.save(u);
    return ResponseEntity.ok().build();
  }

  record RolePatch(@NotBlank String role) {}

  @PatchMapping("/{loginId}/role")
  public ResponseEntity<Void> setRole(@PathVariable String loginId, @Valid @RequestBody RolePatch req) {
    UserEntity u =
        userRepository.findByLoginId(loginId).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    String r = req.role().trim().toUpperCase();
    if ("ADMIN".equals(r)) u.setRole(UserRole.ADMIN);
    else if ("USER".equals(r)) u.setRole(UserRole.USER);
    else throw new IllegalArgumentException("role 은 user/admin 이어야 합니다.");
    userRepository.save(u);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/{loginId}")
  public ResponseEntity<Void> delete(@PathVariable String loginId) {
    if (!userRepository.existsByLoginId(loginId)) return ResponseEntity.ok().build();
    userRepository.deleteByLoginId(loginId);
    return ResponseEntity.ok().build();
  }
}

