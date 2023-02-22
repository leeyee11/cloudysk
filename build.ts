import { copy } from 'esbuild-plugin-copy';
import { build } from 'esbuild';

(async () => 
  await build({
    entryPoints: ['index.ts'],
    bundle: true,
    platform: 'node',
    outdir: 'dist',
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: [
          {
            from: ['./node_modules/realm/build/**/*'],
            to: ['./build'],
          },
        ],
      }),
    ],
  })
)();