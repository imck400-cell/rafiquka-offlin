import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const swFile = path.join(distDir, 'sw.js');

function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else {
      // Don't add sw.js to its own cache list to prevent loops
      if (file !== 'sw.js') {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

try {
  if (!fs.existsSync(swFile)) {
    console.error('sw.js not found in dist directory!');
    process.exit(1);
  }

  const allFiles = getFilesRecursively(distDir);
  const assetsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
  ];

  for (const file of allFiles) {
    const relativePath = path.relative(distDir, file).replace(/\\/g, '/');
    const url = '/' + relativePath;
    if (url !== '/index.html' && url !== '/manifest.json') {
      assetsToCache.push(url);
    }
  }

  console.log(`Found ${assetsToCache.length} assets to cache.`);

  let swContent = fs.readFileSync(swFile, 'utf8');

  // Replace ASSETS_TO_CACHE array in sw.js
  const replacementString = `const ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)};`;
  
  // Replace the entire const ASSETS_TO_CACHE block
  swContent = swContent.replace(/const\s+ASSETS_TO_CACHE\s*=\s*\[[\s\S]*?\];/, replacementString);

  // Dynamically update the CACHE_NAME with a timestamp so old caches get busted
  const timestamp = Date.now();
  swContent = swContent.replace(/const\s+CACHE_NAME\s*=\s*'rafiquk-[^']+';/, `const CACHE_NAME = 'rafiquk-v${timestamp}';`);

  fs.writeFileSync(swFile, swContent, 'utf8');
  console.log('Successfully updated dist/sw.js with asset list!');

  // Generate version.json for runtime freshness checks
  const versionFile = path.join(distDir, 'version.json');
  fs.writeFileSync(versionFile, JSON.stringify({ v: timestamp }), 'utf8');
  console.log(`Generated version.json with build version: ${timestamp}`);
} catch (error) {
  console.error('Error generating sw.js assets:', error);
  process.exit(1);
}
