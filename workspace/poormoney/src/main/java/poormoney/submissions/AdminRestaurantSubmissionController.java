package poormoney.submissions;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.submissions.dto.RestaurantSubmissionDtos;

@RestController
@RequestMapping("/api/admin/restaurant-submissions")
public class AdminRestaurantSubmissionController {
  private final RestaurantSubmissionService submissionService;

  public AdminRestaurantSubmissionController(RestaurantSubmissionService submissionService) {
    this.submissionService = submissionService;
  }

  @GetMapping
  public ResponseEntity<List<RestaurantSubmissionDtos.AdminRow>> list() {
    return ResponseEntity.ok(submissionService.listForAdmin());
  }

  @PostMapping("/{id}/approve")
  public ResponseEntity<Void> approve(@PathVariable long id) {
    submissionService.approve(id);
    return ResponseEntity.ok().build();
  }

  @PostMapping("/{id}/reject")
  public ResponseEntity<Void> reject(@PathVariable long id) {
    submissionService.reject(id);
    return ResponseEntity.ok().build();
  }
}

