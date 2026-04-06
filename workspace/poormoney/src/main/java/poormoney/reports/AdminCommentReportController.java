package poormoney.reports;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.mapcomments.MapCommentEntity;
import poormoney.mapcomments.MapCommentRepository;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@RestController
@RequestMapping("/api/comment-reports/admin")
public class AdminCommentReportController {
  private final CommentReportRepository commentReportRepository;
  private final MapCommentRepository mapCommentRepository;
  private final UserRepository userRepository;

  public AdminCommentReportController(
      CommentReportRepository commentReportRepository,
      MapCommentRepository mapCommentRepository,
      UserRepository userRepository) {
    this.commentReportRepository = commentReportRepository;
    this.mapCommentRepository = mapCommentRepository;
    this.userRepository = userRepository;
  }

  @GetMapping
  public ResponseEntity<List<Map<String, Object>>> list() {
    List<Map<String, Object>> rows =
        commentReportRepository.findAll().stream()
            .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
            .map(e -> {
              Map<String, Object> m = new LinkedHashMap<>();
              MapCommentEntity c =
                  e.getCommentId() == null ? null : mapCommentRepository.findById(e.getCommentId()).orElse(null);
              String restaurantName =
                  c == null || c.getRestaurant() == null ? "" : String.valueOf(c.getRestaurant().getName());
              String targetNickname = c == null ? "" : String.valueOf(c.getNicknameSnapshot());
              String preview = c == null ? "" : String.valueOf(c.getText() == null ? "" : c.getText());
              UserEntity reporter =
                  e.getReporterUserId() == null
                      ? null
                      : userRepository.findById(e.getReporterUserId()).orElse(null);
              String reporterNickname = reporter == null ? "" : String.valueOf(reporter.getNickname());

              m.put("id", e.getId());
              m.put("commentId", e.getCommentId() == null ? null : String.valueOf(e.getCommentId()));
              m.put("reason", e.getReason());
              m.put("status", e.getStatus() == null ? null : e.getStatus().toLowerCase());
              m.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
              m.put("decidedAt", e.getDecidedAt() == null ? null : e.getDecidedAt().toString());
              m.put("restaurantName", restaurantName);
              m.put("reporterNickname", reporterNickname);
              m.put("targetNickname", targetNickname);
              m.put("commentPreview", preview.length() > 160 ? preview.substring(0, 160) : preview);
              return m;
            })
            .toList();
    return ResponseEntity.ok(rows);
  }

  @PatchMapping("/{id}")
  public ResponseEntity<Void> setStatus(
      @PathVariable long id, @Valid @RequestBody poormoney.reports.dto.CommentReportDtos.UpdateStatusRequest req) {
    CommentReportEntity e =
        commentReportRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));
    e.setStatus(req.status());
    e.setDecidedAt(LocalDateTime.now());
    commentReportRepository.save(e);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable long id) {
    if (commentReportRepository.existsById(id)) {
      commentReportRepository.deleteById(id);
    }
    return ResponseEntity.ok().build();
  }
}

