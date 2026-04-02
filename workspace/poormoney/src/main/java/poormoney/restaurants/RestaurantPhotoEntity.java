package poormoney.restaurants;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "restaurant_photos")
public class RestaurantPhotoEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "restaurant_id", nullable = false)
  private RestaurantEntity restaurant;

  @Column(name = "url", nullable = false, columnDefinition = "LONGTEXT")
  private String url;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  protected RestaurantPhotoEntity() {}

  public Long getId() {
    return id;
  }

  public RestaurantEntity getRestaurant() {
    return restaurant;
  }

  public void setRestaurant(RestaurantEntity restaurant) {
    this.restaurant = restaurant;
  }

  public String getUrl() {
    return url;
  }

  public void setUrl(String url) {
    this.url = url;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}

