package com.dallimo.dallimoserver.auth;

import com.dallimo.dallimoserver.common.mail.MailSender;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 비밀번호 변경 · 재설정 (결정 로그 58항, 이메일 인증 메일은 Resend). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 메일은 보내지 않고 받은 편지함처럼 모아 둔다.
 */
@Import(PasswordApiContractTest.Inbox.class)
abstract class PasswordApiContractTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class Inbox {
        static final List<MailSender.Mail> MAILS = new CopyOnWriteArrayList<>();

        @Bean
        @Primary
        MailSender inbox() {
            return MAILS::add;
        }
    }

    static final Pattern CODE = Pattern.compile("(\\d{6})");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    record Login(String access, String refresh) {
    }

    @Test
    void changePasswordKeepsThisDeviceAndLogsOutOthers() throws InterruptedException {
        String email = email();
        Login phone = signup(email, "run12345", "phone");
        Login tablet = login(email, "run12345", "tablet");

        assertThat(change(phone.access, "wrong999", "newpass77")).hasStatus(400).bodyText().contains("PASSWORD_MISMATCH");
        assertThat(change(phone.access, "run12345", "run12345")).hasStatus(400).bodyText().contains("VALIDATION_ERROR");
        assertThat(change(phone.access, "run12345", "short")).hasStatus(400);
        assertThat(change(null, "run12345", "newpass77")).hasStatus(401);
        assertThat(change(phone.access, "run12345", "newpass77")).hasStatus(204);

        // 이 기기는 계속, 다른 기기는 로그아웃
        assertThat(mvc.get().uri("/api/v1/users/me").header("Authorization", "Bearer " + phone.access).exchange()).hasStatusOk();
        assertThat(mvc.get().uri("/api/v1/users/me").header("Authorization", "Bearer " + tablet.access).exchange()).hasStatus(401);
        assertThat(post("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\",\"deviceId\":\"tablet\"}".formatted(tablet.refresh))).hasStatus(401);
        assertThat(post("/api/v1/auth/login", loginBody(email, "run12345", "x"))).hasStatus(401);
        assertThat(post("/api/v1/auth/login", loginBody(email, "newpass77", "x"))).hasStatusOk();
        // 바뀌었다는 메일
        assertThat(waitMail(email, "비밀번호가 바뀌었어요").text()).contains("비밀번호를 잊었어요");
    }

    @Test
    void resetWithEmailCode() throws InterruptedException {
        String email = email();
        Login phone = signup(email, "run12345", "phone");

        // 가입하지 않은 이메일도 같은 응답, 메일은 없다
        String nobody = email();
        assertThat(post("/api/v1/auth/password/reset-code", "{\"email\":\"%s\"}".formatted(nobody))).hasStatus(202);
        assertThat(post("/api/v1/auth/password/reset-code", "{\"email\":\"%s\"}".formatted(email))).hasStatus(202);
        String code = code(waitMail(email, "인증 코드"));
        // 곧바로 다시 요청해도 202이지만 새 코드는 보내지 않는다
        assertThat(post("/api/v1/auth/password/reset-code", "{\"email\":\"%s\"}".formatted(email))).hasStatus(202);
        Thread.sleep(500);
        assertThat(mails(email, "인증 코드")).hasSize(1);
        assertThat(mails(nobody, "")).isEmpty();

        // 틀린 코드 4번까지는 아직 쓸 수 있다
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 4; i++) assertThat(reset(email, wrong, "fresh123")).hasStatus(400).bodyText().contains("RESET_CODE_INVALID");
        assertThat(reset(email, "12ab", "fresh123")).hasStatus(400);
        assertThat(reset(nobody, code, "fresh123")).hasStatus(400).bodyText().contains("RESET_CODE_INVALID");
        assertThat(reset(email, code, "weak")).hasStatus(400);
        assertThat(reset(email, code, "fresh123")).hasStatus(204);

        // 모든 기기 로그아웃, 새 비밀번호로 로그인, 같은 코드는 다시 못 쓴다
        assertThat(mvc.get().uri("/api/v1/users/me").header("Authorization", "Bearer " + phone.access).exchange()).hasStatus(401);
        assertThat(post("/api/v1/auth/login", loginBody(email, "fresh123", "phone"))).hasStatusOk();
        assertThat(reset(email, code, "again1234")).hasStatus(400);
        assertThat(waitMail(email, "비밀번호가 바뀌었어요")).isNotNull();
        // 코드는 해시로만 남는다
        assertThat(jdbc.queryForList("SELECT code_hash FROM tbl_password_reset WHERE code_hash = ?", String.class, code)).isEmpty();
    }

    @Test
    void codeLocksAfterFiveWrongAndExpires() throws InterruptedException {
        String locked = email();
        signup(locked, "run12345", "d");
        assertThat(post("/api/v1/auth/password/reset-code", "{\"email\":\"%s\"}".formatted(locked))).hasStatus(202);
        String code = code(waitMail(locked, "인증 코드"));
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 5; i++) assertThat(reset(locked, wrong, "fresh123")).hasStatus(400);
        // 5번 틀리면 맞는 코드도 막힌다
        assertThat(reset(locked, code, "fresh123")).hasStatus(400);

        String expired = email();
        signup(expired, "run12345", "d");
        assertThat(post("/api/v1/auth/password/reset-code", "{\"email\":\"%s\"}".formatted(expired))).hasStatus(202);
        String code2 = code(waitMail(expired, "인증 코드"));
        jdbc.update("UPDATE tbl_password_reset r JOIN tbl_user u ON u.id = r.user_id SET r.expires_at = '2020-01-01 00:00:00' WHERE u.provider_user_id = ?",
                expired.toLowerCase());
        assertThat(reset(expired, code2, "fresh123")).hasStatus(400).bodyText().contains("RESET_CODE_INVALID");
        assertThat(post("/api/v1/auth/login", loginBody(expired, "run12345", "d"))).hasStatusOk();
    }

    // ── helpers ──

    private static String email() {
        return "pw-" + UUID.randomUUID().toString().substring(0, 8) + "@dallimo.test";
    }

    private List<MailSender.Mail> mails(String to, String subject) {
        return Inbox.MAILS.stream().filter(m -> m.to().equals(to) && m.subject().contains(subject)).toList();
    }

    private MailSender.Mail waitMail(String to, String subject) throws InterruptedException {
        for (int i = 0; i < 100; i++) {
            List<MailSender.Mail> found = mails(to, subject);
            if (!found.isEmpty()) return found.get(found.size() - 1);
            Thread.sleep(50);
        }
        throw new AssertionError("메일이 오지 않았어요: " + to + " " + subject);
    }

    private static String code(MailSender.Mail m) {
        Matcher x = CODE.matcher(m.text());
        assertThat(x.find()).isTrue();
        assertThat(m.html()).contains(x.group(1));
        return x.group(1);
    }

    private Login signup(String email, String password, String device) {
        String nick = "비번" + UUID.randomUUID().toString().substring(0, 6);
        MvcTestResult r = post("/api/v1/auth/signup", """
                {"email":"%s","password":"%s","nickname":"%s","deviceId":"%s"}""".formatted(email, password, nick, device));
        assertThat(r).hasStatus(201);
        return tokens(r);
    }

    private Login login(String email, String password, String device) {
        MvcTestResult r = post("/api/v1/auth/login", loginBody(email, password, device));
        assertThat(r).hasStatusOk();
        return tokens(r);
    }

    private static String loginBody(String email, String password, String device) {
        return "{\"email\":\"%s\",\"password\":\"%s\",\"deviceId\":\"%s\"}".formatted(email, password, device);
    }

    private static Login tokens(MvcTestResult r) {
        String b = new String(r.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        return new Login(JsonPath.read(b, "$.data.accessToken"), JsonPath.read(b, "$.data.refreshToken"));
    }

    private MvcTestResult change(String token, String current, String next) {
        var req = mvc.post().uri("/api/v1/auth/password/change").contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(current, next));
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
    }

    private MvcTestResult reset(String email, String code, String password) {
        return post("/api/v1/auth/password/reset", "{\"email\":\"%s\",\"code\":\"%s\",\"newPassword\":\"%s\"}".formatted(email, code, password));
    }

    private MvcTestResult post(String uri, String json) {
        return mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }
}
