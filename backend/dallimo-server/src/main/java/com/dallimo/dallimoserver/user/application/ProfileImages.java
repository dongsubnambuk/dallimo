package com.dallimo.dallimoserver.user.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

/**
 * 프로필 사진 (AUTH-002 · SCR-M07). 받은 사진을 그대로 두지 않고 다시 만든다:
 * 가운데를 정사각형으로 잘라 512px JPEG로. EXIF(촬영 위치 GPS 포함)는 남지 않고, 휴대폰 사진의 회전 정보는 반영한다.
 * 범위 값은 명세에 없어 정한 값 (backend/README 결정 사항).
 */
public final class ProfileImages {

    public static final int MAX_BYTES = 5 * 1024 * 1024;
    public static final int SIZE = 512;
    // 이보다 큰 사진은 풀기 전에 막는다 (메모리)
    public static final int MAX_SIDE = 8_000;
    private static final float QUALITY = 0.85f;

    private ProfileImages() {
    }

    /** 올린 사진 → 정사각형 JPEG. 틀리면 VALIDATION_ERROR */
    public static byte[] toAvatar(byte[] input) {
        if (input == null || input.length == 0) throw invalid("사진이 비어 있어요.");
        if (input.length > MAX_BYTES) throw invalid("사진은 5MB까지 올릴 수 있어요.");
        boolean jpeg = isJpeg(input);
        if (!jpeg && !isPng(input)) throw invalid("JPG · PNG 사진만 올릴 수 있어요.");
        BufferedImage source = read(input);
        int orientation = jpeg ? exifOrientation(input) : 1;

        int w = source.getWidth();
        int h = source.getHeight();
        int side = Math.min(w, h);
        BufferedImage square = source.getSubimage((w - side) / 2, (h - side) / 2, side, side);
        int out = Math.min(SIZE, side);
        BufferedImage dst = new BufferedImage(out, out, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = dst.createGraphics();
        try {
            // 투명한 PNG는 흰 바탕 위에
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, out, out);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(square, transform(orientation, side, out), null);
        } finally {
            g.dispose();
        }
        return writeJpeg(dst);
    }

    private static BufferedImage read(byte[] input) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) throw invalid("사진을 읽을 수 없어요.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                int w = reader.getWidth(0);
                int h = reader.getHeight(0);
                if (w < 1 || h < 1) throw invalid("사진을 읽을 수 없어요.");
                if (w > MAX_SIDE || h > MAX_SIDE) throw invalid("사진이 너무 커요. 가로 · 세로 %dpx까지 올릴 수 있어요.".formatted(MAX_SIDE));
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof ApiException api) throw api;
            throw invalid("사진을 읽을 수 없어요.");
        }
    }

    /** 가운데 기준으로 EXIF 방향을 반영하고 side → out 크기로 */
    static AffineTransform transform(int orientation, int side, int out) {
        AffineTransform at = new AffineTransform();
        at.translate(out / 2.0, out / 2.0);
        switch (orientation) {
            case 2 -> at.scale(-1, 1);
            case 3 -> at.rotate(Math.PI);
            case 4 -> at.scale(1, -1);
            case 5 -> at.concatenate(new AffineTransform(0, 1, 1, 0, 0, 0));
            case 6 -> at.rotate(Math.PI / 2);
            case 7 -> at.concatenate(new AffineTransform(0, -1, -1, 0, 0, 0));
            case 8 -> at.rotate(-Math.PI / 2);
            default -> {
            }
        }
        at.scale((double) out / side, (double) out / side);
        at.translate(-side / 2.0, -side / 2.0);
        return at;
    }

    private static byte[] writeJpeg(BufferedImage img) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ImageOutputStream out = ImageIO.createImageOutputStream(bytes)) {
            writer.setOutput(out);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(QUALITY);
            writer.write(null, new IIOImage(img, null, null), param);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }

    static boolean isJpeg(byte[] b) {
        return b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
    }

    static boolean isPng(byte[] b) {
        byte[] sig = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
        if (b.length < sig.length) return false;
        for (int i = 0; i < sig.length; i++) if (b[i] != sig[i]) return false;
        return true;
    }

    /** JPEG APP1(Exif)의 방향 값 (1~8). 없거나 읽을 수 없으면 1 */
    static int exifOrientation(byte[] b) {
        int i = 2;
        while (i + 4 <= b.length && (b[i] & 0xFF) == 0xFF) {
            int marker = b[i + 1] & 0xFF;
            int len = ((b[i + 2] & 0xFF) << 8) | (b[i + 3] & 0xFF);
            if (marker == 0xDA || len < 2) break;
            int end = Math.min(b.length, i + 2 + len);
            if (marker == 0xE1 && i + 10 <= end && "Exif".equals(new String(b, i + 4, 4, StandardCharsets.US_ASCII))) {
                return tiffOrientation(b, i + 10, end);
            }
            i += 2 + len;
        }
        return 1;
    }

    private static int tiffOrientation(byte[] b, int t, int end) {
        if (t + 8 > end) return 1;
        boolean le = b[t] == 'I';
        long offset = u32(b, t + 4, le);
        if (offset < 8 || offset > end - t) return 1;
        int ifd = t + (int) offset;
        if (ifd + 2 > end) return 1;
        int n = u16(b, ifd, le);
        for (int k = 0; k < n; k++) {
            int e = ifd + 2 + k * 12;
            if (e + 12 > end) break;
            if (u16(b, e, le) == 0x0112) {
                int v = u16(b, e + 8, le);
                return v >= 1 && v <= 8 ? v : 1;
            }
        }
        return 1;
    }

    private static int u16(byte[] b, int i, boolean le) {
        return le ? (b[i] & 0xFF) | ((b[i + 1] & 0xFF) << 8) : ((b[i] & 0xFF) << 8) | (b[i + 1] & 0xFF);
    }

    private static long u32(byte[] b, int i, boolean le) {
        return le
                ? (b[i] & 0xFFL) | ((b[i + 1] & 0xFFL) << 8) | ((b[i + 2] & 0xFFL) << 16) | ((b[i + 3] & 0xFFL) << 24)
                : ((b[i] & 0xFFL) << 24) | ((b[i + 1] & 0xFFL) << 16) | ((b[i + 2] & 0xFFL) << 8) | (b[i + 3] & 0xFFL);
    }

    private static ApiException invalid(String message) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, message);
    }
}
