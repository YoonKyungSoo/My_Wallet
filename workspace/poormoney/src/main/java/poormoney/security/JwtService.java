package poormoney.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final String issuer;
  private final SecretKey key;
  private final long accessTtlSeconds;

  public JwtService(
      @Value("${app.jwt.issuer}") String issuer,
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.access-token-ttl-seconds}") long accessTtlSeconds) {
    this.issuer = issuer;
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.accessTtlSeconds = accessTtlSeconds;
  }

  public String createAccessToken(long userId, String loginId, String role) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(accessTtlSeconds);
    return Jwts.builder()
        .issuer(issuer)
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .subject(String.valueOf(userId))
        .claim("loginId", loginId)
        .claim("role", role)
        .signWith(key)
        .compact();
  }

  public Claims parseClaims(String token) {
    return Jwts.parser()
        .verifyWith(key)
        .requireIssuer(issuer)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}

