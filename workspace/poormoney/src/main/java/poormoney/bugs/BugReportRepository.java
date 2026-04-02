package poormoney.bugs;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BugReportRepository extends JpaRepository<BugReportEntity, Long> {}

