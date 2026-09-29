#!/usr/bin/env node
import { build } from 'vite';
import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Set thread limits for cPanel / CloudLinux environments
process.env.RAYON_NUM_THREADS = process.env.RAYON_NUM_THREADS || '1';
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '1';

async function runBuild() {
  console.log('----------------------------------------------------');
  console.log('[DataForge Build] Memulai proses build produksi untuk hosting...');
  console.log(`[DataForge Build] Thread limits: RAYON_NUM_THREADS=${process.env.RAYON_NUM_THREADS}, UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE}`);
  console.log('----------------------------------------------------');

  const args = process.argv.slice(2);
  const clientOnly = args.includes('--client-only');
  const serverOnly = args.includes('--server-only');

  // 1. Build Client with Vite Programmatically (No spawnSync shell hanging)
  if (!serverOnly) {
    console.log('[1/2] Menjalankan Vite Build untuk Frontend (dist/)...');
    try {
      await build({
        root: rootDir,
        configFile: path.resolve(rootDir, 'vite.config.ts'),
        mode: 'production'
      });
      console.log('✓ [1/2] Frontend (dist/) berhasil dibuat!\n');
    } catch (err) {
      console.error('\n✗ [Build Error] Vite build gagal:', err);
      process.exit(1);
    }
  }

  // 2. Build Server with esbuild Programmatically
  if (!clientOnly) {
    console.log('[2/2] Mengompilasi server.ts menjadi server.js dengan esbuild...');
    try {
      await esbuild.build({
        entryPoints: [path.resolve(rootDir, 'server.ts')],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'esm',
        packages: 'external',
        outfile: path.resolve(rootDir, 'server.js'),
        banner: {
          js: `// Production Server Bundle - DataForge API Studio
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`,
        },
        logLevel: 'info',
      });
      console.log('✓ [2/2] server.js generated successfully!');
    } catch (err) {
      console.error('\n✗ [Build Error] Kompilasi server gagal:', err);
      process.exit(1);
    }
  }

  console.log('----------------------------------------------------');
  console.log('✓ [Build Sukses] Seluruh aplikasi siap dijalankan di cPanel/Hosting!');
  console.log('File startup di cPanel: server.js');
  console.log('----------------------------------------------------');
}

runBuild();
