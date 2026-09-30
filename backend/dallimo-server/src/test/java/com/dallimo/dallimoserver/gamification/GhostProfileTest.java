package com.dallimo.dallimoserver.gamification;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.gamification.domain.GhostProfile;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 124장 Ghost: 공식 기록을 "코스 위 거리 → 걸린 초"로 줄인다 */
class GhostProfileTest {

    @Test
    void evenRunBecomesStraightProfile() {
        List<CourseRoute.Point> route = SegmentTimerTest.north(2000);
        List<RunPoint> run = SegmentTimerTest.run(0, 500, 4.0, 0, -1);
        List<double[]> g = GhostProfile.of(route, run, 2000, 500);
        assertThat(g.get(0)).containsExactly(0, 0);
        assertThat(g.get(g.size() - 1)).containsExactly(2000, 500);
        // 50m마다, 앞으로만 는다
        assertThat(g).hasSize(41);
        for (int i = 1; i < g.size(); i++) assertThat(g.get(i)[1]).isGreaterThanOrEqualTo(g.get(i - 1)[1]);
        double[] mid = g.get(20);
        assertThat(mid[0]).isEqualTo(1000);
        assertThat(mid[1]).isBetween(248.0, 252.0);
    }

    @Test
    void unevenRunKeepsItsShape() {
        // 앞 1000m는 초속 5m(200초), 뒤 1000m는 초속 2.5m(400초)
        List<RunPoint> run = new ArrayList<>();
        for (int s = 0; s <= 600; s++) {
            double d = s <= 200 ? s * 5.0 : 1000 + (s - 200) * 2.5;
            CourseRoute.Point p = SegmentTimerTest.at(d, 0);
            run.add(new RunPoint(s + 1, p.latitude(), p.longitude(), null, 5.0, null, SegmentTimerTest.T0.plusSeconds(s)));
        }
        List<double[]> g = GhostProfile.of(SegmentTimerTest.north(2000), run, 2000, 600);
        assertThat(g.get(20)[1]).isBetween(198.0, 202.0);
        assertThat(g.get(g.size() - 1)[1]).isEqualTo(600);
    }

    @Test
    void recordThatNeverFollowedTheCourseHasNoProfile() {
        // 코스에서 300m 떨어진 곳을 달린 기록
        assertThat(GhostProfile.of(SegmentTimerTest.north(2000), SegmentTimerTest.run(0, 500, 4.0, 300, -1), 2000, 500)).isEmpty();
    }
}
