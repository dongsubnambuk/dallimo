package com.dallimo.dallimoserver.share.application;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ShareProperties.class)
public class ShareConfig {
}
