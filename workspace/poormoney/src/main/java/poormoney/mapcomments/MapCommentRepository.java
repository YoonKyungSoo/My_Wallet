package poormoney.mapcomments;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapCommentRepository extends JpaRepository<MapCommentEntity, Long> {
  List<MapCommentEntity> findByRestaurant_NameOrderByIdAsc(String restaurantName);

  int countByRestaurant_Name(String restaurantName);

  int countByUserId(Long userId);

  int countByUserIdAndRatingIsNotNull(Long userId);

  List<MapCommentEntity> findByUserId(Long userId);

  void deleteByUserId(Long userId);

  void deleteByRestaurant_Name(String restaurantName);
}

