import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildServer() {
  console.log('[Build] Building server.ts for production with esbuild...');
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
    console.log('✓ [Build] server.js generated successfully!');
  } catch (error) {
    console.error('✗ [Build Error] Failed to build server.ts:', error);
    process.exit(1);
  }
}

buildServer();
