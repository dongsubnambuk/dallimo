package com.dallimo.dallimoserver.workout.infrastructure;

import com.dallimo.dallimoserver.workout.domain.BlockType;
import com.dallimo.dallimoserver.workout.domain.EndConditionType;
import com.dallimo.dallimoserver.workout.domain.StepType;
import com.dallimo.dallimoserver.workout.domain.TargetType;
import com.dallimo.dallimoserver.workout.domain.WorkoutDefinition;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** tbl_workout_template · tbl_workout_block · tbl_workout_step (V12) */
@Repository
public class WorkoutJdbcRepository {

    private final JdbcTemplate jdbc;

    public WorkoutJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 템플릿 한 줄. lastRunAt: 이 인터벌로 마지막으로 끝낸 달리기 시작 시각, runCount: 끝낸 달리기 수 */
    public record Row(long id, long userId, String name, String description, int version, Instant createdAt, Instant updatedAt,
                      Instant lastRunAt, int runCount) {
    }

    private static final String SELECT = """
            SELECT t.id, t.user_id, t.name, t.description, t.version, t.created_at, t.updated_at,
                   (SELECT MAX(r.started_at) FROM tbl_run r WHERE r.workout_template_id = t.id AND r.status = 'FINISHED') AS last_run_at,
                   (SELECT COUNT(*) FROM tbl_run r WHERE r.workout_template_id = t.id AND r.status = 'FINISHED') AS run_count
            FROM tbl_workout_template t""";

    private static final RowMapper<Row> ROW = (rs, i) -> new Row(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getInt(5),
            rs.getTimestamp(6).toInstant(), rs.getTimestamp(7).toInstant(), instant(rs.getTimestamp(8)), rs.getInt(9));

    /** 지우지 않은 템플릿 */
    public Optional<Row> find(long id) {
        return jdbc.query(SELECT + " WHERE t.id = ? AND t.deleted_at IS NULL", ROW, id).stream().findFirst();
    }

    /** 내 인터벌: 최근에 고치거나 만든 것 먼저 */
    public List<Row> list(long userId) {
        return jdbc.query(SELECT + " WHERE t.user_id = ? AND t.deleted_at IS NULL ORDER BY t.updated_at DESC, t.id DESC", ROW, userId);
    }

    /** 지운 것도 포함한 주인 (없으면 null) */
    public Long ownerIncludingDeleted(long id) {
        return jdbc.queryForList("SELECT user_id FROM tbl_workout_template WHERE id = ?", Long.class, id).stream().findFirst().orElse(null);
    }

    public int countActive(long userId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_workout_template WHERE user_id = ? AND deleted_at IS NULL", Integer.class, userId);
        return n == null ? 0 : n;
    }

    public long insert(long userId, WorkoutDefinition def, Instant now) {
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO tbl_workout_template (user_id, name, description, version, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)""",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, def.name());
            ps.setString(3, def.description());
            ps.setTimestamp(4, Timestamp.from(now));
            ps.setTimestamp(5, Timestamp.from(now));
            return ps;
        }, key);
        long id = key.getKey().longValue();
        insertBlocks(id, 1, def.blocks());
        return id;
    }

    /** 고치면 새 버전을 만든다. 옛 버전 구간은 그대로 둔다 */
    public int update(long id, WorkoutDefinition def, Instant now) {
        int version = jdbc.queryForObject("SELECT version FROM tbl_workout_template WHERE id = ? FOR UPDATE", Integer.class, id) + 1;
        jdbc.update("UPDATE tbl_workout_template SET name = ?, description = ?, version = ?, updated_at = ? WHERE id = ?",
                def.name(), def.description(), version, Timestamp.from(now), id);
        insertBlocks(id, version, def.blocks());
        return version;
    }

    public void softDelete(long id, Instant now) {
        jdbc.update("UPDATE tbl_workout_template SET deleted_at = ?, updated_at = ? WHERE id = ?", Timestamp.from(now), Timestamp.from(now), id);
    }

    /** 템플릿이 이 버전을 가진 적이 있나 (달린 기록을 이을 때) */
    public boolean hasVersion(long id, int version) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_workout_block WHERE template_id = ? AND template_version = ?", Integer.class, id, version);
        return n != null && n > 0;
    }

    /** 여러 템플릿의 현재 버전 구간 (id → 묶음 목록) */
    public Map<Long, List<WorkoutDefinition.Block>> currentBlocks(List<Long> templateIds) {
        Map<Long, List<WorkoutDefinition.Block>> out = new LinkedHashMap<>();
        if (templateIds.isEmpty()) return out;
        String in = String.join(",", templateIds.stream().map(x -> "?").toList());
        // 묶음 id별 구간 목록 (같은 묶음의 구간을 모은다)
        Map<Long, List<WorkoutDefinition.Step>> byBlock = new LinkedHashMap<>();
        jdbc.query("""
                SELECT b.template_id, b.id, b.type, b.repeat_count, s.step_type, s.end_condition_type, s.end_condition_value, s.target_type, s.target_min, s.target_max
                FROM tbl_workout_template t
                JOIN tbl_workout_block b ON b.template_id = t.id AND b.template_version = t.version
                JOIN tbl_workout_step s ON s.block_id = b.id
                WHERE t.id IN (%s)
                ORDER BY b.template_id, b.seq, s.seq""".formatted(in), rs -> {
            long blockId = rs.getLong(2);
            List<WorkoutDefinition.Step> steps = byBlock.get(blockId);
            if (steps == null) {
                steps = new ArrayList<>();
                byBlock.put(blockId, steps);
                out.computeIfAbsent(rs.getLong(1), k -> new ArrayList<>())
                        .add(new WorkoutDefinition.Block(BlockType.valueOf(rs.getString(3)), rs.getInt(4), steps));
            }
            steps.add(step(rs, 5));
        }, templateIds.toArray());
        return out;
    }

    private void insertBlocks(long templateId, int version, List<WorkoutDefinition.Block> blocks) {
        for (int i = 0; i < blocks.size(); i++) {
            WorkoutDefinition.Block b = blocks.get(i);
            GeneratedKeyHolder key = new GeneratedKeyHolder();
            int seq = i + 1;
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO tbl_workout_block (template_id, template_version, seq, type, repeat_count) VALUES (?, ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, templateId);
                ps.setInt(2, version);
                ps.setInt(3, seq);
                ps.setString(4, b.type().name());
                ps.setInt(5, b.count());
                return ps;
            }, key);
            long blockId = key.getKey().longValue();
            List<WorkoutDefinition.Step> steps = b.steps();
            for (int j = 0; j < steps.size(); j++) {
                WorkoutDefinition.Step s = steps.get(j);
                jdbc.update("""
                        INSERT INTO tbl_workout_step (block_id, seq, step_type, end_condition_type, end_condition_value, target_type, target_min, target_max)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", blockId, j + 1, s.stepType().name(), s.endConditionType().name(), s.endConditionValue(),
                        s.targetType() == null ? null : s.targetType().name(), s.targetMin(), s.targetMax());
            }
        }
    }

    /** from번째 열부터 step_type, end_condition_type, end_condition_value, target_type, target_min, target_max */
    public static WorkoutDefinition.Step step(ResultSet rs, int from) throws SQLException {
        String target = rs.getString(from + 3);
        return new WorkoutDefinition.Step(StepType.valueOf(rs.getString(from)), EndConditionType.valueOf(rs.getString(from + 1)),
                rs.getObject(from + 2, Integer.class), target == null ? null : TargetType.valueOf(target),
                rs.getObject(from + 4, Integer.class), rs.getObject(from + 5, Integer.class));
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
