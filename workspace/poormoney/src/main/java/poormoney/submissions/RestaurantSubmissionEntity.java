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

  @Column(name = "status", nullable = false, length = 20)
  private String status;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "decided_at")
  private LocalDateTime decidedAt;

  @Column(name = "restaurant_name", nullable = false, length = 80)
  private String restaurantName;

  @Column(name = "restaurant_address", nullable = false, length = 200)
  private String restaurantAddress;

  @Column(name = "category_label", nullable = false, length = 40)
  private String categoryLabel;

  @Column(name = "menu_name", nullable = false, length = 80)
  private String menuName;

  @Column(name = "menu_price", nullable = false, length = 80)
  private String menuPrice;

  @Column(name = "rating")
  private Integer rating;

  @Column(name = "photos_json", columnDefinition = "LONGTEXT")
  private String photosJson;

  protected RestaurantSubmissionEntity() {}

  public Long getId() {
    return id;
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

  public String getMenuPrice() {
    return menuPrice;
  }

  public void setMenuPrice(String menuPrice) {
    this.menuPrice = menuPrice;
  }

  public Integer getRating() {
    return rating;
  }

  public void setRating(Integer rating) {
    this.rating = rating;
  }

  public String getPhotosJson() {
    return photosJson;
  }

  public void setPhotosJson(String photosJson) {
    this.photosJson = photosJson;
  }
}

