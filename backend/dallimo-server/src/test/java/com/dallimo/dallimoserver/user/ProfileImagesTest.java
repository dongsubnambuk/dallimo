package com.dallimo.dallimoserver.user;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.user.application.ProfileImages;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 프로필 사진 다시 만들기: 정사각형 512px JPEG, 휴대폰 회전 정보 반영, EXIF 없음, 잘못된 파일 거부 */
class ProfileImagesTest {

    @Test
    void cropsCenterSquareAndShrinksTo512() throws IOException {
        byte[] out = ProfileImages.toAvatar(image("jpg", 1200, 800, Color.RED, Color.BLUE));
        BufferedImage img = decode(out);
        assertThat(img.getWidth()).isEqualTo(512);
        assertThat(img.getHeight()).isEqualTo(512);
        // 가운데 800×800을 잘랐으니 왼쪽은 빨강(200~600), 오른쪽은 파랑
        assertThat(isRed(img.getRGB(100, 256))).isTrue();
        assertThat(isBlue(img.getRGB(400, 256))).isTrue();
    }

    @Test
    void keepsSmallImagesAndFlattensTransparentPng() throws IOException {
        BufferedImage src = new BufferedImage(120, 120, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(src, "png", png);
        BufferedImage img = decode(ProfileImages.toAvatar(png.toByteArray()));
        // 키우지 않는다, 투명은 흰 바탕
        assertThat(img.getWidth()).isEqualTo(120);
        assertThat(new Color(img.getRGB(60, 60)).getRed()).isGreaterThan(240);
    }

    @Test
    void appliesExifOrientationAndDropsMetadata() throws IOException {
        // 왼쪽 빨강 · 오른쪽 파랑으로 찍혔는데 EXIF가 "시계 방향 90도 돌려서 보라"(6)면 위가 빨강, 아래가 파랑
        byte[] jpeg = withExifOrientation(image("jpg", 200, 100, Color.RED, Color.BLUE), 6);
        byte[] out = ProfileImages.toAvatar(jpeg);
        BufferedImage img = decode(out);
        assertThat(isRed(img.getRGB(50, 10))).isTrue();
        assertThat(isBlue(img.getRGB(50, 90))).isTrue();
        // 다시 만든 사진에는 EXIF(촬영 위치 등)가 없다
        assertThat(new String(out, StandardCharsets.ISO_8859_1)).doesNotContain("Exif");
        // 방향 8(반시계 90도)이면 위가 파랑
        BufferedImage ccw = decode(ProfileImages.toAvatar(withExifOrientation(image("jpg", 200, 100, Color.RED, Color.BLUE), 8)));
        assertThat(isBlue(ccw.getRGB(50, 10))).isTrue();
    }

    @Test
    void rejectsWrongFiles() throws IOException {
        assertInvalid(new byte[0], "비어");
        assertInvalid("GIF89a....".getBytes(StandardCharsets.US_ASCII), "JPG · PNG");
        assertInvalid(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1, 2, 3, 4}, "읽을 수 없어요");
        assertInvalid(new byte[ProfileImages.MAX_BYTES + 1], "5MB");
        // 가로 9000px (풀기 전에 막는다)
        BufferedImage wide = new BufferedImage(9000, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(wide, "png", png);
        assertInvalid(png.toByteArray(), "너무 커요");
    }

    private static void assertInvalid(byte[] bytes, String message) {
        assertThatThrownBy(() -> ProfileImages.toAvatar(bytes)).isInstanceOf(ApiException.class).hasMessageContaining(message);
    }

    /** 왼쪽 반은 left, 오른쪽 반은 right 색 */
    static byte[] image(String format, int w, int h, Color left, Color right) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(left);
        g.fillRect(0, 0, w / 2, h);
        g.setColor(right);
        g.fillRect(w / 2, 0, w - w / 2, h);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    /** JPEG SOI 뒤에 방향 태그 하나짜리 APP1(Exif) + GPS 흉내 문자열을 넣는다 */
    static byte[] withExifOrientation(byte[] jpeg, int orientation) {
        byte[] tiff = {
                'I', 'I', 42, 0, 8, 0, 0, 0,  // 리틀 엔디언, IFD는 8바이트 뒤
                1, 0,                          // 항목 1개
                0x12, 0x01, 3, 0, 1, 0, 0, 0, (byte) orientation, 0, 0, 0, // 0x0112 SHORT 1개
                0, 0, 0, 0,                    // 다음 IFD 없음
                'G', 'P', 'S', '3', '5', '.', '8'};
        byte[] head = "Exif\0\0".getBytes(StandardCharsets.ISO_8859_1);
        int len = 2 + head.length + tiff.length;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg, 0, 2);
        out.write(0xFF);
        out.write(0xE1);
        out.write(len >> 8);
        out.write(len & 0xFF);
        out.writeBytes(head);
        out.writeBytes(tiff);
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }

    static BufferedImage decode(byte[] bytes) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(bytes));
    }

    private static boolean isRed(int rgb) {
        Color c = new Color(rgb);
        return c.getRed() > 180 && c.getBlue() < 80;
    }

    private static boolean isBlue(int rgb) {
        Color c = new Color(rgb);
        return c.getBlue() > 180 && c.getRed() < 80;
    }
}
