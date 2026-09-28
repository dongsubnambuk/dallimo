import type { AuthProvider } from '@/entities/auth/types';

// provider SDK(Apple 로그인, Google 로그인, 카카오 로그인)에서 credential을 받아오는 경계.
// 어떤 provider를 처음부터 모두 넣을지는 오픈 이슈라(20.2장 "소셜 로그인 범위") SDK 연동 전까지 mock으로 둔다.
export class ProviderCancelledError extends Error {}

export async function getProviderCredential(provider: AuthProvider): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  return `mock-credential-${provider.toLowerCase()}`;
}
