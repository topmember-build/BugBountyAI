const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'lib', 'language-context.tsx');
const src = fs.readFileSync(file, 'utf8');

const startIndex = src.indexOf('export const translations');
if (startIndex === -1) {
  console.error('Could not find translations export');
  process.exit(1);
}
const braceIndex = src.indexOf('{', startIndex);
if (braceIndex === -1) {
  console.error('Could not find opening brace for translations');
  process.exit(1);
}

// Find matching closing brace
let depth = 0;
let endIndex = -1;
for (let i = braceIndex; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') {
    depth--;
    if (depth === 0) { endIndex = i; break; }
  }
}

if (endIndex === -1) {
  console.error('Could not find end of translations object');
  process.exit(1);
}

const block = src.slice(braceIndex + 1, endIndex);

const langRegex = /([a-zA-Z0-9_]+)\s*:\s*{([\s\S]*?)}\s*,?/g;
let m;
const langs = {};
while ((m = langRegex.exec(block)) !== null) {
  const lang = m[1];
  const body = m[2];
  const keyRegex = /"([^"]+)"\s*:\s*"([\s\S]*?)"\s*,?/g;
  let k;
  langs[lang] = {};
  while ((k = keyRegex.exec(body)) !== null) {
    langs[lang][k[1]] = k[2];
  }
}

const enKeys = new Set(Object.keys(langs.en || {}));
const report = {};
for (const [lang, map] of Object.entries(langs)) {
  if (lang === 'en') continue;
  const missing = [];
  for (const key of enKeys) {
    if (!(key in map)) missing.push(key);
  }
  report[lang] = missing;
}

console.log('Translation coverage report (missing keys per language, compared to English):\n');
for (const [lang, missing] of Object.entries(report)) {
  console.log(`${lang}: ${missing.length} missing`);
  if (missing.length > 0) {
    console.log(missing.join(', '));
  }
  console.log('---');
}

// Also show total keys in English
console.log(`English keys: ${enKeys.size}`);

process.exit(0);
