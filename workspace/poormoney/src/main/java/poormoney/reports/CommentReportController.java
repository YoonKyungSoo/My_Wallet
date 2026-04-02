package poormoney.reports;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.reports.dto.CommentReportDtos;

@RestController
@RequestMapping("/api/comment-reports")
public class CommentReportController {
  private final CommentReportRepository commentReportRepository;

  public CommentReportController(CommentReportRepository commentReportRepository) {
    this.commentReportRepository = commentReportRepository;
  }

  @PostMapping
  public ResponseEntity<Void> create(@Valid @RequestBody CommentReportDtos.CreateRequest req) {
    CommentReportEntity e = new CommentReportEntity();
    e.setCommentId(String.valueOf(req.commentId()));
    e.setReason(req.reason());
    e.setStatus("open");
    e.setCreatedAt(LocalDateTime.now());
    e.setUpdatedAt(null);
    commentReportRepository.save(e);
    return ResponseEntity.ok().build();
  }
}

