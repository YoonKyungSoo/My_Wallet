package poormoney.mapcomments;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import poormoney.mapcomments.dto.MapCommentDtos;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@Service
public class MapCommentService {
  private final MapCommentRepository mapCommentRepository;
  private final MapCommentPhotoRepository mapCommentPhotoRepository;
  private final UserRepository userRepository;

  public MapCommentService(
      MapCommentRepository mapCommentRepository,
      MapCommentPhotoRepository mapCommentPhotoRepository,
      UserRepository userRepository) {
    this.mapCommentRepository = mapCommentRepository;
    this.mapCommentPhotoRepository = mapCommentPhotoRepository;
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public List<MapCommentDtos.Response> listByRestaurantName(String restaurantName) {
    if (restaurantName == null || restaurantName.isBlank()) return List.of();
    return mapCommentRepository.findByRestaurantNameOrderByIdAsc(restaurantName).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public MapCommentDtos.Response create(MapCommentDtos.CreateRequest req, Principal principal) {
    String loginId = principal == null ? null : principal.getName();
    UserEntity user = loginId == null ? null : userRepository.findByLoginId(loginId).orElse(null);

    MapCommentEntity e = new MapCommentEntity();
    e.setRestaurantName(req.restaurantName().trim());
    e.setUser(user);
    e.setNickname(user != null ? user.getNickname() : safe(req.nickname(), "익명"));
    e.setLevelTitle(user != null ? user.getLevelTitle() : safe(req.levelTitle(), "뉴비"));
    e.setRating(req.rating());
    e.setText(req.text());
    e.setCreatedAt(LocalDateTime.now());

    MapCommentEntity saved = mapCommentRepository.save(e);

    List<String> photos = req.photos() == null ? Collections.emptyList() : req.photos();
    for (String url : photos) {
      if (url == null || url.isBlank()) continue;
      MapCommentPhotoEntity p = new MapCommentPhotoEntity();
      p.setMapComment(saved);
      p.setUrl(url);
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

  private MapCommentDtos.Response toResponse(MapCommentEntity e) {
    Long uid = e.getUser() == null ? null : e.getUser().getId();
    String loginId = e.getUser() == null ? null : e.getUser().getLoginId();
    List<String> photos =
        mapCommentPhotoRepository.findByMapCommentIdOrderByIdAsc(e.getId()).stream()
            .map(MapCommentPhotoEntity::getUrl)
            .toList();
    return new MapCommentDtos.Response(
        String.valueOf(e.getId()),
        uid,
        loginId,
        e.getNickname(),
        e.getLevelTitle(),
        e.getRating(),
        e.getText(),
        photos);
  }

  private static String safe(String v, String fallback) {
    String s = v == null ? "" : v.trim();
    return s.isEmpty() ? fallback : s;
  }
}

