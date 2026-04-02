package poormoney.unban;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/unban-requests")
public class UnbanRequestController {
  private final UnbanRequestRepository unbanRequestRepository;

  public UnbanRequestController(UnbanRequestRepository unbanRequestRepository) {
    this.unbanRequestRepository = unbanRequestRepository;
  }

  public record PublicCreateRequest(@NotBlank String loginId) {}

  @PostMapping
  public ResponseEntity<Map<String, Object>> createForLoggedIn(Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    return ResponseEntity.ok(createInternal(principal.getName()));
  }

  @PostMapping("/public")
  public ResponseEntity<Map<String, Object>> createPublic(@Valid @RequestBody PublicCreateRequest req) {
    return ResponseEntity.ok(createInternal(req.loginId()));
  }

  private Map<String, Object> createInternal(String loginIdRaw) {
    String loginId = loginIdRaw == null ? "" : loginIdRaw.trim();
    if (loginId.isEmpty()) return Map.of("ok", false, "reason", "아이디를 확인할 수 없습니다.");
    boolean existsPending =
        unbanRequestRepository.findFirstByLoginIdAndStatusOrderByIdDesc(loginId, "pending").isPresent();
    if (existsPending) return Map.of("ok", false, "reason", "이미 정지 해제 요청이 접수되어 있습니다.");

    UnbanRequestEntity e = new UnbanRequestEntity();
    e.setLoginId(loginId);
    e.setStatus("pending");
    e.setCreatedAt(LocalDateTime.now());
    e.setUpdatedAt(null);
    unbanRequestRepository.save(e);
    return Map.of("ok", true);
  }

  @GetMapping("/admin")
  public ResponseEntity<List<Map<String, Object>>> listAdmin() {
    List<Map<String, Object>> rows =
        unbanRequestRepository.findAll().stream()
            .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
            .map(e -> Map.of(
                "id", "ubr-" + e.getId(),
                "userId", e.getLoginId(),
                "status", e.getStatus(),
                "createdAt", e.getCreatedAt().toString(),
                "updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString()
            ))
            .toList();
    return ResponseEntity.ok(rows);
  }

  public record UpdateStatusRequest(@NotBlank String status) {}

  @PatchMapping("/admin/{id}")
  public ResponseEntity<Void> setStatus(@PathVariable String id, @Valid @RequestBody UpdateStatusRequest req) {
    long pk = parseUbrId(id);
    UnbanRequestEntity e =
        unbanRequestRepository.findById(pk).orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다."));
    e.setStatus(req.status());
    e.setUpdatedAt(LocalDateTime.now());
    unbanRequestRepository.save(e);
    return ResponseEntity.ok().build();
  }

  private static long parseUbrId(String id) {
    String s = String.valueOf(id);
    if (s.startsWith("ubr-")) s = s.substring(4);
    return Long.parseLong(s);
  }
}

