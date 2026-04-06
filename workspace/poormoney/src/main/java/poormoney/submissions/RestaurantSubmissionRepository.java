package poormoney.submissions;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantSubmissionRepository
    extends JpaRepository<RestaurantSubmissionEntity, Long> {
  int countBySubmitterUserId(Long submitterUserId);

  java.util.List<RestaurantSubmissionEntity> findByApprovedRestaurantId(Long approvedRestaurantId);

  @Query(
      value =
          "select count(*) from restaurant_submissions rs "
              + "where rs.submitter_user_id = ?1 and rs.photos_json is not null and rs.photos_json <> '[]'",
      nativeQuery = true)
  int countPhotoReportsBySubmitterUserId(Long submitterUserId);
}

