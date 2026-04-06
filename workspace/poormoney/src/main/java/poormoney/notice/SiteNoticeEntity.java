package poormoney.notice;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "site_notice")
public class SiteNoticeEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "body", nullable = false, length = 2000)
  private String body;

  @Column(name = "active", nullable = false)
  private boolean active;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Column(name = "updated_by_admin_user_id", nullable = false)
  private Long updatedByAdminUserId;

  protected SiteNoticeEntity() {}

  public Long getId() {
    return id;
  }

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }

  public Long getUpdatedByAdminUserId() {
    return updatedByAdminUserId;
  }

  public void setUpdatedByAdminUserId(Long updatedByAdminUserId) {
    this.updatedByAdminUserId = updatedByAdminUserId;
  }
}

