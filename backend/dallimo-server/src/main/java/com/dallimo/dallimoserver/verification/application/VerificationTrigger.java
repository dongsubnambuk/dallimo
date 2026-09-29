package com.dallimo.dallimoserver.verification.application;

import com.dallimo.dallimoserver.running.domain.RunFinishedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.time.Duration;

/**
 * 검증을 언제 돌릴지. 12.4장 비동기 처리: finish 응답을 늦추지 않도록 커밋 뒤 따로 돈다.
 * 서버가 그 사이 꺼지면 검증 대기로 남으므로 주기적으로 다시 찾는다.
 */
@Component
public class VerificationTrigger {

    private static final Logger log = LoggerFactory.getLogger(VerificationTrigger.class);
    // 커밋 뒤 검증이 이미 도는 중일 수 있어 이만큼 지난 것만 다시 본다
    static final Duration STALE_AFTER = Duration.ofMinutes(1);
    static final int SWEEP_LIMIT = 50;

    private final CourseVerificationService verification;
    private final Clock clock;

    public VerificationTrigger(CourseVerificationService verification, Clock clock) {
        this.verification = verification;
        this.clock = clock;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onFinished(RunFinishedEvent e) {
        run(e.runId());
    }

    @Scheduled(fixedDelayString = "${dallimo.verification.sweep-interval:1m}", initialDelayString = "${dallimo.verification.sweep-interval:1m}")
    public void sweep() {
        for (Long id : verification.stalePending(clock.instant().minus(STALE_AFTER), SWEEP_LIMIT)) run(id);
    }

    private void run(long runId) {
        try {
            verification.verify(runId).ifPresent(r -> log.info("run {} verification {} {}", runId, r.outcome(), r.failureReason() == null ? "" : r.failureReason()));
        } catch (RuntimeException ex) {
            // 다음 주기에 다시 시도한다
            log.error("run {} verification failed", runId, ex);
        }
    }
}
