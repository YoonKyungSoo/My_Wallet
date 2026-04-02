package poormoney.bookmarks;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkRepository extends JpaRepository<BookmarkEntity, Long> {
  List<BookmarkEntity> findByUserIdOrderByIdDesc(Long userId);

  Optional<BookmarkEntity> findByUserIdAndRestaurantName(Long userId, String restaurantName);

  void deleteByUserIdAndRestaurantName(Long userId, String restaurantName);

  int countByUserId(Long userId);
}

