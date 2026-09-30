package com.dallimo.dallimoserver.user.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.storage.ImageStorage;
import com.dallimo.dallimoserver.user.domain.User;
import com.dallimo.dallimoserver.user.infrastructure.UserJpaRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Locale;
import java.util.Optional;

@Service
public class UserService {

    private final UserJpaRepository users;
    private final Clock clock;
    private final ImageStorage storage;

    public UserService(UserJpaRepository users, Clock clock, ImageStorage storage) {
        this.users = users;
        this.clock = clock;
        this.storage = storage;
    }

    /** 이메일은 앞뒤 공백을 빼고 소문자로 저장 · 비교한다 */
    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public User createEmailUser(String email, String passwordHash, String nickname) {
        String e = normalizeEmail(email);
        String n = nickname.trim();
        if (users.existsByProviderAndProviderUserId(User.PROVIDER_EMAIL, e)) throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS);
        if (users.existsByNickname(n)) throw new ApiException(ErrorCode.NICKNAME_ALREADY_EXISTS);
        String code;
        do {
            code = FriendCodes.next();
        } while (users.existsByFriendCode(code));
        try {
            return users.saveAndFlush(User.emailUser(e, passwordHash, n, code, clock.instant()));
        } catch (DataIntegrityViolationException race) {
            // 동시에 같은 이메일 · 닉네임으로 가입한 경우 (UNIQUE 제약)
            if (users.existsByProviderAndProviderUserId(User.PROVIDER_EMAIL, e)) throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS);
            throw new ApiException(ErrorCode.NICKNAME_ALREADY_EXISTS);
        }
    }

    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return users.findByProviderAndProviderUserId(User.PROVIDER_EMAIL, normalizeEmail(email));
    }

    /** 닉네임을 쓸 수 있는지 (가입 · 변경 전 미리 확인). 본인 닉네임은 쓸 수 있다 */
    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname, Long exceptUserId) {
        String n = nickname.trim();
        return users.findByNickname(n).map(u -> u.getId().equals(exceptUserId)).orElse(true);
    }

    @Transactional
    public User changeNickname(long userId, String nickname) {
        User user = get(userId);
        String n = nickname.trim();
        if (n.equals(user.getNickname())) return user;
        if (!isNicknameAvailable(n, userId)) throw new ApiException(ErrorCode.NICKNAME_ALREADY_EXISTS);
        user.changeNickname(n, clock.instant());
        try {
            return users.saveAndFlush(user);
        } catch (DataIntegrityViolationException race) {
            throw new ApiException(ErrorCode.NICKNAME_ALREADY_EXISTS);
        }
    }

    @Transactional
    public void withdraw(long userId) {
        User user = get(userId);
        // 탈퇴하면 프로필 사진 파일도 지운다 (커밋 뒤)
        String image = user.getProfileImageUrl();
        if (image != null) ProfileService.afterCompletion(committed -> {
            if (committed) storage.deleteByUrl(image);
        });
        user.withdraw(clock.instant());
        users.saveAndFlush(user);
    }

    @Transactional(readOnly = true)
    public User get(long userId) {
        return users.findById(userId).filter(User::isActive).orElseThrow(() -> new ApiException(ErrorCode.AUTH_REQUIRED));
    }
}
