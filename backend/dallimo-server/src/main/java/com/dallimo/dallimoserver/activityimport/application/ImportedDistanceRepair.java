package com.dallimo.dallimoserver.activityimport.application;

import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.domain.RunSource;
import com.dallimo.dallimoserver.running.infrastructure.RunPointJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 가져온 기록 거리 다시 재기 (FOUNDATION-DECISION-LOG 92항). 서버를 켤 때 한 번 돈다.
 * 예전에는 건강 앱 경로 point를 정확도로 걸러 모두 빠지면 거리가 0으로 저장됐다. 경로가 있는데 거리가 0인 가져온 기록만 다시 잰다.
 * 고친 기록은 거리가 0이 아니게 되어 다음에 다시 돌지 않는다
 */
@Component
public class ImportedDistanceRepair implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ImportedDistanceRepair.class);

    private final JdbcTemplate jdbc;
    private final RunPointJdbcRepository points;

    public ImportedDistanceRepair(JdbcTemplate jdbc, RunPointJdbcRepository points) {
        this.jdbc = jdbc;
        this.points = points;
    }

    record Target(long id, RunSource source, int elapsedSeconds) {
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Target> targets = jdbc.query("""
                SELECT r.id, r.source, r.elapsed_seconds FROM tbl_run r
                WHERE r.source <> 'DALLIMO' AND r.status = 'FINISHED' AND r.distance_m = 0
                  AND EXISTS (SELECT 1 FROM tbl_run_point p WHERE p.run_id = r.id)""",
                (rs, i) -> new Target(rs.getLong(1), RunSource.valueOf(rs.getString(2)), rs.getInt(3)));
        int fixed = 0;
        for (Target t : targets) {
            List<RunPoint> raw = points.findAll(t.id());
            RunMetrics.Result m = RunMetrics.compute(raw, t.source());
            int distance = (int) Math.round(m.distanceM());
            if (distance <= 0) continue;
            jdbc.update("UPDATE tbl_run SET distance_m = ?, avg_pace_sec_per_km = ? WHERE id = ? AND distance_m = 0",
                    distance, RunMetrics.avgPace(m.distanceM(), t.elapsedSeconds()), t.id());
            fixed++;
        }
        if (!targets.isEmpty()) log.info("imported.distance.repair candidates={} fixed={}", targets.size(), fixed);
    }
}
