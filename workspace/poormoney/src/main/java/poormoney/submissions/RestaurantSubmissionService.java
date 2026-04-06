package poormoney.submissions;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.security.Principal;
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
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@Service
public class RestaurantSubmissionService {
  private final RestaurantSubmissionRepository submissionRepository;
  private final RestaurantRepository restaurantRepository;
  private final RestaurantPhotoRepository restaurantPhotoRepository;
  private final ObjectMapper objectMapper;
  private final UserRepository userRepository;

  public RestaurantSubmissionService(
      RestaurantSubmissionRepository submissionRepository,
      RestaurantRepository restaurantRepository,
      RestaurantPhotoRepository restaurantPhotoRepository,
      ObjectMapper objectMapper,
      UserRepository userRepository) {
    this.submissionRepository = submissionRepository;
    this.restaurantRepository = restaurantRepository;
    this.restaurantPhotoRepository = restaurantPhotoRepository;
    this.objectMapper = objectMapper;
    this.userRepository = userRepository;
  }

  @Transactional
  public RestaurantSubmissionDtos.AdminRow create(RestaurantSubmissionDtos.CreateRequest req, Principal principal) {
    UserEntity me =
        userRepository.findByLoginId(principal.getName()).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    RestaurantSubmissionEntity e = new RestaurantSubmissionEntity();
    e.setSubmitterUserId(me.getId());
    e.setStatus("PENDING");
    e.setCreatedAt(LocalDateTime.now());
    e.setDecidedAt(null);
    e.setRestaurantName(req.restaurantName().trim());
    e.setRestaurantAddress(req.restaurantAddress().trim());
    e.setCategoryLabel(req.categoryLabel().trim());
    e.setMenuName(req.menuName().trim());
    e.setMenuPriceText(req.menuPriceText().trim());
    e.setRating(req.rating() == null ? 5 : req.rating());
    e.setPhotosJson(writeJson(req.photos()));
    e.setApprovedRestaurantId(null);
    e.setDecidedByAdminUserId(null);
    e.setAdminMemo("");
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
        saved.getMenuPriceText(),
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
                e.getMenuPriceText(),
                e.getRating(),
                readPhotos(e.getPhotosJson())))
        .toList();
  }

  @Transactional
  public void approve(long submissionId) {
    RestaurantSubmissionEntity s =
        submissionRepository.findById(submissionId).orElseThrow(() -> new IllegalArgumentException("제보를 찾을 수 없습니다."));
    String name = s.getRestaurantName() == null ? "" : s.getRestaurantName().trim();
    if (name.isEmpty()) {
      throw new IllegalArgumentException("식당명이 비어 있습니다.");
    }
    if (restaurantRepository.findByName(name).isPresent()) {
      throw new IllegalArgumentException("이미 같은 이름의 식당이 등록되어 있습니다.");
    }
    s.setStatus("APPROVED");
    s.setDecidedAt(LocalDateTime.now());

    RestaurantEntity r = new RestaurantEntity();
    r.setName(name);
    r.setCategory(s.getCategoryLabel());
    r.setBaseRating(BigDecimal.valueOf(s.getRating()));
    r.setAddress(s.getRestaurantAddress());
    r.setPhone("");
    r.setMenuName(s.getMenuName());
    r.setMenuPriceLabel(s.getMenuPriceText());
    r.setMenuPricesJson(writeJson(parseMenuPricesFromText(s.getMenuPriceText())));
    r.setCreatedAt(LocalDateTime.now());
    RestaurantEntity saved = restaurantRepository.save(r);
    s.setApprovedRestaurantId(saved.getId());
    submissionRepository.save(s);

    int order = 0;
    for (String url : readPhotos(s.getPhotosJson())) {
      if (url == null || url.isBlank()) continue;
      RestaurantPhotoEntity p = new RestaurantPhotoEntity();
      p.setRestaurant(saved);
      p.setPhotoUrl(url);
      p.setSortOrder(order++);
      p.setCreatedAt(LocalDateTime.now());
      restaurantPhotoRepository.save(p);
    }
  }

  @Transactional
  public void reject(long submissionId) {
    RestaurantSubmissionEntity s =
        submissionRepository.findById(submissionId).orElseThrow(() -> new IllegalArgumentException("제보를 찾을 수 없습니다."));
    s.setStatus("REJECTED");
    s.setDecidedAt(LocalDateTime.now());
  }

  @Transactional
  public void delete(long submissionId) {
    if (!submissionRepository.existsById(submissionId)) return;
    submissionRepository.deleteById(submissionId);
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

