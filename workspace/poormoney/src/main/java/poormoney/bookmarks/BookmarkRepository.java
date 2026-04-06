package poormoney.bookmarks;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkRepository extends JpaRepository<BookmarkEntity, Long> {
  List<BookmarkEntity> findByUserIdOrderByIdDesc(Long userId);

  Optional<BookmarkEntity> findByUserIdAndRestaurantId(Long userId, Long restaurantId);

  void deleteByUserIdAndRestaurantId(Long userId, Long restaurantId);

  void deleteByUserId(Long userId);

  void deleteByRestaurantId(Long restaurantId);

  int countByUserId(Long userId);
}

