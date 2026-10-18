package com.dallimo.dallimoserver.notification;

import com.dallimo.dallimoserver.auth.domain.RefreshSession;
import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import com.dallimo.dallimoserver.notification.application.NotificationService;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository;
import com.dallimo.dallimoserver.notification.infrastructure.PushTokenJdbcRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.time.Clock;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** FOUNDATION-DECISION-LOG 93항: 같은 기기의 토큰 등록이 겹쳐 실패하면 새 트랜잭션으로 다시 한다 */
class PushTokenRetryTest {

    private final PushTokenJdbcRepository tokens = mock(PushTokenJdbcRepository.class);
    private final PlatformTransactionManager txm = mock(PlatformTransactionManager.class);
    private final NotificationService service;

    PushTokenRetryTest() {
        RefreshSessionRepository sessions = mock(RefreshSessionRepository.class);
        RefreshSession session = mock(RefreshSession.class);
        when(session.getUserId()).thenReturn(7L);
        when(session.getDeviceId()).thenReturn("device-1");
        when(sessions.findById(3L)).thenReturn(Optional.of(session));
        when(txm.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        service = new NotificationService(mock(NotificationJdbcRepository.class), tokens, sessions, mock(ApplicationEventPublisher.class),
                Clock.systemUTC(), txm);
    }

    @Test
    void retriesAfterDuplicateKeyOrDeadlock() {
        doThrow(new DuplicateKeyException("dup")).doThrow(new CannotAcquireLockException("deadlock")).doNothing()
                .when(tokens).save(eq(7L), eq("device-1"), eq("T"), eq("ios"), any());
        service.registerToken(7L, 3L, "T", "ios");
        verify(tokens, times(3)).save(eq(7L), eq("device-1"), eq("T"), eq("ios"), any());
        verify(txm, times(2)).rollback(any());
        verify(txm, times(1)).commit(any());
    }

    @Test
    void givesUpAfterThreeAttempts() {
        doThrow(new CannotAcquireLockException("deadlock")).when(tokens).save(anyLong(), anyString(), anyString(), anyString(), any());
        assertThatThrownBy(() -> service.registerToken(7L, 3L, "T", "ios")).isInstanceOf(CannotAcquireLockException.class);
        verify(tokens, times(3)).save(anyLong(), anyString(), anyString(), anyString(), any());
    }
}
