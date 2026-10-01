package com.dallimo.dallimoserver.user;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 명세 41장 PATCH /users/me: 닉네임만 바꾼다. 프로필 사진(올리기 · 빼기 · 파일 주기)은 뺐다 (결정 로그 60항).
 * MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
@SuppressWarnings("unchecked")
abstract class ProfileApiContractTest {

    @Autowired
    MockMvcTester mvc;

    record User(String token, long id, String nickname) {
    }

    @Test
    void changeNicknameOnly() {
        User me = signup(), other = signup();
        String nick = "새닉" + UUID.randomUUID().toString().substring(0, 6);

        MvcTestResult r = mvc.patch().uri("/api/v1/users/me").header("Authorization", "Bearer " + me.token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"  %s  \"}".formatted(nick)).exchange();
        assertThat(r).hasStatusOk();
        assertThat((String) JsonPath.read(body(r), "$.data.nickname")).isEqualTo(nick);
        // 응답에 사진 주소가 없다
        assertThat((Map<String, Object>) JsonPath.read(body(r), "$.data")).doesNotContainKey("profileImageUrl");
        assertThat((Map<String, Object>) JsonPath.read(body(get(me, "/api/v1/users/me")), "$.data")).doesNotContainKey("profileImageUrl");
        assertThat((Map<String, Object>) JsonPath.read(body(get(other, "/api/v1/users/" + me.id)), "$.data.user")).doesNotContainKey("profileImageUrl");

        // 다른 사람이 쓰는 닉네임 · 빈 닉네임
        assertThat(mvc.patch().uri("/api/v1/users/me").header("Authorization", "Bearer " + other.token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"%s\"}".formatted(nick)).exchange()).hasStatus(409);
        assertThat(mvc.patch().uri("/api/v1/users/me").header("Authorization", "Bearer " + other.token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"  \"}").exchange()).hasStatus(400);
    }

    @Test
    void photoUploadIsGone() {
        User me = signup();
        // 사진을 multipart로 보내도 받지 않는다
        var multipart = MockMvcRequestBuilders.multipart(HttpMethod.PATCH, "/api/v1/users/me")
                .file(new MockMultipartFile("profileImage", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3}))
                .header("Authorization", "Bearer " + me.token);
        assertThat(mvc.perform(multipart).getResponse().getStatus()).isEqualTo(415);
        // 사진 빼기 · 파일 경로도 없다
        assertThat(mvc.delete().uri("/api/v1/users/me/profile-image").header("Authorization", "Bearer " + me.token).exchange()
                .getResponse().getStatus()).isIn(404, 405);
        assertThat(mvc.get().uri("/files/profile/1/x.jpg").exchange().getResponse().getStatus()).isIn(401, 404);
    }

    /** 온보딩 러너 정보 (FOUNDATION-DECISION-LOG 64항): 처음엔 모두 null, 통째로 바꾸고, 모르는 값은 400 */
    @Test
    void runnerProfile() {
        User me = signup();
        String fresh = body(get(me, "/api/v1/users/me"));
        assertThat((Map<String, Object>) JsonPath.read(fresh, "$.data.runnerProfile"))
                .containsEntry("distance", null).containsEntry("experience", null).containsEntry("preferredTime", null);

        MvcTestResult put = mvc.put().uri("/api/v1/users/me/runner-profile").header("Authorization", "Bearer " + me.token)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"distance":"K3_TO_5","experience":"BEGINNER","preferredTime":"EVENING"}""").exchange();
        assertThat(put).hasStatusOk();
        assertThat((String) JsonPath.read(body(put), "$.data.distance")).isEqualTo("K3_TO_5");
        String after = body(get(me, "/api/v1/users/me"));
        assertThat((String) JsonPath.read(after, "$.data.runnerProfile.experience")).isEqualTo("BEGINNER");
        assertThat((String) JsonPath.read(after, "$.data.runnerProfile.preferredTime")).isEqualTo("EVENING");

        // 하나만 고르면 나머지는 지워진다 (통째로 바꾼다)
        assertThat(mvc.put().uri("/api/v1/users/me/runner-profile").header("Authorization", "Bearer " + me.token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"distance\":\"OVER_10K\"}").exchange()).hasStatusOk();
        assertThat((Map<String, Object>) JsonPath.read(body(get(me, "/api/v1/users/me")), "$.data.runnerProfile"))
                .containsEntry("distance", "OVER_10K").containsEntry("experience", null);

        // 모르는 값 · 로그인 없이
        assertThat(mvc.put().uri("/api/v1/users/me/runner-profile").header("Authorization", "Bearer " + me.token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"distance\":\"MARATHON\"}").exchange()).hasStatus(400);
        assertThat(mvc.put().uri("/api/v1/users/me/runner-profile")
                .contentType(MediaType.APPLICATION_JSON).content("{}").exchange()).hasStatus(401);
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String nick = "프로필" + id;
        MvcTestResult r = mvc.post().uri("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"profile-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(id, nick)).exchange();
        assertThat(r).hasStatus(201);
        String b = body(r);
        assertThat((Map<String, Object>) JsonPath.read(b, "$.data.user")).doesNotContainKey("profileImageUrl");
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
