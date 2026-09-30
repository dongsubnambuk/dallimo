package com.dallimo.dallimoserver.user;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 명세 41장 PATCH /users/me (nickname?, profileImage?) · 사진 빼기 · 파일 주기 · 탈퇴 때 정리.
 * MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
abstract class ProfileApiContractTest {

    @Autowired
    MockMvcTester mvc;

    record User(String token, long id, String nickname) {
    }

    @Test
    void uploadReplaceRemovePhoto() throws IOException {
        User me = signup(), other = signup();
        // 사진만 올리기 → 서버가 512px JPEG로 다시 만들어 주소를 준다
        MvcTestResult up = patch(me, null, ProfileImagesTest.image("jpg", 1600, 1200, Color.RED, Color.BLUE));
        assertThat(up).hasStatusOk();
        String url = JsonPath.read(body(up), "$.data.profileImageUrl");
        assertThat(url).startsWith("http://localhost/files/profile/" + me.id + "/").endsWith(".jpg");
        assertThat((String) JsonPath.read(body(up), "$.data.nickname")).isEqualTo(me.nickname);
        // 로그인 없이 받을 수 있다 (친구 · 랭킹에서 보인다), 오래 캐시
        MvcTestResult file = mvc.get().uri(path(url)).exchange();
        assertThat(file).hasStatusOk().hasContentType(MediaType.IMAGE_JPEG);
        assertThat(file.getResponse().getHeader("Cache-Control")).contains("max-age=31536000");
        BufferedImage img = ProfileImagesTest.decode(file.getResponse().getContentAsByteArray());
        assertThat(img.getWidth()).isEqualTo(512);
        assertThat(img.getHeight()).isEqualTo(512);
        // 내 정보 · 다른 사람이 보는 프로필에도
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/users/me")), "$.data.profileImageUrl")).isEqualTo(url);
        assertThat((String) JsonPath.read(body(get(other, "/api/v1/users/" + me.id)), "$.data.user.profileImageUrl")).isEqualTo(url);

        // 닉네임과 사진을 함께 바꾸면 둘 다, 옛 사진 파일은 지운다
        String nick = "새이름" + UUID.randomUUID().toString().substring(0, 6);
        MvcTestResult both = patch(me, nick, ProfileImagesTest.image("png", 300, 300, Color.GREEN, Color.GREEN));
        assertThat(both).hasStatusOk();
        String url2 = JsonPath.read(body(both), "$.data.profileImageUrl");
        assertThat(url2).isNotEqualTo(url);
        assertThat((String) JsonPath.read(body(both), "$.data.nickname")).isEqualTo(nick);
        assertThat(mvc.get().uri(path(url)).exchange()).hasStatus(404);
        assertThat(mvc.get().uri(path(url2)).exchange()).hasStatusOk();

        // 잘못된 사진이면 닉네임도 바뀌지 않는다
        MvcTestResult bad = patch(me, "바뀌면안됨" + UUID.randomUUID().toString().substring(0, 4), "GIF89a....".getBytes(StandardCharsets.US_ASCII));
        assertThat(bad).hasStatus(400);
        assertThat((String) JsonPath.read(body(bad), "$.error.code")).isEqualTo("VALIDATION_ERROR");
        assertThat((String) JsonPath.read(body(bad), "$.error.message")).contains("JPG · PNG");
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/users/me")), "$.data.nickname")).isEqualTo(nick);
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/users/me")), "$.data.profileImageUrl")).isEqualTo(url2);
        // 남의 닉네임이면 409, 사진도 그대로
        MvcTestResult taken = patch(me, other.nickname, ProfileImagesTest.image("jpg", 100, 100, Color.RED, Color.RED));
        assertThat(taken).hasStatus(409);
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/users/me")), "$.data.profileImageUrl")).isEqualTo(url2);

        // JSON 닉네임 바꾸기는 그대로 된다 (사진은 유지)
        MvcTestResult json = mvc.patch().uri("/api/v1/users/me").header("Authorization", "Bearer " + me.token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"%s\"}".formatted(nick + "x")).exchange();
        assertThat(json).hasStatusOk();
        assertThat((String) JsonPath.read(body(json), "$.data.profileImageUrl")).isEqualTo(url2);

        // 사진 빼기
        MvcTestResult removed = mvc.delete().uri("/api/v1/users/me/profile-image").header("Authorization", "Bearer " + me.token).exchange();
        assertThat(removed).hasStatusOk();
        assertThat((Object) JsonPath.read(body(removed), "$.data.profileImageUrl")).isNull();
        assertThat(mvc.get().uri(path(url2)).exchange()).hasStatus(404);
        // 없는 사진을 또 빼도 괜찮다
        assertThat(mvc.delete().uri("/api/v1/users/me/profile-image").header("Authorization", "Bearer " + me.token).exchange()).hasStatusOk();
    }

    @Test
    void guardsAccessAndPaths() throws IOException {
        User me = signup();
        // 로그인 필요
        MockMultipartHttpServletRequestBuilder anon = MockMvcRequestBuilders.multipart(HttpMethod.PATCH, "/api/v1/users/me")
                .file(new MockMultipartFile("profileImage", "a.jpg", "image/jpeg", ProfileImagesTest.image("jpg", 50, 50, Color.RED, Color.RED)));
        assertThat(mvc.perform(anon)).hasStatus(401);
        // 아무것도 없이 보내면 그대로
        MvcTestResult none = patch(me, null, null);
        assertThat(none).hasStatusOk();
        assertThat((Object) JsonPath.read(body(none), "$.data.profileImageUrl")).isNull();
        // 폴더 밖(보안 필터가 먼저 400) · 없는 파일 · 이상한 이름은 받을 수 없다
        assertThat(mvc.get().uri("/files/profile/../../etc/passwd.jpg").exchange().getResponse().getStatus()).isIn(400, 404);
        assertThat(mvc.get().uri("/files/profile/%2e%2e/%2e%2e/etc/passwd.jpg").exchange().getResponse().getStatus()).isIn(400, 404);
        assertThat(mvc.get().uri("/files/profile/1/nope.jpg").exchange()).hasStatus(404);
        assertThat(mvc.get().uri("/files/profile/1/x.exe").exchange()).hasStatus(404);
    }

    @Test
    void withdrawRemovesPhoto() throws IOException {
        User me = signup();
        String url = JsonPath.read(body(patch(me, null, ProfileImagesTest.image("jpg", 80, 80, Color.RED, Color.RED))), "$.data.profileImageUrl");
        assertThat(mvc.get().uri(path(url)).exchange()).hasStatusOk();
        assertThat(mvc.delete().uri("/api/v1/users/me").header("Authorization", "Bearer " + me.token).exchange()).hasStatus(204);
        assertThat(mvc.get().uri(path(url)).exchange()).hasStatus(404);
    }

    // ── 도우미 ──

    private MvcTestResult patch(User user, String nickname, byte[] image) {
        MockMultipartHttpServletRequestBuilder req = MockMvcRequestBuilders.multipart(HttpMethod.PATCH, "/api/v1/users/me");
        if (image != null) req.file(new MockMultipartFile("profileImage", "photo.jpg", "image/jpeg", image));
        if (nickname != null) req.param("nickname", nickname);
        req.header("Authorization", "Bearer " + user.token);
        return mvc.perform(req);
    }

    private static String path(String url) {
        return url.substring("http://localhost".length());
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String nick = "사진" + id;
        MvcTestResult r = mvc.post().uri("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"profile-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(id, nick)).exchange();
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), nick);
    }

    private MvcTestResult get(User user, String uri) {
        return mvc.get().uri(uri).header("Authorization", "Bearer " + user.token).exchange();
    }

    private static String body(MvcTestResult r) {
        try {
            return r.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
