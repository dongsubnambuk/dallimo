package com.dallimo.dallimoserver.auth.application;

import com.dallimo.dallimoserver.common.mail.MailSender.Mail;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** 비밀번호 메일 내용. 받는 사람이 요청하지 않았을 때 무엇을 하면 되는지 함께 적는다 */
final class PasswordMails {

    private static final DateTimeFormatter KST = DateTimeFormatter.ofPattern("yyyy년 M월 d일 HH:mm").withZone(ZoneId.of("Asia/Seoul"));

    private PasswordMails() {
    }

    static Mail resetCode(String to, String code, long ttlMinutes) {
        String text = """
                달리모 비밀번호 재설정 인증 코드예요.

                %s

                %d분 안에 앱에 입력해 주세요.
                요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.""".formatted(code, ttlMinutes);
        String html = """
                <div style="font-family:sans-serif;line-height:1.6;color:#111">
                <p>달리모 비밀번호 재설정 인증 코드예요.</p>
                <p style="font-size:28px;font-weight:700;letter-spacing:6px">%s</p>
                <p>%d분 안에 앱에 입력해 주세요.</p>
                <p style="color:#666">요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.</p>
                </div>""".formatted(code, ttlMinutes);
        return new Mail(to, "[달리모] 비밀번호 재설정 인증 코드", text, html);
    }

    static Mail changed(String to, Instant at) {
        String when = KST.format(at);
        String text = """
                달리모 계정 비밀번호가 %s(한국 시간)에 바뀌었어요.
                직접 바꾼 게 아니라면 앱 로그인 화면의 "비밀번호를 잊었어요"에서 바로 다시 바꿔 주세요.""".formatted(when);
        String html = """
                <div style="font-family:sans-serif;line-height:1.6;color:#111">
                <p>달리모 계정 비밀번호가 %s(한국 시간)에 바뀌었어요.</p>
                <p style="color:#666">직접 바꾼 게 아니라면 앱 로그인 화면의 "비밀번호를 잊었어요"에서 바로 다시 바꿔 주세요.</p>
                </div>""".formatted(when);
        return new Mail(to, "[달리모] 비밀번호가 바뀌었어요", text, html);
    }
}
