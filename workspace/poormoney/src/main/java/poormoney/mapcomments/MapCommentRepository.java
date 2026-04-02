package poormoney.mapcomments;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapCommentRepository extends JpaRepository<MapCommentEntity, Long> {
  List<MapCommentEntity> findByRestaurantNameOrderByIdAsc(String restaurantName);

  int countByRestaurantName(String restaurantName);

  int countByUserId(Long userId);

  int countByUserIdAndRatingIsNotNull(Long userId);
}

