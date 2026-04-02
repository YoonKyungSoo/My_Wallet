import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // 기존 코드베이스가 Effect 내부에서 setState를 자주 사용함 (UX/이벤트 동기화 패턴).
      // 빌드/런타임 오류가 아닌 성능 권고 성격이라, 운영 배포 전까지는 경고/오류로 막지 않음.
      'react-hooks/set-state-in-effect': 'off',
      // React Compiler 관련 규칙(프로젝트에서 컴파일러 사용/설정과 무관하게 에러를 유발할 수 있음)
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
])
