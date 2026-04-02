package poormoney.restaurants;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantRepository extends JpaRepository<RestaurantEntity, Long> {
  Optional<RestaurantEntity> findByName(String name);
}

