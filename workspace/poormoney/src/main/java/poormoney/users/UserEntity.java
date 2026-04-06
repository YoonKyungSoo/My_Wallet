package poormoney.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class UserEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "login_id", nullable = false, unique = true, length = 50)
  private String loginId;

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Column(name = "nickname", nullable = false, length = 50)
  private String nickname;

  @Column(name = "bio", nullable = false, length = 500)
  private String bio;

  @Column(name = "profile_image_url", nullable = false, length = 1000)
  private String profileImageUrl;

  @Enumerated(EnumType.STRING)
  @Column(name = "role", nullable = false, length = 20)
  private UserRole role;

  @Column(name = "banned", nullable = false)
  private boolean banned;

  @Column(name = "ban_reason", nullable = false, length = 500)
  private String banReason;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public UserEntity() {}

  public Long getId() {
    return id;
  }

  public String getLoginId() {
    return loginId;
  }

  public void setLoginId(String loginId) {
    this.loginId = loginId;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public String getNickname() {
    return nickname;
  }

  public void setNickname(String nickname) {
    this.nickname = nickname;
  }

  public String getBio() {
    return bio;
  }

  public void setBio(String bio) {
    this.bio = bio;
  }

  public String getProfileImageUrl() {
    return profileImageUrl;
  }

  public void setProfileImageUrl(String profileImageUrl) {
    this.profileImageUrl = profileImageUrl;
  }

  public UserRole getRole() {
    return role;
  }

  public void setRole(UserRole role) {
    this.role = role;
  }

  public boolean isBanned() {
    return banned;
  }

  public void setBanned(boolean banned) {
    this.banned = banned;
  }

  public String getBanReason() {
    return banReason;
  }

  public void setBanReason(String banReason) {
    this.banReason = banReason;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}

