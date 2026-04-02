package poormoney.restaurants;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import poormoney.mapcomments.MapCommentRepository;
import poormoney.restaurants.dto.RestaurantPublicDto;

@Service
public class RestaurantService {
  private final RestaurantRepository restaurantRepository;
  private final RestaurantPhotoRepository restaurantPhotoRepository;
  private final MapCommentRepository mapCommentRepository;
  private final ObjectMapper objectMapper;

  public RestaurantService(
      RestaurantRepository restaurantRepository,
      RestaurantPhotoRepository restaurantPhotoRepository,
      MapCommentRepository mapCommentRepository,
      ObjectMapper objectMapper) {
    this.restaurantRepository = restaurantRepository;
    this.restaurantPhotoRepository = restaurantPhotoRepository;
    this.mapCommentRepository = mapCommentRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public List<RestaurantPublicDto> listAll() {
    List<RestaurantEntity> list = restaurantRepository.findAll();
    return list.stream().map(this::toDto).toList();
  }

  private RestaurantPublicDto toDto(RestaurantEntity r) {
    List<String> photos =
        restaurantPhotoRepository.findByRestaurantIdOrderByIdAsc(r.getId()).stream()
            .map(RestaurantPhotoEntity::getUrl)
            .toList();
    int reviewCount = mapCommentRepository.countByRestaurantName(r.getName());

    return new RestaurantPublicDto(
        r.getId(),
        r.getApprovedId(),
        r.getName(),
        r.getCategory(),
        r.getRating(),
        r.getAddress(),
        r.getRecommendCount(),
        reviewCount,
        parseMenuPrices(r.getMenuPricesJson()),
        photos,
        r.getPhone(),
        r.getMenuName(),
        r.getMenuPriceLabel());
  }

  private List<Integer> parseMenuPrices(String json) {
    if (json == null || json.isBlank()) return Collections.emptyList();
    try {
      List<Integer> list = objectMapper.readValue(json, new TypeReference<>() {});
      return list == null ? Collections.emptyList() : list;
    } catch (Exception e) {
      return Collections.emptyList();
    }
  }
}

