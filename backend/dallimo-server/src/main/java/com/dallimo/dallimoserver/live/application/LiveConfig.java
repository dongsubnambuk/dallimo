package com.dallimo.dallimoserver.live.application;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(LiveProperties.class)
public class LiveConfig {
}
