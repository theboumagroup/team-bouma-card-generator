import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/fonts', { recursive: true });
for (const font of ['caveat', 'homemade-apple', 'liu-jian-mao-cao']) {
  await copyFile(
    `node_modules/@fontsource/${font}/files/${font}-latin-400-normal.woff2`,
    `dist/fonts/${font}.woff2`
  );
}
await build({
  entryPoints: ['card/app.js'],
  bundle: true,
  outfile: 'dist/card.js',
  format: 'esm',
  target: 'es2022',
  legalComments: 'eof'
});
