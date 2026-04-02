package poormoney.restaurants;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantPhotoRepository extends JpaRepository<RestaurantPhotoEntity, Long> {
  List<RestaurantPhotoEntity> findByRestaurantIdOrderByIdAsc(Long restaurantId);
}

