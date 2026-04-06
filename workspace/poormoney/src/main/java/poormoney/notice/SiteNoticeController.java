package poormoney.notice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@RestController
@RequestMapping("/api/site-notice")
public class SiteNoticeController {
  private final SiteNoticeRepository siteNoticeRepository;
  private final UserRepository userRepository;

  public SiteNoticeController(SiteNoticeRepository siteNoticeRepository, UserRepository userRepository) {
    this.siteNoticeRepository = siteNoticeRepository;
    this.userRepository = userRepository;
  }

  public record PutRequest(@NotNull @Size(max = 2000) String body, boolean active) {}

  @GetMapping
  public ResponseEntity<Map<String, Object>> get() {
    SiteNoticeEntity e = siteNoticeRepository.findAll().stream().findFirst().orElse(null);
    if (e == null) {
      Map<String, Object> res = new LinkedHashMap<>();
      res.put("body", "");
      res.put("active", false);
      res.put("updatedAt", null);
      return ResponseEntity.ok(res);
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("body", e.getBody());
    res.put("active", e.isActive());
    res.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return ResponseEntity.ok(res);
  }

  @PutMapping
  public ResponseEntity<Void> put(
      @Valid @RequestBody PutRequest req, Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    SiteNoticeEntity e = siteNoticeRepository.findAll().stream().findFirst().orElse(null);
    if (e == null) e = new SiteNoticeEntity();
    e.setBody(req.body() == null ? "" : req.body());
    e.setActive(req.active());
    e.setUpdatedAt(LocalDateTime.now());
    e.setUpdatedByAdminUserId(me.getId());
    siteNoticeRepository.save(e);
    return ResponseEntity.ok().build();
  }
}

