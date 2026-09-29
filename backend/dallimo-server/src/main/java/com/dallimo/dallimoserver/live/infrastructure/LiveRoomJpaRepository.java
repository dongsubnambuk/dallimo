package com.dallimo.dallimoserver.live.infrastructure;

import com.dallimo.dallimoserver.live.domain.LiveRoom;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LiveRoomJpaRepository extends JpaRepository<LiveRoom, Long> {

    /** 참가 · 준비 · 상태 전이는 방 행을 잠그고 차례로 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM LiveRoom r WHERE r.id = :id")
    Optional<LiveRoom> findForUpdate(@Param("id") long id);
}
