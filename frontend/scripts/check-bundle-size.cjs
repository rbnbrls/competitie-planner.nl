#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'assets');
const MAX_GZIP_SIZE = 500 * 1024; // 500KB

function getGzippedSize(buffer) {
  return zlib.gzipSync(buffer).length;
}

function formatBytes(bytes) {
  const kb = bytes / 1024;
  return `${bytes} bytes (${kb.toFixed(2)} KB)`;
}

function main() {
  const files = fs.readdirSync(DIST_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js'));

  if (jsFiles.length === 0) {
    console.error('No JS files found in dist/assets/');
    process.exit(1);
  }

  let totalGzipped = 0;
  const fileDetails = [];

  for (const file of jsFiles) {
    const filePath = path.join(DIST_DIR, file);
    const content = fs.readFileSync(filePath);
    const gzipped = getGzippedSize(content);
    totalGzipped += gzipped;
    fileDetails.push({ file, size: content.length, gzipped });
  }

  console.log('\n=== Bundle Size Report ===\n');
  console.log('File'.padEnd(40), 'Raw'.padEnd(15), 'Gzipped');
  console.log('-'.repeat(70));

  for (const { file, size, gzipped } of fileDetails) {
    console.log(
      file.padEnd(40),
      formatBytes(size).padEnd(15),
      formatBytes(gzipped)
    );
  }

  console.log('-'.repeat(70));
  console.log(`Total gzipped JS size: ${formatBytes(totalGzipped)}`);

  if (totalGzipped > MAX_GZIP_SIZE) {
    console.log(`\nERROR: Bundle exceeds ${(MAX_GZIP_SIZE / 1024).toFixed(0)}KB limit (${(totalGzipped / 1024).toFixed(2)} KB)`);
    process.exit(1);
  } else {
    console.log(`\nOK: Bundle is within ${(MAX_GZIP_SIZE / 1024).toFixed(0)}KB limit`);
  }
}

main();