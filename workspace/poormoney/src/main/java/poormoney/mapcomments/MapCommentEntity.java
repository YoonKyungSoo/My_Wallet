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
import poormoney.users.UserEntity;

@Entity
@Table(name = "map_comments")
public class MapCommentEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "restaurant_name", nullable = false, length = 80)
  private String restaurantName;

  @ManyToOne(optional = true)
  @JoinColumn(name = "user_id")
  private UserEntity user;

  @Column(name = "nickname", nullable = false, length = 50)
  private String nickname;

  @Column(name = "level_title", nullable = false, length = 50)
  private String levelTitle;

  @Column(name = "rating")
  private Integer rating;

  @Column(name = "text", length = 1000)
  private String text;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  protected MapCommentEntity() {}

  public Long getId() {
    return id;
  }

  public String getRestaurantName() {
    return restaurantName;
  }

  public void setRestaurantName(String restaurantName) {
    this.restaurantName = restaurantName;
  }

  public UserEntity getUser() {
    return user;
  }

  public void setUser(UserEntity user) {
    this.user = user;
  }

  public String getNickname() {
    return nickname;
  }

  public void setNickname(String nickname) {
    this.nickname = nickname;
  }

  public String getLevelTitle() {
    return levelTitle;
  }

  public void setLevelTitle(String levelTitle) {
    this.levelTitle = levelTitle;
  }

  public Integer getRating() {
    return rating;
  }

  public void setRating(Integer rating) {
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

