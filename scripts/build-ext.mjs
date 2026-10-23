import { build } from 'vite';
import fs from 'fs';
import path from 'path';

async function buildExtension() {
  const distExt = path.resolve('dist-ext');
  if (fs.existsSync(distExt)) {
    fs.rmSync(distExt, { recursive: true, force: true });
  }
  fs.mkdirSync(distExt, { recursive: true });

  console.log('Building Extension HTML pages (popup, options, warning)...');
  await build({
    configFile: false,
    root: path.resolve('.'),
    build: {
      outDir: distExt,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: path.resolve('popup.html'),
          options: path.resolve('options.html'),
          warning: path.resolve('warning.html')
        }
      }
    }
  });

  console.log('Building Background Service Worker (background.js)...');
  await build({
    configFile: false,
    build: {
      outDir: distExt,
      emptyOutDir: false,
      lib: {
        entry: path.resolve('src/extension/background.ts'),
        name: 'BackgroundWorker',
        formats: ['es'],
        fileName: () => 'background.js'
      }
    }
  });

  console.log('Building Content Script (content.js)...');
  await build({
    configFile: false,
    build: {
      outDir: distExt,
      emptyOutDir: false,
      lib: {
        entry: path.resolve('src/extension/content.ts'),
        name: 'ContentScript',
        formats: ['iife'],
        fileName: () => 'content.js'
      }
    }
  });

  // Copy manifest.json
  console.log('Copying manifest.json and icons to dist-ext...');
  fs.copyFileSync(
    path.resolve('src/extension/manifest.json'),
    path.join(distExt, 'manifest.json')
  );

  // Copy icons
  const iconsDist = path.join(distExt, 'icons');
  fs.mkdirSync(iconsDist, { recursive: true });
  const iconsSrc = path.resolve('public/icons');
  if (fs.existsSync(iconsSrc)) {
    for (const file of fs.readdirSync(iconsSrc)) {
      fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDist, file));
    }
  }

  console.log('Extension build completed successfully in dist-ext/. Ready to load unpacked in chrome://extensions.');
}

buildExtension().catch((err) => {
  console.error('Error building extension:', err);
  process.exit(1);
});
