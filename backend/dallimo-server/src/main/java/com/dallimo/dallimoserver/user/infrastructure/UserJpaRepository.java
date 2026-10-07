package com.dallimo.dallimoserver.user.infrastructure;

import com.dallimo.dallimoserver.user.domain.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<User, Long> {

    Optional<User> findByProviderAndProviderUserId(String provider, String providerUserId);

    /** 관리자 비밀번호를 처음 정할 때 동시에 두 번 정하지 않게 행을 잠근다 (FOUNDATION-DECISION-LOG 86항) */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.provider = :provider and u.providerUserId = :providerUserId")
    Optional<User> findByProviderAndProviderUserIdForUpdate(String provider, String providerUserId);

    boolean existsByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByNickname(String nickname);

    Optional<User> findByNickname(String nickname);

    boolean existsByFriendCode(String friendCode);
}
