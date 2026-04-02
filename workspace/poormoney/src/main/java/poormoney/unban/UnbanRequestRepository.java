package poormoney.unban;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnbanRequestRepository extends JpaRepository<UnbanRequestEntity, Long> {
  Optional<UnbanRequestEntity> findFirstByLoginIdAndStatusOrderByIdDesc(String loginId, String status);
}

