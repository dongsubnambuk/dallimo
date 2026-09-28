import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// 파일을 임시 폴더에 써서 공유 시트로 보낸다 (메일 · 파일 앱 · 에어드롭)
export async function shareTextFile(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}
