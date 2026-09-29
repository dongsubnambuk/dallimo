package com.dallimo.dallimoserver.live.infrastructure;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 47장 Redis 실시간 상태. 영구 사실이 아니라 방이 끝나면 DB에 최종 결과만 남긴다 (8.4장).
 * live:room:{id}:meta (hash)  — startedAt, firstFinishAt
 * live:room:{id}:member:{uid} (hash) — seq, distanceM, elapsedSec, paceSec, status, finishSec, lastSeenAt, connected
 * live:room:{id}:members (set) — userId
 * 상태 갱신은 Lua로 seq 비교와 쓰기를 한 번에 한다 (47장 부분 상태 노출 방지, 30.3장 stale 무시).
 */
@Repository
public class LiveStateStore {

    // KEYS[1] member hash, ARGV: seq, distanceM, elapsedSec, paceSec, status, lastSeenAt, ttlSeconds
    // 저장된 seq보다 크고 이미 끝난(FINISHED · DNF) 상태가 아니면 쓴다. 1 = 받음, 0 = 무시
    private static final DefaultRedisScript<Long> UPDATE = new DefaultRedisScript<>("""
            local cur = tonumber(redis.call('HGET', KEYS[1], 'seq') or '0')
            local st = redis.call('HGET', KEYS[1], 'status')
            if st == 'FINISHED' or st == 'DNF' then return 0 end
            if tonumber(ARGV[1]) <= cur then return 0 end
            redis.call('HSET', KEYS[1], 'seq', ARGV[1], 'distanceM', ARGV[2], 'elapsedSec', ARGV[3], 'paceSec', ARGV[4],
                       'status', ARGV[5], 'lastSeenAt', ARGV[6], 'connected', '1')
            if ARGV[5] == 'FINISHED' then redis.call('HSET', KEYS[1], 'finishSec', ARGV[3]) end
            redis.call('EXPIRE', KEYS[1], ARGV[7])
            return 1
            """, Long.class);

    private final StringRedisTemplate redis;

    public LiveStateStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public record MemberState(long userId, long seq, int distanceM, int elapsedSec, Integer paceSec, String status, Integer finishSec,
                              Instant lastSeenAt, boolean connected) {
    }

    static String meta(long roomId) {
        return "live:room:" + roomId + ":meta";
    }

    static String members(long roomId) {
        return "live:room:" + roomId + ":members";
    }

    static String member(long roomId, long userId) {
        return "live:room:" + roomId + ":member:" + userId;
    }

    /** 방이 출발할 때: 참가자를 RUNNING · 0m로 시작한다. 이미 있으면 두지 않고 그대로 */
    public void start(long roomId, List<Long> userIds, Instant startedAt, Duration ttl) {
        redis.opsForHash().putIfAbsent(meta(roomId), "startedAt", String.valueOf(startedAt.toEpochMilli()));
        redis.expire(meta(roomId), ttl);
        for (Long uid : userIds) {
            redis.opsForSet().add(members(roomId), String.valueOf(uid));
            String key = member(roomId, uid);
            redis.opsForHash().putIfAbsent(key, "seq", "0");
            redis.opsForHash().putIfAbsent(key, "distanceM", "0");
            redis.opsForHash().putIfAbsent(key, "elapsedSec", "0");
            redis.opsForHash().putIfAbsent(key, "status", "RUNNING");
            redis.opsForHash().putIfAbsent(key, "lastSeenAt", String.valueOf(startedAt.toEpochMilli()));
            redis.opsForHash().putIfAbsent(key, "connected", "1");
            redis.expire(key, ttl);
        }
        redis.expire(members(roomId), ttl);
    }

    /** true면 받은 상태, false면 오래된 seq이거나 이미 끝난 사람이라 무시 */
    public boolean update(long roomId, long userId, long seq, int distanceM, int elapsedSec, Integer paceSec, String status, Instant now, Duration ttl) {
        Long r = redis.execute(UPDATE, List.of(member(roomId, userId)), String.valueOf(seq), String.valueOf(distanceM), String.valueOf(elapsedSec),
                paceSec == null ? "" : String.valueOf(paceSec), status, String.valueOf(now.toEpochMilli()), String.valueOf(ttl.toSeconds()));
        return r != null && r == 1L;
    }

    /** heartbeat · 재연결. 끊겨 있었으면 true (다시 연결됨) */
    public boolean touch(long roomId, long userId, Instant now) {
        String key = member(roomId, userId);
        Object was = redis.opsForHash().get(key, "connected");
        redis.opsForHash().put(key, "lastSeenAt", String.valueOf(now.toEpochMilli()));
        redis.opsForHash().put(key, "connected", "1");
        return "0".equals(was);
    }

    public void setConnected(long roomId, long userId, boolean connected) {
        redis.opsForHash().put(member(roomId, userId), "connected", connected ? "1" : "0");
    }

    /** 방장이 아닌 사람이 나가기 · 서버가 마감할 때 */
    public void setStatus(long roomId, long userId, String status) {
        redis.opsForHash().put(member(roomId, userId), "status", status);
    }

    public void markFirstFinish(long roomId, Instant at) {
        redis.opsForHash().putIfAbsent(meta(roomId), "firstFinishAt", String.valueOf(at.toEpochMilli()));
    }

    public Instant firstFinishAt(long roomId) {
        Object v = redis.opsForHash().get(meta(roomId), "firstFinishAt");
        return v == null ? null : Instant.ofEpochMilli(Long.parseLong(v.toString()));
    }

    public Map<Long, MemberState> states(long roomId) {
        Map<Long, MemberState> out = new HashMap<>();
        var ids = redis.opsForSet().members(members(roomId));
        if (ids == null) return out;
        for (String id : ids) {
            long uid = Long.parseLong(id);
            Map<Object, Object> h = redis.opsForHash().entries(member(roomId, uid));
            if (h.isEmpty()) continue;
            out.put(uid, new MemberState(uid, num(h.get("seq")), (int) num(h.get("distanceM")), (int) num(h.get("elapsedSec")),
                    optInt(h.get("paceSec")), String.valueOf(h.getOrDefault("status", "RUNNING")), optInt(h.get("finishSec")),
                    Instant.ofEpochMilli(num(h.get("lastSeenAt"))), !"0".equals(h.get("connected"))));
        }
        return out;
    }

    /** 응원 간격: 이 사람이 cooldown 안에 이미 응원했으면 false (서버가 여러 대여도 같은 값) */
    public boolean allowCheer(long roomId, long userId, Duration cooldown) {
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent("live:room:" + roomId + ":cheer:" + userId, "1", cooldown));
    }

    /** 끝난 방: 결과는 DB에 있으니 짧게만 남긴다 (47.1장) */
    public void expireRoom(long roomId, Duration ttl) {
        var ids = redis.opsForSet().members(members(roomId));
        if (ids != null) for (String id : ids) redis.expire(member(roomId, Long.parseLong(id)), ttl);
        redis.expire(members(roomId), ttl);
        redis.expire(meta(roomId), ttl);
    }

    private static long num(Object v) {
        if (v == null || v.toString().isEmpty()) return 0;
        return Long.parseLong(v.toString());
    }

    private static Integer optInt(Object v) {
        return v == null || v.toString().isEmpty() ? null : Integer.valueOf(v.toString());
    }
}
