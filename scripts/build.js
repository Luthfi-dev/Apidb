#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Enforce single-thread execution for Rayon & libuv to avoid cPanel / CloudLinux thread limit errors
// (EAGAIN / Os code 11: "Resource temporarily unavailable")
const buildEnv = {
  ...process.env,
  RAYON_NUM_THREADS: process.env.RAYON_NUM_THREADS || '1',
  UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || '1',
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=2048`.trim()
};

const args = process.argv.slice(2);
const clientOnly = args.includes('--client-only');
const serverOnly = args.includes('--server-only');

console.log('----------------------------------------------------');
console.log('[DataForge Build] Memulai proses build produksi untuk hosting...');
console.log(`[DataForge Build] Thread limits: RAYON_NUM_THREADS=${buildEnv.RAYON_NUM_THREADS}, UV_THREADPOOL_SIZE=${buildEnv.UV_THREADPOOL_SIZE}`);
console.log('----------------------------------------------------');

// 1. Build Client with Vite
if (!serverOnly) {
  console.log('[1/2] Menjalankan Vite Build untuk Frontend (dist/)...');
  const viteBin = path.resolve(rootDir, 'node_modules', '.bin', 'vite');
  const viteCmd = process.platform === 'win32' ? `${viteBin}.cmd` : viteBin;

  const viteResult = spawnSync(viteCmd, ['build'], {
    stdio: 'inherit',
    env: buildEnv,
    cwd: rootDir,
    shell: true
  });

  if (viteResult.status !== 0) {
    console.error('\n✗ [Build Error] Vite build gagal dengan status exit code:', viteResult.status);
    console.error('Tips cPanel: Pastikan memori cukup atau jalankan: RAYON_NUM_THREADS=1 npm run build');
    process.exit(viteResult.status || 1);
  }
  console.log('✓ [1/2] Frontend (dist/) berhasil dibuat!\n');
}

// 2. Build Server with esbuild
if (!clientOnly) {
  console.log('[2/2] Mengompilasi server.ts menjadi server.js dengan esbuild...');
  const serverResult = spawnSync('node', [path.resolve(rootDir, 'scripts/build-server.js')], {
    stdio: 'inherit',
    env: buildEnv,
    cwd: rootDir,
    shell: true
  });

  if (serverResult.status !== 0) {
    console.error('\n✗ [Build Error] Kompilasi server gagal dengan status exit code:', serverResult.status);
    process.exit(serverResult.status || 1);
  }
}

console.log('----------------------------------------------------');
console.log('✓ [Build Sukses] Seluruh aplikasi siap dijalankan di cPanel/Hosting!');
console.log('File startup di cPanel: server.js');
console.log('----------------------------------------------------');
