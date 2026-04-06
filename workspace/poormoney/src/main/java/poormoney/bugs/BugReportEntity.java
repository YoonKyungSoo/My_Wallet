package poormoney.bugs;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "bug_reports")
public class BugReportEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "reporter_user_id", nullable = false)
  private Long reporterUserId;

  @Column(name = "restaurant_name_snapshot", nullable = false, length = 120)
  private String restaurantNameSnapshot;

  @Column(name = "restaurant_address_snapshot", nullable = false, length = 300)
  private String restaurantAddressSnapshot;

  @Column(name = "body", nullable = false, length = 2000)
  private String body;

  @Column(name = "photos_json", nullable = false, columnDefinition = "LONGTEXT")
  private String photosJson;

  @Column(name = "status", nullable = false, length = 20)
  private String status;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "decided_at")
  private LocalDateTime decidedAt;

  @Column(name = "decided_by_admin_user_id")
  private Long decidedByAdminUserId;

  protected BugReportEntity() {}

  public Long getId() {
    return id;
  }

  public Long getReporterUserId() {
    return reporterUserId;
  }

  public void setReporterUserId(Long reporterUserId) {
    this.reporterUserId = reporterUserId;
  }

  public String getRestaurantNameSnapshot() {
    return restaurantNameSnapshot;
  }

  public void setRestaurantNameSnapshot(String restaurantNameSnapshot) {
    this.restaurantNameSnapshot = restaurantNameSnapshot;
  }

  public String getRestaurantAddressSnapshot() {
    return restaurantAddressSnapshot;
  }

  public void setRestaurantAddressSnapshot(String restaurantAddressSnapshot) {
    this.restaurantAddressSnapshot = restaurantAddressSnapshot;
  }

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }

  public String getPhotosJson() {
    return photosJson;
  }

  public void setPhotosJson(String photosJson) {
    this.photosJson = photosJson;
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

