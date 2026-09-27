// 받침 유무에 따라 조사를 고른다. 한글이 아닌 글자로 끝나면 받침 없는 형태를 쓴다.
function hasFinalConsonant(word: string): boolean {
  const code = word.trim().charCodeAt(word.trim().length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** "민수" → "민수와", "지훈" → "지훈과" */
export function withWaGwa(word: string): string {
  return word + (hasFinalConsonant(word) ? '과' : '와');
}
