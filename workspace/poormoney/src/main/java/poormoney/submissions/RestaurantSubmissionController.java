package poormoney.submissions;

import jakarta.validation.Valid;
import java.security.Principal;
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
      @Valid @RequestBody RestaurantSubmissionDtos.CreateRequest req, Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    return ResponseEntity.ok(submissionService.create(req, principal));
  }
}

