# DALLIMO Backend

이 디렉터리는 달리모(DALLIMO) 백엔드인 Spring Boot 프로젝트가 들어갈 위치입니다.

현재는 frontend를 먼저 개발하는 단계라서 Spring Boot 프로젝트를 아직 생성하지 않았습니다.

## 예정 기술 기준

마스터 스펙(`docs/spec/dallimo_master_spec_v1.8_feedback_features.docx`) 기준입니다.

- Spring Boot
- MySQL(개발) / MariaDB(운영)
- Redis
- DB 마이그레이션: Flyway
- 패키지 구조: 도메인별 controller / application(service) / domain / repository / dto

Spring Boot와 Java 버전은 프로젝트 생성 시점에 공식 호환성을 확인한 뒤 확정합니다.
