package poormoney.activity;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@RestController
@RequestMapping("/api/activity-events")
public class ActivityEventController {
  private final ActivityEventRepository activityEventRepository;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  public ActivityEventController(
      ActivityEventRepository activityEventRepository,
      UserRepository userRepository,
      ObjectMapper objectMapper) {
    this.activityEventRepository = activityEventRepository;
    this.userRepository = userRepository;
    this.objectMapper = objectMapper;
  }

  public record CreateRequest(@NotBlank String type, Object payload) {}

  @PostMapping
  public ResponseEntity<Void> create(@Valid @RequestBody CreateRequest req, Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    ActivityEventEntity e = new ActivityEventEntity();
    e.setUser(me);
    e.setType(req.type());
    try {
      e.setPayloadJson(objectMapper.writeValueAsString(req.payload()));
    } catch (Exception ignored) {
      e.setPayloadJson("{}");
    }
    e.setCreatedAt(LocalDateTime.now());
    activityEventRepository.save(e);
    return ResponseEntity.ok().build();
  }

  @GetMapping
  public ResponseEntity<List<Map<String, Object>>> list(Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    List<Map<String, Object>> rows =
        activityEventRepository.findTop100ByUserIdOrderByIdDesc(me.getId()).stream()
            .map(e -> Map.of(
                "id", String.valueOf(e.getId()),
                "type", e.getType(),
                "createdAt", e.getCreatedAt().toString(),
                "payload", readPayload(e.getPayloadJson())))
            .toList();
    return ResponseEntity.ok(rows);
  }

  private Object readPayload(String json) {
    if (json == null || json.isBlank()) return Map.of();
    try {
      return objectMapper.readValue(json, Object.class);
    } catch (Exception e) {
      return Map.of();
    }
  }
}

