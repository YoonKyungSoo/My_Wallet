package poormoney.bookmarks;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import poormoney.restaurants.RestaurantEntity;
import poormoney.restaurants.RestaurantRepository;
import poormoney.users.UserEntity;
import poormoney.users.UserRepository;

@Service
public class BookmarkService {
  private final BookmarkRepository bookmarkRepository;
  private final UserRepository userRepository;
  private final RestaurantRepository restaurantRepository;

  public BookmarkService(
      BookmarkRepository bookmarkRepository,
      UserRepository userRepository,
      RestaurantRepository restaurantRepository) {
    this.bookmarkRepository = bookmarkRepository;
    this.userRepository = userRepository;
    this.restaurantRepository = restaurantRepository;
  }

  @Transactional(readOnly = true)
  public List<String> listMyBookmarks(Principal principal) {
    UserEntity me = requireMe(principal);
    return bookmarkRepository.findByUserIdOrderByIdDesc(me.getId()).stream()
        .map(b -> b.getRestaurant() == null ? null : b.getRestaurant().getName())
        .filter(n -> n != null && !n.isBlank())
        .toList();
  }

  @Transactional
  public boolean toggle(Principal principal, String name) {
    UserEntity me = requireMe(principal);
    String n = name == null ? "" : name.trim();
    if (n.isEmpty()) throw new IllegalArgumentException("name 이 필요합니다.");

    RestaurantEntity restaurant =
        restaurantRepository.findByName(n).orElseThrow(() -> new IllegalArgumentException("식당을 찾을 수 없습니다."));

    BookmarkEntity existing =
        bookmarkRepository.findByUserIdAndRestaurantId(me.getId(), restaurant.getId()).orElse(null);
    if (existing != null) {
      bookmarkRepository.delete(existing);
      return false;
    }
    BookmarkEntity b = new BookmarkEntity();
    b.setUser(me);
    b.setRestaurant(restaurant);
    b.setCreatedAt(LocalDateTime.now());
    bookmarkRepository.save(b);
    return true;
  }

  private UserEntity requireMe(Principal principal) {
    String loginId = principal == null ? null : principal.getName();
    if (loginId == null) throw new IllegalArgumentException("로그인이 필요합니다.");
    return userRepository.findByLoginId(loginId).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
  }
}

