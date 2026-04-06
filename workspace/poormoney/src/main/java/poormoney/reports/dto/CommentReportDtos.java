package poormoney.reports.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class CommentReportDtos {
  public record CreateRequest(@NotBlank String commentId, @Size(max = 200) String reason) {}

  public record AdminRow(
      long id, String commentId, String reason, String status, String createdAt, String decidedAt) {}

  public record UpdateStatusRequest(@NotBlank String status) {}

  public static AdminRow toRow(
      long id, String commentId, String reason, String status, LocalDateTime createdAt, LocalDateTime decidedAt) {
    return new AdminRow(
        id,
        commentId,
        reason,
        status,
        createdAt == null ? null : createdAt.toString(),
        decidedAt == null ? null : decidedAt.toString());
  }
}

