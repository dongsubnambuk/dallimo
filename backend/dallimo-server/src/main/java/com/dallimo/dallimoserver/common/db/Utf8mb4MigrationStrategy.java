package com.dallimo.dallimoserver.common.db;

import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * 스키마를 만들기 전에 DB 기본 문자셋을 utf8mb4로 맞춘 뒤 Flyway를 돌린다. 22.4장 DDL은 테이블마다 문자셋을 적지 않아 DB 기본값을 따른다.
 * DB 서버 기본 문자셋이 latin1이면(MariaDB는 11.6 전 기본 빌드 값, 설치 · 설정에 따라 다르다) 접속할 때 만든 DB(createDatabaseIfNotExist)에
 * 한글 닉네임 · 코스 이름을 저장하지 못한다. 이미 utf8mb4면 아무것도 하지 않는다.
 * 세션은 접속할 때의 DB 기본 문자셋을 기억하므로, 바꾼 뒤에는 풀의 연결을 새로 받아 마이그레이션이 새 기본값으로 테이블을 만들게 한다.
 */
@Component
public class Utf8mb4MigrationStrategy implements FlywayMigrationStrategy {

    private static final Logger log = LoggerFactory.getLogger(Utf8mb4MigrationStrategy.class);
    static final String CHARSET = "utf8mb4";
    static final String COLLATION = "utf8mb4_unicode_ci";

    @Override
    public void migrate(Flyway flyway) {
        DataSource ds = flyway.getConfiguration().getDataSource();
        if (ensureUtf8mb4(ds) && ds instanceof HikariDataSource hikari && hikari.getHikariPoolMXBean() != null) {
            hikari.getHikariPoolMXBean().softEvictConnections();
        }
        flyway.migrate();
    }

    /** 바꿨으면 true. 바꿀 권한이 없으면 무엇을 해야 하는지 알려 주고 시작하지 않는다 */
    static boolean ensureUtf8mb4(DataSource ds) {
        try (Connection c = ds.getConnection(); Statement s = c.createStatement()) {
            String current;
            String db;
            try (ResultSet rs = s.executeQuery("SELECT @@character_set_database, DATABASE()")) {
                rs.next();
                current = rs.getString(1);
                db = rs.getString(2);
            }
            if (db == null || CHARSET.equalsIgnoreCase(current)) return false;
            try {
                s.execute("ALTER DATABASE `" + db.replace("`", "``") + "` CHARACTER SET " + CHARSET + " COLLATE " + COLLATION);
            } catch (SQLException e) {
                throw new IllegalStateException("DB " + db + "의 기본 문자셋이 " + current + "예요. 한글을 저장하려면 utf8mb4여야 해요. DB 관리자 계정으로 "
                        + "ALTER DATABASE " + db + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; 를 실행해 주세요.", e);
            }
            log.info("database {} default charset {} -> {} ({})", db, current, CHARSET, COLLATION);
            return true;
        } catch (SQLException e) {
            throw new IllegalStateException("DB 문자셋을 확인하지 못했어요.", e);
        }
    }
}
