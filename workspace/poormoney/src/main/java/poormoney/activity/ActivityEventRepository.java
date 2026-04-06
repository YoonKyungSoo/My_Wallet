package poormoney.activity;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityEventRepository extends JpaRepository<ActivityEventEntity, Long> {
  List<ActivityEventEntity> findTop100ByUserIdOrderByIdDesc(Long userId);

  void deleteByUserId(Long userId);
}

