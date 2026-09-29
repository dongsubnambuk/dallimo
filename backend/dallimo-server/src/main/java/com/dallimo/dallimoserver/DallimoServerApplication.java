package com.dallimo.dallimoserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class DallimoServerApplication {

    public static void main(String[] args) {
        // 40.4장: 서버 기준 시간은 UTC. JDBC · JSON · 로그가 모두 같은 기준을 쓰게 한다
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(DallimoServerApplication.class, args);
    }

}
