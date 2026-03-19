import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

//const esbuild = require('esbuild');
//const fs = require('fs');
//const path = require('path');

const copyHbsPlugin = {
  name: 'copy-hbs-recursive',
  setup(build) {
    build.onEnd(() => {
      const srcDir = path.resolve(import.meta.dirname, 'src/views');
      const distDir = path.resolve(import.meta.dirname, 'dist/views');

      const copyRecursive = (src, dest) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, {recursive: true});
        }

        const entries = fs.readdirSync(src, {withFileTypes: true});

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
          } else if (entry.isFile() && entry.name.endsWith('.hbs')) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };

      copyRecursive(srcDir, distDir);
    });
  }
};

const copyCssPlugin = {
  name: 'copy-css',
  setup(build) {
    build.onEnd(() => {
      const srcDir = path.resolve(import.meta.dirname, 'src/styles');
      const distDir = path.resolve(import.meta.dirname, 'dist/styles');

      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, {recursive: true});
      };

      const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.css'));
      for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
      }
    });
  }
};

const copyScriptsPlugin = {
  name: 'copy-scripts',
  setup(build) {
    build.onEnd(() => {
      const srcDir = path.resolve(import.meta.dirname, 'src/scripts');
      const distDir = path.resolve(import.meta.dirname, 'dist/scripts');

      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, {recursive: true});
      };

      const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.mjs'));
      for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
      }
    });
  }
};

esbuild.build({
  entryPoints: ['src/**/*.js'],
  platform: 'node',
  format: 'esm',
  bundle: false,
  outdir: 'dist',
  metafile: false,
  sourcemap: true,
  minify: false,
  plugins: [copyHbsPlugin, copyCssPlugin, copyScriptsPlugin],
});
