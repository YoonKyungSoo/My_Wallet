package poormoney.mapcomments;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapCommentPhotoRepository extends JpaRepository<MapCommentPhotoEntity, Long> {
  List<MapCommentPhotoEntity> findByMapCommentIdOrderBySortOrderAscIdAsc(Long mapCommentId);

  void deleteByMapCommentId(Long mapCommentId);

  void deleteByMapCommentIdAndPhotoUrl(Long mapCommentId, String photoUrl);

  void deleteByMapCommentIdIn(Collection<Long> mapCommentIds);
}

