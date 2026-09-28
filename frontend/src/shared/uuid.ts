// 멱등 키(clientRunUuid, batchUuid)용 UUID v4 (7.4장 재시도 가능한 요청은 idempotency 보장).
// 기기에 crypto.randomUUID가 있으면 그것을 쓴다.
export function createUuid(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
