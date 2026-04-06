package poormoney.unban;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnbanRequestRepository extends JpaRepository<UnbanRequestEntity, Long> {
  Optional<UnbanRequestEntity> findFirstByUserIdAndStatusOrderByIdDesc(Long userId, String status);

  void deleteByUserId(Long userId);

  void deleteByDecidedByAdminUserId(Long adminUserId);
}

