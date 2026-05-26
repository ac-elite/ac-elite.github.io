import path from 'path';
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// ----------------------------------------------------------------------

const PORT = 3039;

// In a git worktree the source lives under `.claude/worktrees/<name>` while
// deps resolve from the main checkout's `node_modules` above it — outside Vite's
// default fs allow-list, which silently blocks @fontsource fonts (Inter) so text
// falls back to a system font. Detect a worktree by its path and widen the
// allow-list to the main project root. The normal checkout is unaffected.
const inWorktree = process.cwd().split(path.sep).includes('worktrees');

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ['error'] },
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^src(.+)/,
        replacement: path.resolve(process.cwd(), 'src/$1'),
      },
    ],
  },
  server: {
    port: PORT,
    host: true,
    ...(inWorktree ? { fs: { allow: [path.resolve(process.cwd(), '../../..')] } } : {}),
  },
  preview: { port: PORT, host: true },
});
