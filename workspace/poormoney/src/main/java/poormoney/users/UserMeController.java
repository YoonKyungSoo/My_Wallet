package poormoney.users;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.bookmarks.BookmarkRepository;
import poormoney.mapcomments.MapCommentRepository;

@RestController
@RequestMapping("/api/users/me")
public class UserMeController {
  private final UserRepository userRepository;
  private final MapCommentRepository mapCommentRepository;
  private final BookmarkRepository bookmarkRepository;

  public UserMeController(
      UserRepository userRepository,
      MapCommentRepository mapCommentRepository,
      BookmarkRepository bookmarkRepository) {
    this.userRepository = userRepository;
    this.mapCommentRepository = mapCommentRepository;
    this.bookmarkRepository = bookmarkRepository;
  }

  @GetMapping("/stats")
  public ResponseEntity<Map<String, Object>> stats(Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    int savedRestaurantCount = bookmarkRepository.countByUserId(me.getId());
    int commentCount = mapCommentRepository.countByUserId(me.getId());
    int ratingCount = mapCommentRepository.countByUserIdAndRatingIsNotNull(me.getId());

    return ResponseEntity.ok(Map.of(
        "reportCount", 0,
        "photoReportCount", 0,
        "savedRestaurantCount", savedRestaurantCount,
        "badgeCount", 0,
        "commentCount", commentCount,
        "ratingCount", ratingCount,
        "streakDays", 0
    ));
  }
}

