import { Config } from '@remotion/cli/config';

// 인스타그램 릴스: 1080×1920, H.264, yuv420p
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);

// 브라우저를 직접 지정할 때 (예: Playwright의 chrome-headless-shell): REMOTION_BROWSER=/path/to/headless_shell
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
