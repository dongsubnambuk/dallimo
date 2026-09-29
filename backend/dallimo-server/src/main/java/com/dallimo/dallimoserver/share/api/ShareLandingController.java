package com.dallimo.dallimoserver.share.api;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.running.domain.RunMode;
import com.dallimo.dallimoserver.share.application.ShareProperties;
import com.dallimo.dallimoserver.share.application.ShareService;
import com.dallimo.dallimoserver.share.application.ShareService.Preview;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * 공유 링크를 눌렀을 때 여는 페이지 (14.3장 "앱 설치 시 Deep Link, 미설치 시 Web Landing"의 첫 단계).
 * 메신저는 dallimo:// 주소를 링크로 보여주지 않는 경우가 많아 공유 URL은 이 http(s) 페이지로 한다.
 * 휴대폰에서 열면 바로 앱(dallimo://share/{code})을 열고, 안 열리면 버튼으로 연다. 미리보기(og) 태그를 단다.
 * 앱 설치 안내 · 스토어 링크는 배포 뒤에 붙인다.
 */
@RestController
public class ShareLandingController {

    private static final Pattern CODE = Pattern.compile("[a-z0-9]{4,32}");
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("M월 d일 (E) a h:mm", Locale.KOREAN).withZone(ZoneId.of("Asia/Seoul"));

    private final ShareService shares;
    private final ShareProperties props;

    public ShareLandingController(ShareService shares, ShareProperties props) {
        this.shares = shares;
        this.props = props;
    }

    @GetMapping(value = "/s/{code}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> landing(@PathVariable String code) {
        if (!CODE.matcher(code).matches()) return page(HttpStatus.NOT_FOUND, notFound());
        try {
            ShareService.Resolved r = shares.resolve(code);
            String[] text = describe(r);
            return page(HttpStatus.OK, html(code, text[0], text[1]));
        } catch (ApiException e) {
            return page(HttpStatus.NOT_FOUND, notFound());
        }
    }

    /** [제목, 설명] */
    static String[] describe(ShareService.Resolved r) {
        Preview p = r.preview();
        return switch (r.type()) {
            case RUN -> {
                String what = p.courseName() != null ? p.courseName() : p.runMode() == RunMode.FREE ? "자유 달리기" : "달리기";
                String time = duration(p.recordSeconds() != null ? p.recordSeconds() : p.elapsedSeconds());
                yield new String[]{p.sharerName() + "님의 달리기 기록", what + " · " + km(p.distanceM()) + "km · " + time};
            }
            case COURSE -> new String[]{p.courseName() != null ? p.courseName() : "달리모 코스",
                    (p.distanceM() != null ? km(p.distanceM()) + "km 코스 · " : "") + "달리모에서 이 코스 같이 달려요"};
            case LIVE_ROOM -> {
                String goal = p.targetDistanceM() != null ? km(p.targetDistanceM()) + "km" : duration(p.targetSeconds());
                String mode = switch (p.liveMode()) {
                    case "LIVE_RACE" -> "레이스";
                    case "TIME_ATTACK" -> "타임 어택";
                    default -> "함께 달리기";
                };
                String when = p.scheduledAt() == null ? "모두 준비되면 출발" : WHEN.format(p.scheduledAt()) + " 출발";
                yield new String[]{p.sharerName() + "님이 함께 달리기에 초대했어요", goal + " " + mode + " · " + when};
            }
            case CHALLENGE -> {
                String course = p.courseName() != null ? p.courseName() : "코스";
                String target = duration(p.challengeTargetSec());
                yield switch (p.challengeStatus()) {
                    case "SUCCESS" -> new String[]{p.challengerName() + "님이 " + p.challengedName() + "님의 기록을 넘었어요",
                            course + " · " + duration(p.recordSeconds()) + " (목표 " + target + ")"};
                    case "FAILED" -> new String[]{p.challengedName() + "님이 도전을 막아냈어요",
                            course + " · 목표 " + target + (p.recordSeconds() != null ? " · 도전 기록 " + duration(p.recordSeconds()) : "")};
                    default -> new String[]{p.challengerName() + "님이 " + p.challengedName() + "님의 기록에 도전해요", course + " · 목표 " + target};
                };
            }
        };
    }

    private String html(String code, String title, String description) {
        String t = HtmlUtils.htmlEscape(title, "UTF-8");
        String d = HtmlUtils.htmlEscape(description, "UTF-8");
        String app = "dallimo://share/" + code;
        String web = props.webAppUrl() == null || props.webAppUrl().isBlank() ? null : props.webAppUrl().replaceAll("/+$", "") + "/share/" + code;
        return """
                <!doctype html>
                <html lang="ko"><head>
                <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,">
                <title>%1$s · 달리모</title>
                <meta property="og:site_name" content="달리모"><meta property="og:title" content="%1$s"><meta property="og:description" content="%2$s">
                <style>
                  :root{color-scheme:light dark}
                  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",sans-serif;background:#0B0B0C;color:#F4F5F4;display:flex;min-height:100vh;align-items:center;justify-content:center}
                  main{max-width:420px;padding:32px 20px;text-align:left}
                  .brand{font-weight:900;font-size:15px;letter-spacing:.02em;color:#2EF2C5;margin:0 0 24px}
                  h1{font-size:24px;line-height:1.35;margin:0 0 8px}
                  p{font-size:16px;line-height:1.5;color:#B8BCBA;margin:0 0 28px}
                  a.btn{display:block;text-align:center;padding:16px;border-radius:14px;background:#2EF2C5;color:#0B0B0C;font-weight:800;text-decoration:none;font-size:17px}
                  a.sub{display:block;text-align:center;margin-top:16px;color:#B8BCBA;font-size:14px}
                </style></head>
                <body><main>
                <div class="brand">DALLIMO 달리모</div>
                <h1>%1$s</h1><p>%2$s</p>
                <a class="btn" href="%3$s">달리모 앱에서 열기</a>
                %4$s
                </main>
                <script>if(/iPhone|iPad|Android/i.test(navigator.userAgent)){location.href=%5$s}</script>
                </body></html>
                """.formatted(t, d, app, web == null ? "" : "<a class=\"sub\" href=\"" + HtmlUtils.htmlEscape(web, "UTF-8") + "\">웹에서 열기 (개발용)</a>",
                "\"" + app + "\"");
    }

    private static String notFound() {
        return """
                <!doctype html>
                <html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>달리모</title>
                <style>body{margin:0;font-family:-apple-system,sans-serif;background:#0B0B0C;color:#F4F5F4;display:flex;min-height:100vh;align-items:center;justify-content:center}main{padding:32px 20px;max-width:420px}p{color:#B8BCBA}</style>
                </head><body><main><h1>공유 링크를 열 수 없어요</h1><p>링크가 만료됐거나 잘못된 주소예요.</p></main></body></html>
                """;
    }

    private static ResponseEntity<String> page(HttpStatus status, String html) {
        return ResponseEntity.status(status).contentType(new MediaType(MediaType.TEXT_HTML, java.nio.charset.StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noStore()).body(html);
    }

    private static String km(Integer m) {
        if (m == null) return "-";
        // 0.9 · 5 · 5.25처럼 뒤쪽 0을 뺀다
        return java.math.BigDecimal.valueOf(m).movePointLeft(3).setScale(2, java.math.RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static String duration(Integer sec) {
        if (sec == null) return "-";
        int h = sec / 3600, m = sec % 3600 / 60, s = sec % 60;
        if (h > 0) return h + ":" + String.format("%02d:%02d", m, s);
        return m + ":" + String.format("%02d", s);
    }
}
