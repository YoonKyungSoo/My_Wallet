package poormoney.restaurants;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "restaurants")
public class RestaurantEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "name", nullable = false, length = 120)
  private String name;

  @Column(name = "category", nullable = false, length = 50)
  private String category;

  @Column(name = "base_rating", nullable = false, precision = 3, scale = 2)
  private BigDecimal baseRating;

  @Column(name = "address", nullable = false, length = 300)
  private String address;

  @Column(name = "phone", nullable = false, length = 50)
  private String phone;

  @Column(name = "menu_name", nullable = false, length = 120)
  private String menuName;

  @Column(name = "menu_price_label", nullable = false, length = 50)
  private String menuPriceLabel;

  @Column(name = "menu_prices_json", nullable = false, columnDefinition = "LONGTEXT")
  private String menuPricesJson;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public RestaurantEntity() {}

  public Long getId() {
    return id;
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

  public BigDecimal getBaseRating() {
    return baseRating;
  }

  public void setBaseRating(BigDecimal baseRating) {
    this.baseRating = baseRating;
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

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}

