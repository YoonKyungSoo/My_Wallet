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

@Entity
@Table(name = "map_comment_photos")
public class MapCommentPhotoEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "comment_id", nullable = false)
  private MapCommentEntity mapComment;

  @Column(name = "photo_url", nullable = false, columnDefinition = "LONGTEXT")
  private String photoUrl;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  protected MapCommentPhotoEntity() {}

  public Long getId() {
    return id;
  }

  public MapCommentEntity getMapComment() {
    return mapComment;
  }

  public void setMapComment(MapCommentEntity mapComment) {
    this.mapComment = mapComment;
  }

  public String getPhotoUrl() {
    return photoUrl;
  }

  public void setPhotoUrl(String photoUrl) {
    this.photoUrl = photoUrl;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}

