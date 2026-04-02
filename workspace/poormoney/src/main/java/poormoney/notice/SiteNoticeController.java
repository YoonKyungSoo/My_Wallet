package poormoney.notice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/site-notice")
public class SiteNoticeController {
  private final SiteNoticeRepository siteNoticeRepository;

  public SiteNoticeController(SiteNoticeRepository siteNoticeRepository) {
    this.siteNoticeRepository = siteNoticeRepository;
  }

  public record PutRequest(@NotNull @Size(max = 2000) String body, boolean active) {}

  @GetMapping
  public ResponseEntity<Map<String, Object>> get() {
    SiteNoticeEntity e = siteNoticeRepository.findAll().stream().findFirst().orElse(null);
    if (e == null) {
      return ResponseEntity.ok(Map.of("body", "", "active", false, "updatedAt", null));
    }
    return ResponseEntity.ok(Map.of(
        "body", e.getBody(),
        "active", e.isActive(),
        "updatedAt", e.getUpdatedAt().toString()
    ));
  }

  @PutMapping
  public ResponseEntity<Void> put(@Valid @RequestBody PutRequest req) {
    SiteNoticeEntity e = siteNoticeRepository.findAll().stream().findFirst().orElse(null);
    if (e == null) e = new SiteNoticeEntity();
    e.setBody(req.body() == null ? "" : req.body());
    e.setActive(req.active());
    e.setUpdatedAt(LocalDateTime.now());
    siteNoticeRepository.save(e);
    return ResponseEntity.ok().build();
  }
}

