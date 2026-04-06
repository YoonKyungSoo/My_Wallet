package poormoney.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashGenerator {
  public static void main(String[] args) {
    if (args == null || args.length == 0 || args[0] == null || args[0].isBlank()) {
      System.err.println("사용법: PasswordHashGenerator <plainPassword>");
      System.exit(2);
      return;
    }
    String raw = args[0];
    BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
    System.out.println(enc.encode(raw));
  }
}

