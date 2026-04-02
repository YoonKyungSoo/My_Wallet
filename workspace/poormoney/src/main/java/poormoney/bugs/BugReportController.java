package poormoney.bugs;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BugReportController {
  private final BugReportRepository bugReportRepository;
  private final ObjectMapper objectMapper;

  public BugReportController(BugReportRepository bugReportRepository, ObjectMapper objectMapper) {
    this.bugReportRepository = bugReportRepository;
    this.objectMapper = objectMapper;
  }

  @PostMapping("/api/bug-reports")
  public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> payload) {
    BugReportEntity e = new BugReportEntity();
    e.setStatus("open");
    try {
      e.setPayloadJson(objectMapper.writeValueAsString(payload));
    } catch (Exception ignored) {
      e.setPayloadJson("{}");
    }
    e.setCreatedAt(LocalDateTime.now());
    e.setUpdatedAt(null);
    BugReportEntity saved = bugReportRepository.save(e);
    return ResponseEntity.ok(Map.of(
        "id", "bug-" + saved.getId(),
        "status", saved.getStatus(),
        "createdAt", saved.getCreatedAt().toString()
    ));
  }

  @GetMapping("/api/bug-reports/admin")
  public ResponseEntity<List<Map<String, Object>>> listAdmin() {
    List<Map<String, Object>> rows =
        bugReportRepository.findAll().stream()
            .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
            .map(e -> Map.of(
                "id", "bug-" + e.getId(),
                "status", e.getStatus(),
                "createdAt", e.getCreatedAt().toString(),
                "updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString(),
                "payloadJson", e.getPayloadJson()
            ))
            .toList();
    return ResponseEntity.ok(rows);
  }

  @PatchMapping("/api/bug-reports/admin/{id}")
  public ResponseEntity<Void> setStatus(@PathVariable String id, @RequestBody Map<String, Object> body) {
    long pk = parseBugId(id);
    BugReportEntity e =
        bugReportRepository.findById(pk).orElseThrow(() -> new IllegalArgumentException("버그 제보를 찾을 수 없습니다."));
    Object status = body.get("status");
    if (status != null) e.setStatus(String.valueOf(status));
    e.setUpdatedAt(LocalDateTime.now());
    bugReportRepository.save(e);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/api/bug-reports/admin/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    long pk = parseBugId(id);
    if (bugReportRepository.existsById(pk)) bugReportRepository.deleteById(pk);
    return ResponseEntity.ok().build();
  }

  private static long parseBugId(String id) {
    String s = String.valueOf(id);
    if (s.startsWith("bug-")) s = s.substring(4);
    return Long.parseLong(s);
  }
}

