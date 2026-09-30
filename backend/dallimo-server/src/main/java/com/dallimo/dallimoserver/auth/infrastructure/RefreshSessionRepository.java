package com.dallimo.dallimoserver.auth.infrastructure;

import com.dallimo.dallimoserver.auth.domain.RefreshSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface RefreshSessionRepository extends JpaRepository<RefreshSession, Long> {

    /** 같은 토큰으로 동시에 refresh가 와도 한 번씩 처리한다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RefreshSession s where s.id = :id")
    Optional<RefreshSession> findForUpdate(Long id);

    /** 탈퇴: 모든 기기의 세션을 끊는다 */
    @Modifying
    @Query("update RefreshSession s set s.revokedAt = :now where s.userId = :userId and s.revokedAt is null")
    int revokeAllOfUser(Long userId, java.time.Instant now);

    /** 비밀번호 변경: 이 기기 세션만 남기고 끊는다 */
    @Modifying
    @Query("update RefreshSession s set s.revokedAt = :now where s.userId = :userId and s.id <> :keepId and s.revokedAt is null")
    int revokeOthersOfUser(Long userId, Long keepId, java.time.Instant now);

    @Modifying
    @Query("delete from RefreshSession s where s.userId = :userId and s.deviceId = :deviceId")
    int deleteByUserIdAndDeviceId(Long userId, String deviceId);
}
