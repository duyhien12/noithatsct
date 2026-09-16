import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import path from 'path';

/**
 * Dự án dùng JSX ngay trong file .js (quy ước sẵn có của repo).
 * Vite mặc định không parse JSX trong .js nên plugin này chuyển
 * riêng các file .js có chứa JSX, giữ nguyên xử lý mặc định cho .ts/.tsx.
 */
const jsxInJs = {
    name: 'homeerp-jsx-in-js',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
        const file = id.split('?')[0];
        if (!file.endsWith('.js') || file.includes('node_modules')) return null;
        if (!/<[A-Za-z/]/.test(code)) return null;
        return transformWithEsbuild(code, file, { loader: 'jsx', jsx: 'automatic' });
    },
};

export default defineConfig({
    plugins: [jsxInJs],
    // React 19 dùng JSX runtime tự động — không cần import React trong mỗi file.
    esbuild: { jsx: 'automatic' },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./__tests__/setup.ts'],
        include: ['__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
