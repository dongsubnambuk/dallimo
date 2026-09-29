package com.dallimo.dallimoserver.running.infrastructure;

import com.dallimo.dallimoserver.running.domain.Run;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface RunJpaRepository extends JpaRepository<Run, Long> {

    Optional<Run> findByClientRunUuid(String clientRunUuid);

    /** 내 기록 목록 (최근 시작 순, 27.3장 cursor). idx_run_user_started를 쓴다 */
    @Query("""
            select r from Run r
            where r.userId = :userId and r.status = com.dallimo.dallimoserver.running.domain.RunStatus.FINISHED
              and (r.startedAt < :beforeStartedAt or (r.startedAt = :beforeStartedAt and r.id < :beforeId))
            order by r.startedAt desc, r.id desc""")
    java.util.List<Run> findPage(Long userId, java.time.Instant beforeStartedAt, Long beforeId, org.springframework.data.domain.Pageable page);

    /** point 업로드 · finish를 한 Run 안에서 차례로 처리한다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Run r where r.id = :id")
    Optional<Run> findForUpdate(Long id);
}
