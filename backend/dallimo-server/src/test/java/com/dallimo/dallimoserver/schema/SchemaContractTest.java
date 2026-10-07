package com.dallimo.dallimoserver.schema;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 22.4장 Flyway DDL이 MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과를 내는지 확인한다 (ADR-004).
 * 하위 클래스가 DB 컨테이너를 고른다.
 */
abstract class SchemaContractTest {

    static final List<String> TABLES = List.of(
            "tbl_user", "tbl_refresh_token",
            "tbl_course", "tbl_course_route_point",
            "tbl_run", "tbl_run_point", "tbl_run_sync_batch", "tbl_run_verification", "tbl_course_record",
            "tbl_course_bookmark", "tbl_course_tag", "tbl_share_link", "tbl_live_run_room", "tbl_live_run_member", "tbl_friendship", "tbl_challenge", "tbl_notification", "tbl_push_token", "tbl_notification_setting", "tbl_course_review", "tbl_course_report", "tbl_activity",
            "tbl_workout_template", "tbl_workout_block", "tbl_workout_step", "tbl_run_workout_step", "tbl_activity_import", "tbl_course_segment_record", "tbl_run_heart_rate", "tbl_admin_audit", "tbl_server_error", "tbl_notice");

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void allMigrationsApplied() {
        List<String> versions = jdbc.queryForList(
                "SELECT version FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL ORDER BY installed_rank", String.class);
        assertThat(versions).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26");
        List<String> tables = jdbc.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()", String.class);
        assertThat(tables).map(String::toLowerCase).containsAll(TABLES);
        // V19 온보딩 러너 정보 (결정 로그 64항)
        List<String> userColumns = jdbc.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tbl_user'", String.class);
        assertThat(userColumns).map(String::toLowerCase).contains("runner_distance", "runner_experience", "runner_time");
    }

    @Test
    void storesKoreanAndEmojiNickname() {
        long id = insertUser("달리는🏃수성러너", Instant.parse("2026-09-29T00:00:00Z"));
        assertThat(jdbc.queryForObject("SELECT nickname FROM tbl_user WHERE id = ?", String.class, id))
                .isEqualTo("달리는🏃수성러너");
    }

    @Test
    void keepsInstantInUtc() {
        // 40.4장: DATETIME(3)에는 UTC 벽시계 시각이 밀리초까지 그대로 들어가야 한다
        Instant at = Instant.parse("2026-09-23T12:00:00.123Z");
        long id = insertUser("시간확인" + suffix(), at);
        assertThat(jdbc.queryForObject("SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') FROM tbl_user WHERE id = ?", String.class, id))
                .isEqualTo("2026-09-23 12:00:00.123000");
        assertThat(jdbc.queryForObject("SELECT created_at FROM tbl_user WHERE id = ?", Timestamp.class, id).toInstant())
                .isEqualTo(at);
    }

    @Test
    void rejectsDuplicateClientRunUuid() {
        // 22.2장: client_run_uuid UNIQUE (POST /runs 멱등의 바탕)
        long userId = insertUser("멱등" + suffix(), Instant.now());
        String uuid = UUID.randomUUID().toString();
        insertRun(userId, uuid);
        assertThatThrownBy(() -> insertRun(userId, uuid)).isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void rejectsDuplicatePointSeq() {
        // 22.2장: UNIQUE(run_id, seq) — 같은 point가 두 번 들어가지 않는다
        long userId = insertUser("시퀀스" + suffix(), Instant.now());
        long runId = insertRun(userId, UUID.randomUUID().toString());
        insertPoint(runId, 1);
        assertThatThrownBy(() -> insertPoint(runId, 1)).isInstanceOf(DuplicateKeyException.class);
    }

    private long insertUser(String nickname, Instant at) {
        String code = suffix();
        jdbc.update("""
                INSERT INTO tbl_user (provider, provider_user_id, nickname, friend_code, created_at, updated_at)
                VALUES ('KAKAO', ?, ?, ?, ?, ?)""", "kakao-" + code, nickname, code, Timestamp.from(at), Timestamp.from(at));
        return jdbc.queryForObject("SELECT id FROM tbl_user WHERE friend_code = ?", Long.class, code);
    }

    private long insertRun(long userId, String clientRunUuid) {
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO tbl_run (user_id, client_run_uuid, mode, status, started_at, created_at, updated_at)
                VALUES (?, ?, 'FREE', 'RUNNING', ?, ?, ?)""", userId, clientRunUuid, now, now, now);
        return jdbc.queryForObject("SELECT id FROM tbl_run WHERE client_run_uuid = ?", Long.class, clientRunUuid);
    }

    private void insertPoint(long runId, int seq) {
        jdbc.update("""
                INSERT INTO tbl_run_point (run_id, seq, latitude, longitude, accuracy_m, recorded_at)
                VALUES (?, ?, 35.8286000, 128.6219000, 4.80, ?)""", runId, seq, Timestamp.from(Instant.now()));
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 12);
    }
}
