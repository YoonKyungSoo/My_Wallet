package poormoney.restaurants;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "restaurants")
public class RestaurantEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "approved_id", nullable = false, unique = true, length = 80)
  private String approvedId;

  @Column(name = "name", nullable = false, unique = true, length = 80)
  private String name;

  @Column(name = "category", nullable = false, length = 40)
  private String category;

  @Column(name = "rating", nullable = false)
  private double rating;

  @Column(name = "address", nullable = false, length = 200)
  private String address;

  @Column(name = "phone", nullable = false, length = 40)
  private String phone;

  @Column(name = "menu_name", nullable = false, length = 80)
  private String menuName;

  @Column(name = "menu_price_label", nullable = false, length = 80)
  private String menuPriceLabel;

  @Column(name = "menu_prices_json", columnDefinition = "LONGTEXT")
  private String menuPricesJson;

  @Column(name = "recommend_count", nullable = false)
  private int recommendCount;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  protected RestaurantEntity() {}

  public Long getId() {
    return id;
  }

  public String getApprovedId() {
    return approvedId;
  }

  public void setApprovedId(String approvedId) {
    this.approvedId = approvedId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public double getRating() {
    return rating;
  }

  public void setRating(double rating) {
    this.rating = rating;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getMenuName() {
    return menuName;
  }

  public void setMenuName(String menuName) {
    this.menuName = menuName;
  }

  public String getMenuPriceLabel() {
    return menuPriceLabel;
  }

  public void setMenuPriceLabel(String menuPriceLabel) {
    this.menuPriceLabel = menuPriceLabel;
  }

  public String getMenuPricesJson() {
    return menuPricesJson;
  }

  public void setMenuPricesJson(String menuPricesJson) {
    this.menuPricesJson = menuPricesJson;
  }

  public int getRecommendCount() {
    return recommendCount;
  }

  public void setRecommendCount(int recommendCount) {
    this.recommendCount = recommendCount;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}

