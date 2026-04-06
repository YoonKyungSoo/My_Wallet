package poormoney.users;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
  Optional<UserEntity> findByLoginId(String loginId);

  boolean existsByLoginId(String loginId);

  boolean existsByNickname(String nickname);

  void deleteByLoginId(String loginId);
}

