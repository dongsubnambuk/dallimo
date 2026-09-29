package com.dallimo.dallimoserver.user.infrastructure;

import com.dallimo.dallimoserver.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<User, Long> {

    Optional<User> findByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByNickname(String nickname);

    Optional<User> findByNickname(String nickname);

    boolean existsByFriendCode(String friendCode);
}
