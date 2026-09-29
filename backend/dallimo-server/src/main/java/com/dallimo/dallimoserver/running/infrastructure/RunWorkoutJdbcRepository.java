package com.dallimo.dallimoserver.running.infrastructure;

import com.dallimo.dallimoserver.running.domain.RunWorkoutStep;
import com.dallimo.dallimoserver.workout.infrastructure.WorkoutJdbcRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/** tbl_run_workout_step (V12): 인터벌 달리기의 구간별 실제 거리 · 시간 */
@Repository
public class RunWorkoutJdbcRepository {

    private final JdbcTemplate jdbc;

    public RunWorkoutJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insertAll(long runId, List<RunWorkoutStep> steps) {
        for (int i = 0; i < steps.size(); i++) {
            RunWorkoutStep s = steps.get(i);
            var d = s.step();
            jdbc.update("""
                    INSERT INTO tbl_run_workout_step (run_id, seq, step_type, repeat_index, repeat_count, end_condition_type, end_condition_value,
                                                      target_type, target_min, target_max, distance_m, elapsed_seconds, completed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    runId, i + 1, d.stepType().name(), s.repeatIndex(), s.repeatCount(), d.endConditionType().name(), d.endConditionValue(),
                    d.targetType() == null ? null : d.targetType().name(), d.targetMin(), d.targetMax(), s.distanceM(), s.elapsedSeconds(), s.completed());
        }
    }

    public List<RunWorkoutStep> findAll(long runId) {
        return jdbc.query("""
                SELECT step_type, end_condition_type, end_condition_value, target_type, target_min, target_max,
                       repeat_index, repeat_count, distance_m, elapsed_seconds, completed
                FROM tbl_run_workout_step WHERE run_id = ? ORDER BY seq""", (rs, i) -> new RunWorkoutStep(WorkoutJdbcRepository.step(rs, 1),
                rs.getObject(7, Integer.class), rs.getObject(8, Integer.class), rs.getInt(9), rs.getInt(10), rs.getBoolean(11)), runId);
    }
}
