package com.dallimo.dallimoserver;

import org.springframework.boot.SpringApplication;

public class TestDallimoServerApplication {

    public static void main(String[] args) {
        SpringApplication.from(DallimoServerApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
