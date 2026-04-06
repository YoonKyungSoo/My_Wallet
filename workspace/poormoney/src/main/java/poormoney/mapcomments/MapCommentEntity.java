package poormoney.mapcomments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import poormoney.restaurants.RestaurantEntity;
import poormoney.users.UserEntity;

@Entity
@Table(name = "map_comments")
public class MapCommentEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "restaurant_id", nullable = false)
  private RestaurantEntity restaurant;

  @ManyToOne(optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "nickname_snapshot", nullable = false, length = 50)
  private String nicknameSnapshot;

  @Column(name = "level_title_snapshot", nullable = false, length = 50)
  private String levelTitleSnapshot;

  @Column(name = "rating", nullable = false)
  private int rating;

  @Column(name = "text", nullable = false, length = 2000)
  private String text;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  protected MapCommentEntity() {}

  public Long getId() {
    return id;
  }

  public RestaurantEntity getRestaurant() {
    return restaurant;
  }

  public void setRestaurant(RestaurantEntity restaurant) {
    this.restaurant = restaurant;
  }

  public UserEntity getUser() {
    return user;
  }

  public void setUser(UserEntity user) {
    this.user = user;
  }

  public String getNicknameSnapshot() {
    return nicknameSnapshot;
  }

  public void setNicknameSnapshot(String nicknameSnapshot) {
    this.nicknameSnapshot = nicknameSnapshot;
  }

  public String getLevelTitleSnapshot() {
    return levelTitleSnapshot;
  }

  public void setLevelTitleSnapshot(String levelTitleSnapshot) {
    this.levelTitleSnapshot = levelTitleSnapshot;
  }

  public int getRating() {
    return rating;
  }

  public void setRating(int rating) {
    this.rating = rating;
  }

  public String getText() {
    return text;
  }

  public void setText(String text) {
    this.text = text;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}

