package poormoney.submissions;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantSubmissionRepository
    extends JpaRepository<RestaurantSubmissionEntity, Long> {}

