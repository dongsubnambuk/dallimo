package com.dallimo.dallimoserver.ranking.api;

import com.dallimo.dallimoserver.ranking.application.RankingService;

import java.util.List;

/** 43장 RankingEntry. relation: self · friend · normal. isPB: 내 줄에서 이 기간 기록이 내 PB인가 */
public final class RankingDtos {

    private RankingDtos() {
    }

    public record RankingEntryResponse(int rank, long userId, String name, int timeSec, int paceSecPerKm, String relation, boolean isPB) {
        public static RankingEntryResponse from(RankingService.Entry e) {
            return e == null ? null : new RankingEntryResponse(e.rank(), e.userId(), e.name(), e.timeSec(), e.paceSecPerKm(), e.relation(), e.personalBest());
        }

        public static List<RankingEntryResponse> from(List<RankingService.Entry> list) {
            return list.stream().map(RankingEntryResponse::from).toList();
        }
    }

    /** RNK-005 내 주변 순위. 기록이 없으면 entry null, around 빈 목록 */
    public record StandingResponse(int total, RankingEntryResponse entry, List<RankingEntryResponse> around) {
    }
}
