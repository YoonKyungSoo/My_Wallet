package poormoney.users;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.bookmarks.BookmarkRepository;
import poormoney.mapcomments.MapCommentRepository;
import poormoney.submissions.RestaurantSubmissionRepository;

@RestController
@RequestMapping("/api/users/me")
public class UserMeController {
  private final UserRepository userRepository;
  private final MapCommentRepository mapCommentRepository;
  private final BookmarkRepository bookmarkRepository;
  private final RestaurantSubmissionRepository restaurantSubmissionRepository;
  private final PasswordEncoder passwordEncoder;

  public UserMeController(
      UserRepository userRepository,
      MapCommentRepository mapCommentRepository,
      BookmarkRepository bookmarkRepository,
      RestaurantSubmissionRepository restaurantSubmissionRepository,
      PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.mapCommentRepository = mapCommentRepository;
    this.bookmarkRepository = bookmarkRepository;
    this.restaurantSubmissionRepository = restaurantSubmissionRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public record UpdateProfileRequest(String nickname, String bio, String profileImageUrl) {}

  public record ChangePasswordRequest(String currentPassword, String newPassword) {}

  public record MeResponse(
      long id,
      String loginId,
      String nickname,
      String bio,
      String profileImageUrl,
      String role,
      boolean banned,
      String banReason) {}

  @GetMapping("/stats")
  public ResponseEntity<Map<String, Object>> stats(Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    int savedRestaurantCount = bookmarkRepository.countByUserId(me.getId());
    int commentCount = mapCommentRepository.countByUserId(me.getId());
    int ratingCount = mapCommentRepository.countByUserIdAndRatingIsNotNull(me.getId());
    int reportCount = restaurantSubmissionRepository.countBySubmitterUserId(me.getId());
    int photoReportCount = restaurantSubmissionRepository.countPhotoReportsBySubmitterUserId(me.getId());
    int badgeCount =
        countAchievedBadges(
            reportCount,
            photoReportCount,
            savedRestaurantCount,
            commentCount,
            ratingCount,
            0);

    return ResponseEntity.ok(Map.of(
        "reportCount", reportCount,
        "photoReportCount", photoReportCount,
        "savedRestaurantCount", savedRestaurantCount,
        "badgeCount", badgeCount,
        "commentCount", commentCount,
        "ratingCount", ratingCount,
        "streakDays", 0
    ));
  }

  @PatchMapping
  public ResponseEntity<MeResponse> updateProfile(
      Principal principal, @RequestBody UpdateProfileRequest req) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository
            .findByLoginId(principal.getName())
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    String nickname = req == null || req.nickname() == null ? "" : req.nickname().trim();
    if (nickname.isEmpty()) throw new IllegalArgumentException("닉네임을 입력해 주세요.");
    if (!nickname.equals(me.getNickname()) && userRepository.existsByNickname(nickname)) {
      throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
    }

    me.setNickname(nickname);
    me.setBio(req == null || req.bio() == null ? "" : req.bio().trim());
    me.setProfileImageUrl(req == null || req.profileImageUrl() == null ? "" : req.profileImageUrl().trim());
    UserEntity saved = userRepository.save(me);
    return ResponseEntity.ok(
        new MeResponse(
            saved.getId(),
            saved.getLoginId(),
            saved.getNickname(),
            saved.getBio(),
            saved.getProfileImageUrl(),
            saved.getRole() == null ? "USER" : saved.getRole().name(),
            saved.isBanned(),
            saved.getBanReason()));
  }

  @PatchMapping("/password")
  public ResponseEntity<Void> changePassword(
      Principal principal, @RequestBody ChangePasswordRequest req) {
    if (principal == null) return ResponseEntity.status(401).build();
    UserEntity me =
        userRepository
            .findByLoginId(principal.getName())
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    String current = req == null || req.currentPassword() == null ? "" : req.currentPassword();
    String next = req == null || req.newPassword() == null ? "" : req.newPassword();
    if (current.isBlank()) throw new IllegalArgumentException("현재 비밀번호를 입력해 주세요.");
    if (next.isBlank()) throw new IllegalArgumentException("새 비밀번호를 입력해 주세요.");
    if (next.length() < 4) throw new IllegalArgumentException("새 비밀번호는 4자 이상이어야 합니다.");
    if (!passwordEncoder.matches(current, me.getPasswordHash())) {
      throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
    }

    me.setPasswordHash(passwordEncoder.encode(next));
    userRepository.save(me);
    return ResponseEntity.ok().build();
  }

  private static int countAchievedBadges(
      int reportCount,
      int photoReportCount,
      int savedRestaurantCount,
      int commentCount,
      int ratingCount,
      int streakDays) {
    int c = 0;
    if (reportCount >= 1) c++;
    if (photoReportCount >= 1) c++;
    if (reportCount >= 5) c++;
    if (commentCount >= 10) c++;
    if (reportCount >= 20) c++;
    if (commentCount >= 100) c++;
    if (ratingCount >= 50) c++;
    if (savedRestaurantCount >= 30) c++;
    if (streakDays >= 7) c++;
    if (commentCount >= 100 && reportCount >= 100) c++;
    return c;
  }
}

