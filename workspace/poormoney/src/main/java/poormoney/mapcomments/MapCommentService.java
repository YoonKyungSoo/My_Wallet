package poormoney.mapcomments;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import poormoney.mapcomments.dto.MapCommentDtos;
import poormoney.restaurants.RestaurantEntity;
import poormoney.restaurants.RestaurantRepository;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@Service
public class MapCommentService {
  private final MapCommentRepository mapCommentRepository;
  private final MapCommentPhotoRepository mapCommentPhotoRepository;
  private final UserRepository userRepository;
  private final RestaurantRepository restaurantRepository;

  public MapCommentService(
      MapCommentRepository mapCommentRepository,
      MapCommentPhotoRepository mapCommentPhotoRepository,
      UserRepository userRepository,
      RestaurantRepository restaurantRepository) {
    this.mapCommentRepository = mapCommentRepository;
    this.mapCommentPhotoRepository = mapCommentPhotoRepository;
    this.userRepository = userRepository;
    this.restaurantRepository = restaurantRepository;
  }

  @Transactional(readOnly = true)
  public List<MapCommentDtos.Response> listByRestaurantName(String restaurantName) {
    if (restaurantName == null || restaurantName.isBlank()) return List.of();
    return mapCommentRepository.findByRestaurant_NameOrderByIdAsc(restaurantName).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public MapCommentDtos.Response create(MapCommentDtos.CreateRequest req, Principal principal) {
    String loginId = principal == null ? null : principal.getName();
    if (loginId == null) throw new IllegalArgumentException("로그인이 필요합니다.");
    UserEntity user =
        userRepository.findByLoginId(loginId).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    String restaurantName = req.restaurantName() == null ? "" : req.restaurantName().trim();
    if (restaurantName.isEmpty()) throw new IllegalArgumentException("restaurantName 이 필요합니다.");
    RestaurantEntity restaurant =
        restaurantRepository.findByName(restaurantName).orElseThrow(() -> new IllegalArgumentException("식당을 찾을 수 없습니다."));

    MapCommentEntity e = new MapCommentEntity();
    e.setRestaurant(restaurant);
    e.setUser(user);
    e.setNicknameSnapshot(user.getNickname());
    String levelTitle = req.levelTitle() == null ? "" : req.levelTitle().trim();
    e.setLevelTitleSnapshot(levelTitle.isEmpty() ? "등급 미달성" : levelTitle);
    e.setRating(req.rating() == null ? 5 : req.rating());
    e.setText(req.text() == null ? "" : req.text());
    e.setCreatedAt(LocalDateTime.now());

    MapCommentEntity saved = mapCommentRepository.save(e);

    List<String> photos = req.photos() == null ? Collections.emptyList() : req.photos();
    int sortOrder = 0;
    for (String url : photos) {
      if (url == null || url.isBlank()) continue;
      MapCommentPhotoEntity p = new MapCommentPhotoEntity();
      p.setMapComment(saved);
      p.setPhotoUrl(url);
      p.setSortOrder(sortOrder++);
      p.setCreatedAt(LocalDateTime.now());
      mapCommentPhotoRepository.save(p);
    }

    return toResponse(saved);
  }

  @Transactional
  public void deleteById(long id, Principal principal, boolean isAdmin) {
    MapCommentEntity e = mapCommentRepository.findById(id).orElse(null);
    if (e == null) return;

    if (!isAdmin) {
      String loginId = principal == null ? null : principal.getName();
      Long myId = loginId == null ? null : userRepository.findByLoginId(loginId).map(UserEntity::getId).orElse(null);
      Long ownerId = e.getUser() == null ? null : e.getUser().getId();
      if (myId == null || ownerId == null || !myId.equals(ownerId)) {
        throw new IllegalArgumentException("삭제 권한이 없습니다.");
      }
    }

    mapCommentPhotoRepository.deleteByMapCommentId(e.getId());
    mapCommentRepository.delete(e);
  }

  @Transactional
  public void deletePhotoByCommentIdAndUrl(
      long commentId, String photoUrl, Principal principal, boolean isAdmin) {
    MapCommentEntity e = mapCommentRepository.findById(commentId).orElse(null);
    if (e == null) return;
    String target = photoUrl == null ? "" : photoUrl.trim();
    if (target.isEmpty()) throw new IllegalArgumentException("photoUrl 이 필요합니다.");

    if (!isAdmin) {
      String loginId = principal == null ? null : principal.getName();
      Long myId = loginId == null ? null : userRepository.findByLoginId(loginId).map(UserEntity::getId).orElse(null);
      Long ownerId = e.getUser() == null ? null : e.getUser().getId();
      if (myId == null || ownerId == null || !myId.equals(ownerId)) {
        throw new IllegalArgumentException("삭제 권한이 없습니다.");
      }
    }
    mapCommentPhotoRepository.deleteByMapCommentIdAndPhotoUrl(e.getId(), target);
  }

  private MapCommentDtos.Response toResponse(MapCommentEntity e) {
    Long uid = e.getUser() == null ? null : e.getUser().getId();
    String loginId = e.getUser() == null ? null : e.getUser().getLoginId();
    List<String> photos =
        mapCommentPhotoRepository.findByMapCommentIdOrderBySortOrderAscIdAsc(e.getId()).stream()
            .map(MapCommentPhotoEntity::getPhotoUrl)
            .toList();
    return new MapCommentDtos.Response(
        String.valueOf(e.getId()),
        uid,
        loginId,
        e.getNicknameSnapshot(),
        e.getLevelTitleSnapshot(),
        e.getRating(),
        e.getText(),
        photos);
  }

  private static String safe(String v, String fallback) {
    String s = v == null ? "" : v.trim();
    return s.isEmpty() ? fallback : s;
  }
}

