package poormoney.admin;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.restaurants.RestaurantEntity;
import poormoney.restaurants.RestaurantRepository;

@RestController
@RequestMapping("/api/admin/restaurants")
public class AdminRestaurantController {
  private final RestaurantRepository restaurantRepository;

  public AdminRestaurantController(RestaurantRepository restaurantRepository) {
    this.restaurantRepository = restaurantRepository;
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
    if (patch.containsKey("rating")) {
      try {
        r.setRating(Double.parseDouble(String.valueOf(patch.get("rating"))));
      } catch (Exception ignored) {
      }
    }
    restaurantRepository.save(r);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable long id) {
    if (!restaurantRepository.existsById(id)) return ResponseEntity.ok().build();
    restaurantRepository.deleteById(id);
    return ResponseEntity.ok().build();
  }
}

