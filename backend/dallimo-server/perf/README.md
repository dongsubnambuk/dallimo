# 성능 측정 (perf)

명세 31장(성능 테스트 계획) · 54장(벤치마크 양식)을 따라 개선 전후를 같은 데이터 · 같은 부하로 잰다 (결정 로그 70항). 결과 정리는 `docs/perf/README.md`.

## 준비

1. 로컬 MySQL 8 · Redis를 띄운다 (`application-dev.yaml`과 같은 접속 정보).
2. 서버를 측정용 DB(`dallimo_perf`)로 한 번 띄워 Flyway가 스키마를 만들게 한다.

```bash
./gradlew bootJar -x test
SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/dallimo_perf?createDatabaseIfNotExist=true' \
  java -Xms1g -Xmx2g -jar build/libs/dallimo-server-0.0.1-SNAPSHOT.jar --logging.level.com.dallimo=warn
```

3. 데이터를 넣는다 (약 2~4분). 같은 시드 난수라 매번 같은 데이터가 들어간다.

```bash
node perf/seed.mjs
```

| 데이터 | 규모 |
| --- | --- |
| 사용자 · 세션 | 20,000명 |
| 코스 | 10,000개 (절반은 수성못 주변 3km, 경로 점 100개씩 → 100만 행) |
| 인기 코스(id 100001) 공식 기록 | 100,000건 (사용자 2만 명이 평균 5번, 최근 180일) |
| 다른 코스 50개 공식 기록 | 200,000건 |
| Run | 300,000건 (기록마다 하나) |

## 측정

```bash
node perf/bench-read.mjs <label>   # 랭킹 · 내 순위 · 코스 상세 · 주변 코스. 예열 100번 뒤 동시 10명 × 500번
node perf/bench-gps.mjs <label>    # 러너 20명이 2시간 러닝(60점 × 120묶음)을 동시에 올린다
RUNNERS=1 node perf/bench-gps.mjs <label>-1runner   # 경쟁 없이 묶음 하나의 지연
```

- 결과는 `perf/results/<label>-read.json` · `<label>-gps.json`.
- Access Token은 서버와 같은 개발용 키로 직접 만든다(`lib.mjs`의 `token`). 로그인 요청 제한에 걸리지 않게.
- 바꾼 서버로 다시 잴 때는 서버만 새로 띄우고 같은 명령을 돌린다. GPS 측정은 매번 새 Run을 만들어서 데이터를 다시 넣지 않아도 된다.
