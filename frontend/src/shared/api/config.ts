// 서버 주소. 비어 있으면 서버 없이 mock 저장소로 동작한다 (웹 확인 · GPS PoC 빌드).
// 예: 웹 http://localhost:8080, 아이폰 개발 빌드 http://<노트북 IP>:8080
export const API_BASE_URL: string | null = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || null;
