package com.dallimo.dallimoserver.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/** METRICS_TOKEN이 비어 있으면 지표 주소를 닫는다(404). 맞는 Bearer만 지나간다 */
class MetricsTokenFilterTest {

    @Test
    void closedWithoutConfiguredToken() throws Exception {
        assertThat(status(new MetricsSecurityConfig.TokenFilter(""), "Bearer anything")).isEqualTo(404);
        assertThat(status(new MetricsSecurityConfig.TokenFilter(null), null)).isEqualTo(404);
    }

    @Test
    void onlyMatchingBearerPasses() throws Exception {
        var filter = new MetricsSecurityConfig.TokenFilter("s3cret");
        assertThat(status(filter, null)).isEqualTo(401);
        assertThat(status(filter, "Bearer nope")).isEqualTo(401);
        assertThat(status(filter, "s3cret")).isEqualTo(200);
        assertThat(status(filter, "Bearer s3cret")).isEqualTo(200);
        assertThat(status(filter, "bearer s3cret")).isEqualTo(200);
    }

    private static int status(MetricsSecurityConfig.TokenFilter filter, String authorization) throws Exception {
        var req = new MockHttpServletRequest("GET", MetricsSecurityConfig.PATH);
        if (authorization != null) req.addHeader("Authorization", authorization);
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }
}
