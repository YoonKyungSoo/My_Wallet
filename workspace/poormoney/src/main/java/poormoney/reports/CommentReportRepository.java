package poormoney.reports;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentReportRepository extends JpaRepository<CommentReportEntity, Long> {
  void deleteByReporterUserId(Long reporterUserId);

  void deleteByDecidedByAdminUserId(Long decidedByAdminUserId);
}

