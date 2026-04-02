package poormoney.mapcomments;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapCommentPhotoRepository extends JpaRepository<MapCommentPhotoEntity, Long> {
  List<MapCommentPhotoEntity> findByMapCommentIdOrderByIdAsc(Long mapCommentId);

  void deleteByMapCommentId(Long mapCommentId);
}

