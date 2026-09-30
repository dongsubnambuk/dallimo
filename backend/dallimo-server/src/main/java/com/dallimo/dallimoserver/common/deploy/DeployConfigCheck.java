package com.dallimo.dallimoserver.common.deploy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 운영(prod) 서버가 뜰 때 빠진 선택 설정을 로그로 알려 준다. 없어도 서버는 뜨지만 기능 하나가 멈추는 값들이다.
 * 개발(dev)은 기본값으로 로그 발송을 쓰고 공유 주소 · App Link를 받지 않아서 보지 않는다.
 * 필수 값(DB · Redis · JWT_SECRET)은 없으면 서버가 시작하지 않으므로 여기서 보지 않는다. 목록은 backend README "배포 환경변수"
 */
@Component
public class DeployConfigCheck {

    private static final Logger log = LoggerFactory.getLogger(DeployConfigCheck.class);

    private final Environment env;

    public DeployConfigCheck(Environment env) {
        this.env = env;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void report() {
        if (!env.acceptsProfiles(Profiles.of("prod"))) return;
        List<String> missing = missing(env);
        if (missing.isEmpty()) {
            log.info("deploy.config ok");
            return;
        }
        log.warn("deploy.config missing={}\n- {}", missing.size(), String.join("\n- ", missing));
    }

    static List<String> missing(Environment env) {
        List<String> m = new ArrayList<>();
        if ("resend".equalsIgnoreCase(env.getProperty("dallimo.mail.provider", "resend"))) {
            if (blank(env, "dallimo.mail.resend-api-key")) m.add("RESEND_API_KEY: 비밀번호 재설정 코드 · 변경 알림 메일을 보내지 못해요");
            if (env.getProperty("dallimo.mail.from", "").contains("@resend.dev")) {
                m.add("MAIL_FROM: Resend 테스트 주소라 Resend 계정 본인에게만 메일이 가요. 인증한 도메인 주소로 바꿔 주세요");
            }
        }
        if (blank(env, "dallimo.share.public-base-url")) m.add("SHARE_PUBLIC_BASE_URL: 공유 링크를 요청이 들어온 주소로 만들어요");
        if (blank(env, "dallimo.storage.public-base-url")) m.add("STORAGE_PUBLIC_BASE_URL: 프로필 사진 주소를 요청이 들어온 주소로 만들어요");
        if (blank(env, "dallimo.share.app-links.ios-app-ids")) m.add("APP_LINK_IOS_APP_IDS: 아이폰에서 공유 링크를 눌러도 앱이 바로 열리지 않아요");
        if (blank(env, "dallimo.share.app-links.android-package") || blank(env, "dallimo.share.app-links.android-sha256")) {
            m.add("APP_LINK_ANDROID_PACKAGE · APP_LINK_ANDROID_SHA256: 안드로이드에서 공유 링크를 눌러도 앱이 바로 열리지 않아요");
        }
        if (blank(env, "dallimo.admin.api-key")) m.add("ADMIN_API_KEY: 관리 API(외부 코스 가져오기 · 신고 코스 검토)가 닫혀 있어요");
        if (blank(env, "dallimo.external-courses.durunubi.service-key")) m.add("DATA_GO_KR_SERVICE_KEY: 두루누비 코스를 가져오지 않아요");
        return m;
    }

    private static boolean blank(Environment env, String key) {
        String v = env.getProperty(key);
        return v == null || v.isBlank();
    }
}
