package poormoney.bookmarks;

import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {
  private final BookmarkService bookmarkService;

  public BookmarkController(BookmarkService bookmarkService) {
    this.bookmarkService = bookmarkService;
  }

  @GetMapping
  public ResponseEntity<List<String>> list(Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    return ResponseEntity.ok(bookmarkService.listMyBookmarks(principal));
  }

  @PostMapping("/toggle")
  public ResponseEntity<Boolean> toggle(@RequestParam String name, Principal principal) {
    if (principal == null) return ResponseEntity.status(401).build();
    return ResponseEntity.ok(bookmarkService.toggle(principal, name));
  }
}

