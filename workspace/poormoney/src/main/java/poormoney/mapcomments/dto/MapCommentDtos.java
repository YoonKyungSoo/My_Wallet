package poormoney.mapcomments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public class MapCommentDtos {
  public record CreateRequest(
      @NotBlank @Size(max = 80) String restaurantName,
      Integer rating,
      @Size(max = 1000) String text,
      List<String> photos,
      @Size(max = 50) String levelTitle,
      @Size(max = 50) String nickname) {}

  public record Response(
      String id,
      Long userId,
      String loginId,
      String nickname,
      String levelTitle,
      Integer rating,
      String text,
      List<String> photos) {}
}

