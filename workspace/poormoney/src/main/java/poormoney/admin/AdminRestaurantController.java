package poormoney.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.bookmarks.BookmarkRepository;
import poormoney.mapcomments.MapCommentEntity;
import poormoney.mapcomments.MapCommentPhotoRepository;
import poormoney.mapcomments.MapCommentRepository;
import poormoney.restaurants.RestaurantEntity;
import poormoney.restaurants.RestaurantPhotoEntity;
import poormoney.restaurants.RestaurantPhotoRepository;
import poormoney.restaurants.RestaurantRepository;
import poormoney.submissions.RestaurantSubmissionEntity;
import poormoney.submissions.RestaurantSubmissionRepository;

@RestController
@RequestMapping("/api/admin/restaurants")
public class AdminRestaurantController {
  private final RestaurantRepository restaurantRepository;
  private final RestaurantPhotoRepository restaurantPhotoRepository;
  private final BookmarkRepository bookmarkRepository;
  private final MapCommentRepository mapCommentRepository;
  private final MapCommentPhotoRepository mapCommentPhotoRepository;
  private final RestaurantSubmissionRepository submissionRepository;
  private final ObjectMapper objectMapper;

  public AdminRestaurantController(
      RestaurantRepository restaurantRepository,
      RestaurantPhotoRepository restaurantPhotoRepository,
      BookmarkRepository bookmarkRepository,
      MapCommentRepository mapCommentRepository,
      MapCommentPhotoRepository mapCommentPhotoRepository,
      RestaurantSubmissionRepository submissionRepository,
      ObjectMapper objectMapper) {
    this.restaurantRepository = restaurantRepository;
    this.restaurantPhotoRepository = restaurantPhotoRepository;
    this.bookmarkRepository = bookmarkRepository;
    this.mapCommentRepository = mapCommentRepository;
    this.mapCommentPhotoRepository = mapCommentPhotoRepository;
    this.submissionRepository = submissionRepository;
    this.objectMapper = objectMapper;
  }

  @PatchMapping("/{id}")
  public ResponseEntity<Void> patch(@PathVariable long id, @RequestBody Map<String, Object> patch) {
    RestaurantEntity r =
        restaurantRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("식당을 찾을 수 없습니다."));

    if (patch.containsKey("name")) r.setName(String.valueOf(patch.get("name")));
    if (patch.containsKey("category")) r.setCategory(String.valueOf(patch.get("category")));
    if (patch.containsKey("address")) r.setAddress(String.valueOf(patch.get("address")));
    if (patch.containsKey("phone")) r.setPhone(String.valueOf(patch.get("phone")));
    if (patch.containsKey("menuName")) r.setMenuName(String.valueOf(patch.get("menuName")));
    if (patch.containsKey("menuPriceLabel")) r.setMenuPriceLabel(String.valueOf(patch.get("menuPriceLabel")));
    if (patch.containsKey("menuPrices")) {
      try {
        r.setMenuPricesJson(objectMapper.writeValueAsString(patch.get("menuPrices")));
      } catch (Exception ignored) {
      }
    }
    if (patch.containsKey("rating")) {
      try {
        r.setBaseRating(new BigDecimal(String.valueOf(patch.get("rating"))));
      } catch (Exception ignored) {
      }
    }
    restaurantRepository.save(r);

    if (patch.containsKey("photos")) {
      restaurantPhotoRepository.findByRestaurantIdOrderBySortOrderAscIdAsc(r.getId()).forEach(restaurantPhotoRepository::delete);
      List<String> photos = toStringList(patch.get("photos"));
      int order = 0;
      for (String url : photos) {
        if (url == null || url.isBlank()) continue;
        RestaurantPhotoEntity p = new RestaurantPhotoEntity();
        p.setRestaurant(r);
        p.setPhotoUrl(url.trim());
        p.setSortOrder(order++);
        p.setCreatedAt(LocalDateTime.now());
        restaurantPhotoRepository.save(p);
      }
    }
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/{id}")
  @Transactional
  public ResponseEntity<Void> delete(@PathVariable long id) {
    RestaurantEntity target = restaurantRepository.findById(id).orElse(null);
    if (target == null) return ResponseEntity.ok().build();

    String restaurantName = target.getName();
    List<MapCommentEntity> comments = mapCommentRepository.findByRestaurant_NameOrderByIdAsc(restaurantName);
    if (!comments.isEmpty()) {
      List<Long> commentIds = comments.stream().map(MapCommentEntity::getId).toList();
      mapCommentPhotoRepository.deleteByMapCommentIdIn(commentIds);
      mapCommentRepository.deleteByRestaurant_Name(restaurantName);
    }
    bookmarkRepository.deleteByRestaurantId(id);
    restaurantPhotoRepository.deleteByRestaurantId(id);

    List<RestaurantSubmissionEntity> linked = submissionRepository.findByApprovedRestaurantId(id);
    for (RestaurantSubmissionEntity s : linked) {
      s.setApprovedRestaurantId(null);
    }
    submissionRepository.saveAll(linked);

    restaurantRepository.delete(target);
    return ResponseEntity.ok().build();
  }

  private static List<String> toStringList(Object v) {
    if (!(v instanceof List<?> list)) return List.of();
    List<String> out = new ArrayList<>();
    for (Object o : list) {
      if (o == null) continue;
      out.add(String.valueOf(o));
    }
    return out;
  }
}

