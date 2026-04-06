package poormoney.reports;

import jakarta.validation.Valid;
import java.security.Principal;
import java.time.LocalDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.reports.dto.CommentReportDtos;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@RestController
@RequestMapping("/api/comment-reports")
public class CommentReportController {
  private final CommentReportRepository commentReportRepository;
  private final UserRepository userRepository;

  public CommentReportController(CommentReportRepository commentReportRepository, UserRepository userRepository) {
    this.commentReportRepository = commentReportRepository;
    this.userRepository = userRepository;
  }

  @PostMapping
  public ResponseEntity<Void> create(
      @Valid @RequestBody CommentReportDtos.CreateRequest req, Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    CommentReportEntity e = new CommentReportEntity();
    e.setReporterUserId(me.getId());
    e.setCommentId(Long.parseLong(String.valueOf(req.commentId()).replaceFirst("^c-", "").replaceFirst("^comment-", "")));
    e.setReason(req.reason() == null ? "" : req.reason());
    e.setStatus("PENDING");
    e.setCreatedAt(LocalDateTime.now());
    e.setDecidedAt(null);
    e.setDecidedByAdminUserId(null);
    commentReportRepository.save(e);
    return ResponseEntity.ok().build();
  }
}

