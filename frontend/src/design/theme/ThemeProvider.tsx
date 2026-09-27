import { createContext, useContext, type ReactNode } from 'react';

import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import type { Theme } from './types';

// UI-FOUNDATION-FOLDER-STRUCTURE.md 110.1장: Active Run의 dark context는 OS dark mode와 같은 개념이 아니다.
// 그래서 scheme은 OS 설정이 아니라 화면 컨텍스트가 정한다. 하위 트리에서 다시 감싸 context를 바꿀 수 있다.
const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ scheme, children }: { scheme: Theme['scheme']; children: ReactNode }) {
  return (
    <ThemeContext.Provider value={scheme === 'dark' ? darkTheme : lightTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
