import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Static HTML needs ordinary image/link elements, without a Next router or optimizer.
const directory = resolve('.local-vps-access');
await mkdir(directory, { recursive: true });
const outfile = resolve(directory, 'flow-review-bundle.mjs');
await build({
  entryPoints: ['scripts/generate-user-flow-review.tsx'], outfile, bundle: true,
  platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', tsconfig: 'tsconfig.json',
  plugins: [{ name: 'static-next-elements', setup(build) {
    build.onResolve({ filter: /^next\/(image|link)$/ }, ({ path }) => ({ path, namespace: 'review' }));
    build.onLoad({ filter: /.*/, namespace: 'review' }, ({ path }) => ({ contents: path === 'next/link'
      ? `import {createElement} from 'react'; export default function Link({href,children,...props}) {return createElement('a',{...props,href},children)}`
      : `import {createElement} from 'react'; export default function Image({fill,priority,unoptimized,fetchPriority,loader,quality,...props}) {return createElement('img',{...props,style:{...(fill?{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}:{}),...props.style}})}`,
      loader: 'js', resolveDir: process.cwd(),
    }));
  } }],
});
await import(pathToFileURL(outfile).href);
