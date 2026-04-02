package poormoney.submissions;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import poormoney.restaurants.RestaurantEntity;
import poormoney.restaurants.RestaurantPhotoEntity;
import poormoney.restaurants.RestaurantPhotoRepository;
import poormoney.restaurants.RestaurantRepository;
import poormoney.submissions.dto.RestaurantSubmissionDtos;

@Service
public class RestaurantSubmissionService {
  private final RestaurantSubmissionRepository submissionRepository;
  private final RestaurantRepository restaurantRepository;
  private final RestaurantPhotoRepository restaurantPhotoRepository;
  private final ObjectMapper objectMapper;

  public RestaurantSubmissionService(
      RestaurantSubmissionRepository submissionRepository,
      RestaurantRepository restaurantRepository,
      RestaurantPhotoRepository restaurantPhotoRepository,
      ObjectMapper objectMapper) {
    this.submissionRepository = submissionRepository;
    this.restaurantRepository = restaurantRepository;
    this.restaurantPhotoRepository = restaurantPhotoRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public RestaurantSubmissionDtos.AdminRow create(RestaurantSubmissionDtos.CreateRequest req) {
    RestaurantSubmissionEntity e = new RestaurantSubmissionEntity();
    e.setStatus("pending");
    e.setCreatedAt(LocalDateTime.now());
    e.setDecidedAt(null);
    e.setRestaurantName(req.restaurantName().trim());
    e.setRestaurantAddress(req.restaurantAddress().trim());
    e.setCategoryLabel(req.categoryLabel().trim());
    e.setMenuName(req.menuName().trim());
    e.setMenuPrice(req.menuPrice().trim());
    e.setRating(req.rating());
    e.setPhotosJson(writeJson(req.photos()));
    RestaurantSubmissionEntity saved = submissionRepository.save(e);
    return RestaurantSubmissionDtos.toRow(
        saved.getId(),
        saved.getStatus(),
        saved.getCreatedAt(),
        saved.getDecidedAt(),
        saved.getRestaurantName(),
        saved.getRestaurantAddress(),
        saved.getCategoryLabel(),
        saved.getMenuName(),
        saved.getMenuPrice(),
        saved.getRating(),
        readPhotos(saved.getPhotosJson()));
  }

  @Transactional(readOnly = true)
  public List<RestaurantSubmissionDtos.AdminRow> listForAdmin() {
    return submissionRepository.findAll().stream()
        .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
        .map(e ->
            RestaurantSubmissionDtos.toRow(
                e.getId(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getDecidedAt(),
                e.getRestaurantName(),
                e.getRestaurantAddress(),
                e.getCategoryLabel(),
                e.getMenuName(),
                e.getMenuPrice(),
                e.getRating(),
                readPhotos(e.getPhotosJson())))
        .toList();
  }

  @Transactional
  public void approve(long submissionId) {
    RestaurantSubmissionEntity s =
        submissionRepository.findById(submissionId).orElseThrow(() -> new IllegalArgumentException("제보를 찾을 수 없습니다."));
    s.setStatus("approved");
    s.setDecidedAt(LocalDateTime.now());

    RestaurantEntity r = new RestaurantEntity();
    r.setApprovedId("db-0");
    r.setName(s.getRestaurantName());
    r.setCategory(s.getCategoryLabel());
    r.setRating(s.getRating() == null ? 0 : s.getRating());
    r.setAddress(s.getRestaurantAddress());
    r.setPhone("");
    r.setMenuName(s.getMenuName());
    r.setMenuPriceLabel(s.getMenuPrice());
    r.setMenuPricesJson(writeJson(parseMenuPricesFromText(s.getMenuPrice())));
    r.setRecommendCount(0);
    r.setCreatedAt(LocalDateTime.now());
    RestaurantEntity saved = restaurantRepository.save(r);
    saved.setApprovedId("db-" + saved.getId());
    restaurantRepository.save(saved);

    for (String url : readPhotos(s.getPhotosJson())) {
      if (url == null || url.isBlank()) continue;
      RestaurantPhotoEntity p = new RestaurantPhotoEntity();
      p.setRestaurant(saved);
      p.setUrl(url);
      p.setCreatedAt(LocalDateTime.now());
      restaurantPhotoRepository.save(p);
    }
  }

  @Transactional
  public void reject(long submissionId) {
    RestaurantSubmissionEntity s =
        submissionRepository.findById(submissionId).orElseThrow(() -> new IllegalArgumentException("제보를 찾을 수 없습니다."));
    s.setStatus("rejected");
    s.setDecidedAt(LocalDateTime.now());
  }

  private String writeJson(Object v) {
    try {
      return objectMapper.writeValueAsString(v == null ? Collections.emptyList() : v);
    } catch (Exception e) {
      return "[]";
    }
  }

  private List<String> readPhotos(String json) {
    if (json == null || json.isBlank()) return List.of();
    try {
      List<?> list = objectMapper.readValue(json, List.class);
      return list.stream().map(String::valueOf).toList();
    } catch (Exception e) {
      return List.of();
    }
  }

  private static final Pattern PRICE_PATTERN = Pattern.compile("\\d[\\d,]*");

  static List<Integer> parseMenuPricesFromText(String text) {
    String t = text == null ? "" : text;
    Matcher m = PRICE_PATTERN.matcher(t);
    java.util.ArrayList<Integer> nums = new java.util.ArrayList<>();
    while (m.find()) {
      String raw = m.group().replace(",", "");
      try {
        int n = Integer.parseInt(raw);
        if (n > 0) nums.add(n);
      } catch (Exception ignored) {
      }
    }
    if (nums.isEmpty()) nums.add(5000);
    return nums;
  }
}

