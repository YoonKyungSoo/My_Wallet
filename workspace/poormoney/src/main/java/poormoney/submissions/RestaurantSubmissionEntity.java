package poormoney.submissions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "restaurant_submissions")
public class RestaurantSubmissionEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "submitter_user_id", nullable = false)
  private Long submitterUserId;

  @Column(name = "status", nullable = false, length = 20)
  private String status;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "decided_at")
  private LocalDateTime decidedAt;

  @Column(name = "restaurant_name", nullable = false, length = 120)
  private String restaurantName;

  @Column(name = "restaurant_address", nullable = false, length = 300)
  private String restaurantAddress;

  @Column(name = "category_label", nullable = false, length = 50)
  private String categoryLabel;

  @Column(name = "menu_name", nullable = false, length = 120)
  private String menuName;

  @Column(name = "menu_price_text", nullable = false, length = 50)
  private String menuPriceText;

  @Column(name = "rating", nullable = false)
  private int rating;

  @Column(name = "photos_json", nullable = false, columnDefinition = "LONGTEXT")
  private String photosJson;

  @Column(name = "approved_restaurant_id")
  private Long approvedRestaurantId;

  @Column(name = "decided_by_admin_user_id")
  private Long decidedByAdminUserId;

  @Column(name = "admin_memo", nullable = false, length = 500)
  private String adminMemo;

  protected RestaurantSubmissionEntity() {}

  public Long getId() {
    return id;
  }

  public Long getSubmitterUserId() {
    return submitterUserId;
  }

  public void setSubmitterUserId(Long submitterUserId) {
    this.submitterUserId = submitterUserId;
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

  public String getRestaurantName() {
    return restaurantName;
  }

  public void setRestaurantName(String restaurantName) {
    this.restaurantName = restaurantName;
  }

  public String getRestaurantAddress() {
    return restaurantAddress;
  }

  public void setRestaurantAddress(String restaurantAddress) {
    this.restaurantAddress = restaurantAddress;
  }

  public String getCategoryLabel() {
    return categoryLabel;
  }

  public void setCategoryLabel(String categoryLabel) {
    this.categoryLabel = categoryLabel;
  }

  public String getMenuName() {
    return menuName;
  }

  public void setMenuName(String menuName) {
    this.menuName = menuName;
  }

  public String getMenuPriceText() {
    return menuPriceText;
  }

  public void setMenuPriceText(String menuPriceText) {
    this.menuPriceText = menuPriceText;
  }

  public int getRating() {
    return rating;
  }

  public void setRating(int rating) {
    this.rating = rating;
  }

  public String getPhotosJson() {
    return photosJson;
  }

  public void setPhotosJson(String photosJson) {
    this.photosJson = photosJson;
  }

  public Long getApprovedRestaurantId() {
    return approvedRestaurantId;
  }

  public void setApprovedRestaurantId(Long approvedRestaurantId) {
    this.approvedRestaurantId = approvedRestaurantId;
  }

  public Long getDecidedByAdminUserId() {
    return decidedByAdminUserId;
  }

  public void setDecidedByAdminUserId(Long decidedByAdminUserId) {
    this.decidedByAdminUserId = decidedByAdminUserId;
  }

  public String getAdminMemo() {
    return adminMemo;
  }

  public void setAdminMemo(String adminMemo) {
    this.adminMemo = adminMemo;
  }
}

