package poormoney.api;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SaveMoneyController {

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "UP", "service", "wallet-keeper-api");
  }
}

