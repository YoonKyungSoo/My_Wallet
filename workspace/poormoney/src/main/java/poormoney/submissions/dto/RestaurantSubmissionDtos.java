package poormoney.submissions.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public class RestaurantSubmissionDtos {
  public record CreateRequest(
      @NotBlank @Size(max = 80) String restaurantName,
      @NotBlank @Size(max = 200) String restaurantAddress,
      @NotBlank @Size(max = 40) String categoryLabel,
      @NotBlank @Size(max = 80) String menuName,
      @NotBlank @Size(max = 80) String menuPrice,
      Integer rating,
      List<String> photos) {}

  public record AdminRow(
      long id,
      String status,
      String createdAt,
      String decidedAt,
      String restaurantName,
      String restaurantAddress,
      String category,
      String categoryLabel,
      String menuName,
      String menuPrice,
      Integer rating,
      List<String> photos) {}

  public static AdminRow toRow(
      long id,
      String status,
      LocalDateTime createdAt,
      LocalDateTime decidedAt,
      String restaurantName,
      String restaurantAddress,
      String categoryLabel,
      String menuName,
      String menuPrice,
      Integer rating,
      List<String> photos) {
    String isoCreated = createdAt == null ? null : createdAt.toString();
    String isoDecided = decidedAt == null ? null : decidedAt.toString();
    return new AdminRow(
        id,
        status,
        isoCreated,
        isoDecided,
        restaurantName,
        restaurantAddress,
        categoryLabel,
        categoryLabel,
        menuName,
        menuPrice,
        rating,
        photos);
  }
}

