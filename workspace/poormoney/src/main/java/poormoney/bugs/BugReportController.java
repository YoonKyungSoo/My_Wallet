package poormoney.bugs;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@RestController
public class BugReportController {
  private final BugReportRepository bugReportRepository;
  private final ObjectMapper objectMapper;
  private final UserRepository userRepository;

  public BugReportController(
      BugReportRepository bugReportRepository, ObjectMapper objectMapper, UserRepository userRepository) {
    this.bugReportRepository = bugReportRepository;
    this.objectMapper = objectMapper;
    this.userRepository = userRepository;
  }

  @PostMapping("/api/bug-reports")
  public ResponseEntity<Map<String, Object>> create(
      @RequestBody Map<String, Object> payload, Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    BugReportEntity e = new BugReportEntity();
    e.setReporterUserId(me.getId());
    e.setRestaurantNameSnapshot(String.valueOf(payload.getOrDefault("restaurantName", "")));
    e.setRestaurantAddressSnapshot(String.valueOf(payload.getOrDefault("restaurantAddress", "")));
    e.setBody(
        String.valueOf(
            payload.getOrDefault(
                "body", payload.getOrDefault("bugDescription", payload.getOrDefault("content", "")))));
    try {
      Object photos = payload.get("photos");
      e.setPhotosJson(objectMapper.writeValueAsString(photos == null ? List.of() : photos));
    } catch (Exception ignored) {
      e.setPhotosJson("[]");
    }
    e.setStatus("PENDING");
    e.setCreatedAt(LocalDateTime.now());
    e.setDecidedAt(null);
    e.setDecidedByAdminUserId(null);
    BugReportEntity saved = bugReportRepository.save(e);
    return ResponseEntity.ok(Map.of(
        "id", "bug-" + saved.getId(),
        "status", "open",
        "createdAt", saved.getCreatedAt().toString()
    ));
  }

  @GetMapping("/api/bug-reports/admin")
  public ResponseEntity<List<Map<String, Object>>> listAdmin() {
    List<Map<String, Object>> rows =
        bugReportRepository.findAll().stream()
            .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
            .map(e -> {
              Map<String, Object> m = new LinkedHashMap<>();
              m.put("id", "bug-" + e.getId());
              m.put("status", e.getStatus() == null ? null : e.getStatus().toLowerCase());
              m.put("createdAt", e.getCreatedAt().toString());
              m.put("updatedAt", e.getDecidedAt() == null ? null : e.getDecidedAt().toString());
              try {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("restaurantName", e.getRestaurantNameSnapshot());
                payload.put("restaurantAddress", e.getRestaurantAddressSnapshot());
                payload.put("body", e.getBody());
                payload.put("photos", objectMapper.readValue(e.getPhotosJson(), List.class));
                m.put("payload", payload);
              } catch (Exception ignored) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("restaurantName", e.getRestaurantNameSnapshot());
                payload.put("restaurantAddress", e.getRestaurantAddressSnapshot());
                payload.put("body", e.getBody());
                payload.put("photos", List.of());
                m.put("payload", payload);
              }
              return m;
            })
            .toList();
    return ResponseEntity.ok(rows);
  }

  @PatchMapping("/api/bug-reports/admin/{id}")
  public ResponseEntity<Void> setStatus(@PathVariable String id, @RequestBody Map<String, Object> body) {
    long pk = parseBugId(id);
    BugReportEntity e =
        bugReportRepository.findById(pk).orElseThrow(() -> new IllegalArgumentException("버그 제보를 찾을 수 없습니다."));
    Object status = body.get("status");
    if (status != null) e.setStatus(String.valueOf(status).trim().toUpperCase());
    e.setDecidedAt(LocalDateTime.now());
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

