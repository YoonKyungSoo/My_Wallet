package poormoney.reports;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.reports.dto.CommentReportDtos;

@RestController
@RequestMapping("/api/comment-reports/admin")
public class AdminCommentReportController {
  private final CommentReportRepository commentReportRepository;

  public AdminCommentReportController(CommentReportRepository commentReportRepository) {
    this.commentReportRepository = commentReportRepository;
  }

  @GetMapping
  public ResponseEntity<List<CommentReportDtos.AdminRow>> list() {
    List<CommentReportDtos.AdminRow> rows =
        commentReportRepository.findAll().stream()
            .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
            .map(e -> CommentReportDtos.toRow(
                e.getId(),
                e.getCommentId(),
                e.getReason(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt()))
            .toList();
    return ResponseEntity.ok(rows);
  }

  @PatchMapping("/{id}")
  public ResponseEntity<Void> setStatus(
      @PathVariable long id, @Valid @RequestBody CommentReportDtos.UpdateStatusRequest req) {
    CommentReportEntity e =
        commentReportRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));
    e.setStatus(req.status());
    e.setUpdatedAt(LocalDateTime.now());
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

