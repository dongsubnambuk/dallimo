package com.dallimo.dallimoserver.user.application;

import com.dallimo.dallimoserver.common.storage.ImageStorage;
import com.dallimo.dallimoserver.user.domain.User;
import com.dallimo.dallimoserver.user.infrastructure.UserJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.util.UUID;

/**
 * 명세 41장 PATCH /users/me (nickname?, profileImage?). 사진은 다시 만든 뒤(ProfileImages) 저장소에 두고 주소를 남긴다.
 * 파일은 DB가 커밋된 뒤 정리한다: 성공하면 옛 사진을, 실패하면 새로 올린 사진을 지운다.
 */
@Service
public class ProfileService {

    private final UserService users;
    private final UserJpaRepository repo;
    private final ImageStorage storage;
    private final Clock clock;

    public ProfileService(UserService users, UserJpaRepository repo, ImageStorage storage, Clock clock) {
        this.users = users;
        this.repo = repo;
        this.storage = storage;
        this.clock = clock;
    }

    /**
     * 닉네임 · 사진을 한 번에 바꾼다 (둘 다 없으면 그대로). 사진을 먼저 확인해 틀리면 닉네임도 바꾸지 않는다.
     *
     * @param baseUrl 파일 주소 앞부분 (설정값이 없을 때 요청이 들어온 서버 주소)
     */
    @Transactional
    public User update(long userId, String nickname, byte[] image, String baseUrl) {
        byte[] avatar = image != null ? ProfileImages.toAvatar(image) : null;
        User user = nickname != null && !nickname.isBlank() ? users.changeNickname(userId, nickname) : users.get(userId);
        if (avatar == null) return user;
        String old = user.getProfileImageUrl();
        String url = storage.put("profile/" + userId + "/" + UUID.randomUUID() + ".jpg", avatar, "image/jpeg", baseUrl);
        afterCompletion(committed -> storage.deleteByUrl(committed ? old : url));
        user.changeProfileImage(url, clock.instant());
        return repo.saveAndFlush(user);
    }

    /** 사진 빼기 (닉네임 첫 글자로 돌아간다) */
    @Transactional
    public User removeImage(long userId) {
        User user = users.get(userId);
        String old = user.getProfileImageUrl();
        if (old == null) return user;
        afterCompletion(committed -> {
            if (committed) storage.deleteByUrl(old);
        });
        user.changeProfileImage(null, clock.instant());
        return repo.saveAndFlush(user);
    }

    interface Done {
        void run(boolean committed);
    }

    static void afterCompletion(Done done) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                done.run(status == STATUS_COMMITTED);
            }
        });
    }
}
