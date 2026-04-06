package poormoney.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.activity.ActivityEventRepository;
import poormoney.bookmarks.BookmarkRepository;
import poormoney.bugs.BugReportRepository;
import poormoney.mapcomments.MapCommentEntity;
import poormoney.mapcomments.MapCommentPhotoRepository;
import poormoney.mapcomments.MapCommentRepository;
import poormoney.reports.CommentReportRepository;
import poormoney.unban.UnbanRequestRepository;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;
import poormoney.users.UserRole;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
  private final UserRepository userRepository;
  private final MapCommentRepository mapCommentRepository;
  private final MapCommentPhotoRepository mapCommentPhotoRepository;
  private final BookmarkRepository bookmarkRepository;
  private final ActivityEventRepository activityEventRepository;
  private final UnbanRequestRepository unbanRequestRepository;
  private final CommentReportRepository commentReportRepository;
  private final BugReportRepository bugReportRepository;

  public AdminUserController(
      UserRepository userRepository,
      MapCommentRepository mapCommentRepository,
      MapCommentPhotoRepository mapCommentPhotoRepository,
      BookmarkRepository bookmarkRepository,
      ActivityEventRepository activityEventRepository,
      UnbanRequestRepository unbanRequestRepository,
      CommentReportRepository commentReportRepository,
      BugReportRepository bugReportRepository) {
    this.userRepository = userRepository;
    this.mapCommentRepository = mapCommentRepository;
    this.mapCommentPhotoRepository = mapCommentPhotoRepository;
    this.bookmarkRepository = bookmarkRepository;
    this.activityEventRepository = activityEventRepository;
    this.unbanRequestRepository = unbanRequestRepository;
    this.commentReportRepository = commentReportRepository;
    this.bugReportRepository = bugReportRepository;
  }

  record AdminUserRow(String loginId, String nickname, String role, boolean banned) {}

  @GetMapping
  public ResponseEntity<List<AdminUserRow>> list() {
    List<AdminUserRow> rows =
        userRepository.findAll().stream()
            .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
            .map(u -> new AdminUserRow(
                u.getLoginId(),
                u.getNickname(),
                u.getRole() == null ? "USER" : u.getRole().name(),
                u.isBanned()))
            .toList();
    return ResponseEntity.ok(rows);
  }

  record BannedPatch(boolean banned, String reason) {}

  @PatchMapping("/{loginId}/banned")
  public ResponseEntity<Void> setBanned(@PathVariable String loginId, @RequestBody BannedPatch req) {
    UserEntity u =
        userRepository.findByLoginId(loginId).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    u.setBanned(req.banned());
    if (!req.banned()) {
      u.setBanReason("");
    } else {
      String reason = req.reason() == null ? "" : req.reason().trim();
      if (reason.isEmpty()) {
        reason = "관리자에 의해 정지되었습니다.";
      }
      u.setBanReason(reason);
    }
    userRepository.save(u);
    return ResponseEntity.ok().build();
  }

  record RolePatch(@NotBlank String role) {}

  @PatchMapping("/{loginId}/role")
  public ResponseEntity<Void> setRole(@PathVariable String loginId, @Valid @RequestBody RolePatch req) {
    UserEntity u =
        userRepository.findByLoginId(loginId).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    String r = req.role().trim().toUpperCase();
    if ("ADMIN".equals(r)) u.setRole(UserRole.ADMIN);
    else if ("USER".equals(r)) u.setRole(UserRole.USER);
    else throw new IllegalArgumentException("role 은 user/admin 이어야 합니다.");
    userRepository.save(u);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/{loginId}")
  @Transactional
  public ResponseEntity<Void> delete(@PathVariable String loginId) {
    UserEntity target = userRepository.findByLoginId(loginId).orElse(null);
    if (target == null) return ResponseEntity.ok().build();
    Long userId = target.getId();

    // FK 의존 데이터부터 정리한 뒤 사용자 삭제
    List<MapCommentEntity> comments = mapCommentRepository.findByUserId(userId);
    if (!comments.isEmpty()) {
      List<Long> commentIds = comments.stream().map(MapCommentEntity::getId).toList();
      mapCommentPhotoRepository.deleteByMapCommentIdIn(commentIds);
      mapCommentRepository.deleteByUserId(userId);
    }
    bookmarkRepository.deleteByUserId(userId);
    activityEventRepository.deleteByUserId(userId);
    unbanRequestRepository.deleteByUserId(userId);
    unbanRequestRepository.deleteByDecidedByAdminUserId(userId);
    commentReportRepository.deleteByReporterUserId(userId);
    commentReportRepository.deleteByDecidedByAdminUserId(userId);
    bugReportRepository.deleteByReporterUserId(userId);
    bugReportRepository.deleteByDecidedByAdminUserId(userId);
    userRepository.delete(target);
    return ResponseEntity.ok().build();
  }
}

