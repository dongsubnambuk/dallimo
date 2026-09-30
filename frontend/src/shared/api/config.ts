// 서버 주소. 비어 있으면 서버 없이 mock 저장소로 동작한다 (웹 확인 · GPS PoC 빌드).
// 개발(npx expo start)은 .env.development, production 빌드는 eas.json의 배포 서버 https://dallimo.gamjabox.cloud (결정 로그 62항)
export const API_BASE_URL: string | null = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || null;
