package poormoney.reports;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "comment_reports")
public class CommentReportEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "reporter_user_id", nullable = false)
  private Long reporterUserId;

  @Column(name = "comment_id", nullable = false)
  private Long commentId;

  @Column(name = "reason", nullable = false, length = 500)
  private String reason;

  @Column(name = "status", nullable = false, length = 20)
  private String status;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "decided_at")
  private LocalDateTime decidedAt;

  @Column(name = "decided_by_admin_user_id")
  private Long decidedByAdminUserId;

  protected CommentReportEntity() {}

  public Long getId() {
    return id;
  }

  public Long getReporterUserId() {
    return reporterUserId;
  }

  public void setReporterUserId(Long reporterUserId) {
    this.reporterUserId = reporterUserId;
  }

  public Long getCommentId() {
    return commentId;
  }

  public void setCommentId(Long commentId) {
    this.commentId = commentId;
  }

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getDecidedAt() {
    return decidedAt;
  }

  public void setDecidedAt(LocalDateTime decidedAt) {
    this.decidedAt = decidedAt;
  }

  public Long getDecidedByAdminUserId() {
    return decidedByAdminUserId;
  }

  public void setDecidedByAdminUserId(Long decidedByAdminUserId) {
    this.decidedByAdminUserId = decidedByAdminUserId;
  }
}

