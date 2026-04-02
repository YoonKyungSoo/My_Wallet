package poormoney.users;

import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
  private final UserRepository userRepository;

  public AppUserDetailsService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    UserEntity u =
        userRepository
            .findByLoginId(username)
            .orElseThrow(() -> new UsernameNotFoundException("user not found"));

    String role = u.getRole() == null ? "USER" : u.getRole().name();
    return new User(u.getLoginId(), u.getPasswordHash(),
        !u.isBanned(), true, true, true,
        List.of(new SimpleGrantedAuthority("ROLE_" + role)));
  }
}

