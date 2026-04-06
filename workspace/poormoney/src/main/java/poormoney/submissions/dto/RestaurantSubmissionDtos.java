package poormoney.submissions.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public class RestaurantSubmissionDtos {
  public record CreateRequest(
      @NotBlank @Size(max = 120) String restaurantName,
      @NotBlank @Size(max = 300) String restaurantAddress,
      @NotBlank @Size(max = 50) String categoryLabel,
      @NotBlank @Size(max = 120) String menuName,
      @NotBlank @Size(max = 50) String menuPriceText,
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
      String menuPriceText,
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
      String menuPriceText,
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
        menuPriceText,
        rating,
        photos);
  }
}

