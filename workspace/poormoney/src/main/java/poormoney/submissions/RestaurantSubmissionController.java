package poormoney.submissions;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import poormoney.submissions.dto.RestaurantSubmissionDtos;

@RestController
@RequestMapping("/api/restaurant-submissions")
public class RestaurantSubmissionController {
  private final RestaurantSubmissionService submissionService;

  public RestaurantSubmissionController(RestaurantSubmissionService submissionService) {
    this.submissionService = submissionService;
  }

  @PostMapping
  public ResponseEntity<RestaurantSubmissionDtos.AdminRow> create(
      @Valid @RequestBody RestaurantSubmissionDtos.CreateRequest req) {
    return ResponseEntity.ok(submissionService.create(req));
  }
}

