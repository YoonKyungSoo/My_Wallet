package poormoney.mapcomments;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import poormoney.mapcomments.dto.MapCommentDtos;

@RestController
@RequestMapping("/api/map-comments")
public class MapCommentController {
  private final MapCommentService mapCommentService;
  record DeletePhotoRequest(String photoUrl) {}

  public MapCommentController(MapCommentService mapCommentService) {
    this.mapCommentService = mapCommentService;
  }

  @GetMapping
  public ResponseEntity<List<MapCommentDtos.Response>> list(@RequestParam String restaurantName) {
    return ResponseEntity.ok(mapCommentService.listByRestaurantName(restaurantName));
  }

  @PostMapping
  public ResponseEntity<MapCommentDtos.Response> create(
      @Valid @RequestBody MapCommentDtos.CreateRequest req, Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    return ResponseEntity.ok(mapCommentService.create(req, principal));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable long id, Principal principal, Authentication authentication) {
    boolean isAdmin =
        authentication != null
            && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    mapCommentService.deleteById(id, principal, isAdmin);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/{id}/photos")
  public ResponseEntity<Void> deletePhoto(
      @PathVariable long id,
      @RequestParam(required = false) String photoUrl,
      @RequestBody(required = false) DeletePhotoRequest body,
      Principal principal,
      Authentication authentication) {
    boolean isAdmin =
        authentication != null
            && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    String target = photoUrl;
    if ((target == null || target.isBlank()) && body != null) {
      target = body.photoUrl();
    }
    mapCommentService.deletePhotoByCommentIdAndUrl(id, target, principal, isAdmin);
    return ResponseEntity.ok().build();
  }

  @PostMapping("/{id}/photos/delete")
  public ResponseEntity<Void> deletePhotoPost(
      @PathVariable long id,
      @RequestBody(required = false) DeletePhotoRequest body,
      Principal principal,
      Authentication authentication) {
    boolean isAdmin =
        authentication != null
            && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    String target = body == null ? null : body.photoUrl();
    mapCommentService.deletePhotoByCommentIdAndUrl(id, target, principal, isAdmin);
    return ResponseEntity.ok().build();
  }
}

