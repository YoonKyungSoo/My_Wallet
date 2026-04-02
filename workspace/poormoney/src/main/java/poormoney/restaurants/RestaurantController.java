package poormoney.restaurants;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.restaurants.dto.RestaurantPublicDto;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {
  private final RestaurantService restaurantService;

  public RestaurantController(RestaurantService restaurantService) {
    this.restaurantService = restaurantService;
  }

  @GetMapping
  public ResponseEntity<List<RestaurantPublicDto>> list() {
    return ResponseEntity.ok(restaurantService.listAll());
  }
}

