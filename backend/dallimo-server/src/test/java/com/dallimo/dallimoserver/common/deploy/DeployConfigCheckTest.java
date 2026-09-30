package com.dallimo.dallimoserver.common.deploy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class DeployConfigCheckTest {

    @Test
    void listsEveryMissingOptionalSetting() {
        MockEnvironment env = new MockEnvironment();

        assertThat(DeployConfigCheck.missing(env)).map(s -> s.substring(0, s.indexOf(':')))
                .containsExactly("SHARE_PUBLIC_BASE_URL", "APP_LINK_IOS_APP_IDS", "APP_LINK_ANDROID_PACKAGE · APP_LINK_ANDROID_SHA256",
                        "ADMIN_API_KEY", "DATA_GO_KR_SERVICE_KEY");
    }

    @Test
    void nothingMissingWhenAllSet() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("dallimo.share.public-base-url", "https://dallimo.app")
                .withProperty("dallimo.share.app-links.ios-app-ids", "ABCDE12345.com.dallimo.app")
                .withProperty("dallimo.share.app-links.android-package", "com.dallimo.app")
                .withProperty("dallimo.share.app-links.android-sha256", "AA:BB")
                .withProperty("dallimo.admin.api-key", "k")
                .withProperty("dallimo.external-courses.durunubi.service-key", "s");

        assertThat(DeployConfigCheck.missing(env)).isEmpty();
    }
}
