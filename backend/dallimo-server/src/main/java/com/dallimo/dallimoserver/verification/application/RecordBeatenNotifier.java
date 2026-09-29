package com.dallimo.dallimoserver.verification.application;

import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.notification.application.NotificationService;
import com.dallimo.dallimoserver.notification.domain.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 14.2장 RECORD_BEATEN: 새 공식 기록이 친구의 이 코스 최고 기록을 처음으로 넘었으면 그 친구에게 알린다.
 * 이미 넘어 있던 친구에게는 다시 알리지 않는다 (이전 내 최고가 친구보다 느리거나 없었을 때만).
 */
@Component
public class RecordBeatenNotifier {

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final FriendService friends;
    private final NotificationService notifications;

    public RecordBeatenNotifier(JdbcTemplate jdbc, NamedParameterJdbcTemplate named, FriendService friends, NotificationService notifications) {
        this.jdbc = jdbc;
        this.named = named;
        this.friends = friends;
        this.notifications = notifications;
    }

    private record FriendBest(long userId, int best) {
    }

    public void onRecord(long courseId, long runId, long userId, int recordSeconds) {
        List<Long> ids = friends.friendIds(userId);
        if (ids.isEmpty()) return;
        Integer previous = jdbc.queryForObject("SELECT MIN(duration_seconds) FROM tbl_course_record WHERE course_id = ? AND user_id = ? AND run_id <> ?",
                Integer.class, courseId, userId, runId);
        List<FriendBest> bests = named.query("""
                SELECT user_id, MIN(duration_seconds) AS best FROM tbl_course_record
                WHERE course_id = :course AND user_id IN (:ids) GROUP BY user_id""",
                new MapSqlParameterSource("course", courseId).addValue("ids", ids), (rs, i) -> new FriendBest(rs.getLong("user_id"), rs.getInt("best")));
        List<FriendBest> passed = bests.stream().filter(f -> recordSeconds < f.best() && (previous == null || previous >= f.best())).toList();
        if (passed.isEmpty()) return;
        String name = jdbc.queryForObject("SELECT nickname FROM tbl_user WHERE id = ?", String.class, userId);
        String course = jdbc.queryForObject("SELECT name FROM tbl_course WHERE id = ?", String.class, courseId);
        for (FriendBest f : passed) {
            notifications.notify(f.userId(), NotificationType.RECORD_BEATEN, "내 코스 기록을 넘었어요",
                    name + "님이 " + course + "에서 " + clock(recordSeconds) + "로 내 기록 " + clock(f.best()) + "을 넘었어요", "/course/" + courseId);
        }
    }

    /** 12:40, 1:02:05 */
    static String clock(int sec) {
        int h = sec / 3600, m = sec % 3600 / 60, s = sec % 60;
        return h > 0 ? "%d:%02d:%02d".formatted(h, m, s) : "%d:%02d".formatted(m, s);
    }
}
