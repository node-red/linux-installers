#!/usr/bin/env node

/**
 * merge-settings.js
 *
 * Takes the NEW settings.js file as the base and patches in any values that differ
 * in the USERS file — preserving the new file's comments, layout and new keys
 * exactly, while keeping local customisations.
 *
 * Strategy:
 *   - Start with the new (upstream) file verbatim
 *   - For every key that exists in BOTH files, replace the upstream value with
 *     the local one (preserving the local source text, e.g. process.env.PORT || 1880)
 *   - Keys only in upstream  → kept as-is (new defaults)
 *   - Keys only in local     → appended to end of file to preserve them
 *   - Output is written to the output path (default: overwrites local file)
 *   - A backup of the original local file is always saved first
 *
 * Usage:
 *   node merge-settings.js <settings.js> <new-settings.js> [output.js] [--dry-run] [--diff]
 *
 * package.json:
 *   "scripts": {
 *     "merge-config": "node merge-settings.js settings.js /usr/lib/node_modules/node-red/settings.js"
 *   }
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ─── Args ─────────────────────────────────────────────────────────────────────

const args  = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')));
const [localFile, upstreamFile, outputFile] = args;

if (!localFile || !upstreamFile) {
  console.error('Usage: node merge-settings.js <settings.js> <new-settings.js> [output.js] [--dry-run] [--diff]');
  process.exit(1);
}

// ─── Scanner primitives ───────────────────────────────────────────────────────

function skipLineComment(src, i) {
  while (i < src.length && src[i] !== '\n') i++;
  return i;
}
function skipBlockComment(src, i) {
  i += 2;
  while (i < src.length) {
    if (src[i] === '*' && src[i + 1] === '/') return i + 2;
    i++;
  }
  throw new Error(`Unterminated block comment near ${i}`);
}
function skipWhitespaceAndComments(src, i) {
  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') { i = skipLineComment(src, i); continue; }
    if (src[i] === '/' && src[i + 1] === '*') { i = skipBlockComment(src, i); continue; }
    if (' \t\n\r'.includes(src[i])) { i++; continue; }
    break;
  }
  return i;
}
function skipString(src, i) {
  const quote = src[i++];
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === quote) return i + 1;
    i++;
  }
  throw new Error(`Unterminated string near ${i}`);
}
function skipTemplateLiteral(src, i) {
  i++;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') return i + 1;
    if (src[i] === '$' && src[i + 1] === '{') {
      i += 2;
      i = skipBalanced(src, i, '}');
      i++;
      continue;
    }
    i++;
  }
  throw new Error(`Unterminated template literal near ${i}`);
}
function skipBalanced(src, i, closeChar) {
  const matching = { ')': '(', '}': '{', ']': '[' };
  const open = matching[closeChar];
  let depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') { i = skipLineComment(src, i); continue; }
    if (ch === '/' && src[i + 1] === '*') { i = skipBlockComment(src, i); continue; }
    if (ch === '`')               { i = skipTemplateLiteral(src, i); continue; }
    if (ch === '"' || ch === "'") { i = skipString(src, i); continue; }
    if (ch === open)      { depth++; i++; continue; }
    if (ch === closeChar) { if (depth === 0) return i; depth--; i++; continue; }
    i++;
  }
  throw new Error(`Could not find closing '${closeChar}'`);
}
function skipValue(src, i) {
  const openers = { '(': ')', '{': '}', '[': ']' };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') { i = skipLineComment(src, i); continue; }
    if (ch === '/' && src[i + 1] === '*') { i = skipBlockComment(src, i); continue; }
    if (ch === '`')               { i = skipTemplateLiteral(src, i); continue; }
    if (ch === '"' || ch === "'") { i = skipString(src, i); continue; }
    if (ch in openers) { i = skipBalanced(src, i + 1, openers[ch]); i++; continue; }
    if (ch === ',' || ch === '}') return i;
    i++;
  }
  return i;
}

// ─── Object parser ────────────────────────────────────────────────────────────
// Returns entries: [{ key, valueStart, valueEnd, isObject }]

function parseObject(src, start) {
  if (src[start] !== '{') throw new Error(`Expected '{' at ${start}`);
  let i = start + 1;
  const entries = [];

  while (true) {
    i = skipWhitespaceAndComments(src, i);
    if (i >= src.length) throw new Error(`Unexpected end of input (unclosed '{' at ${start})`);
    if (src[i] === '}') return { entries, closingBrace: i };

    // computed key — skip
    if (src[i] === '[') {
      i = skipBalanced(src, i + 1, ']') + 1;
      i = skipWhitespaceAndComments(src, i);
      if (src[i] === ':') i++;
      i = skipWhitespaceAndComments(src, i);
      i = skipValue(src, i);
      if (src[i] === ',') i++;
      continue;
    }

    // read key
    let key;
    if (src[i] === '"' || src[i] === "'") {
      const end = skipString(src, i);
      key = src.slice(i + 1, end - 1);
      i = end;
    } else {
      const s = i;
      while (i < src.length && /[\w$]/.test(src[i])) i++;
      key = src.slice(s, i);
    }
    if (!key) throw new Error(`Empty key at ${i}: ${JSON.stringify(src.slice(i, i + 30))}`);

    i = skipWhitespaceAndComments(src, i);

    // shorthand/method — skip
    if (src[i] !== ':') {
      if (src[i] === '(') {
        i = skipBalanced(src, i + 1, ')') + 1;
        i = skipWhitespaceAndComments(src, i);
        if (src[i] === '{') { i = skipBalanced(src, i + 1, '}') + 1; }
      }
      i = skipWhitespaceAndComments(src, i);
      if (src[i] === ',') i++;
      continue;
    }

    i++; // skip ':'
    i = skipWhitespaceAndComments(src, i);

    const valueStart = i;
    const isObject = src[i] === '{';
    i = skipValue(src, i);
    let valueEnd = i;
    while (valueEnd > valueStart && ' \t\n\r'.includes(src[valueEnd - 1])) valueEnd--;

    entries.push({ key, valueStart, valueEnd, isObject });

    i = skipWhitespaceAndComments(src, i);
    if (src[i] === ',') i++;
  }
}

function findModuleExportsStart(src) {
  const match = src.match(/module\s*\.\s*exports\s*=\s*\{/);
  if (!match) throw new Error('Could not find module.exports = { ... }');
  return match.index + match[0].length - 1;
}

// ─── Preamble merge ───────────────────────────────────────────────────────────
// Extracts the code lines (non-comment, non-blank) from each file's preamble
// (everything before module.exports). Any lines present in local but absent
// from upstream are injected into the upstream preamble just before module.exports.

function mergePreamble(localSrc, upstreamSrc) {
  const localPreamble    = localSrc.slice(0, localSrc.search(/module\s*\.\s*exports/));
  const upstreamMatch    = upstreamSrc.match(/module\s*\.\s*exports/);
  const upstreamPreamble = upstreamSrc.slice(0, upstreamMatch.index);
  const insertAt         = upstreamMatch.index;

  // Extract non-blank, non-comment lines from a preamble
  const codeLines = preamble => preamble
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('*') && !l.startsWith('/*') && !l.startsWith('//'));

  const upstreamCodeLines = new Set(codeLines(upstreamPreamble));
  const localOnlyLines    = codeLines(localPreamble).filter(l => !upstreamCodeLines.has(l));

  if (localOnlyLines.length === 0) return null; // nothing to inject

  const injection = localOnlyLines.join('\n') + '\n\n';
  return { insertAt, injection };
}

// ─── Build a nested source-text map from a parsed file ────────────────────────
// { key: { sourceText } | { isObject, children, objStart } }

function buildSourceMap(src, objStart) {
  const { entries } = parseObject(src, objStart);
  const map = {};
  for (const e of entries) {
    const rawSourceText = src.slice(e.valueStart, e.valueEnd).trim();
    if (e.isObject) {
      map[e.key] = { isObject: true, objStart: e.valueStart, rawSourceText, children: buildSourceMap(src, e.valueStart) };
    } else {
      map[e.key] = { isObject: false, sourceText: rawSourceText, rawSourceText };
    }
  }
  return map;
}

// ─── Build replacements list ──────────────────────────────────────────────────
// Walks the UPSTREAM file's parsed entries. For each key that also exists in
// the local source map, record a replacement: { start, end, text } where
// start/end are indices into upstreamSrc.

function buildReplacements(upstreamSrc, upstreamObjStart, localMap) {
  const { entries } = parseObject(upstreamSrc, upstreamObjStart);
  const replacements = [];

  for (const e of entries) {
    const local = localMap[e.key];
    if (!local) continue; // key not in local — keep upstream value as-is

    if (e.isObject && local.isObject) {
      // Both are objects — recurse to patch individual sub-keys
      const sub = buildReplacements(upstreamSrc, e.valueStart, local.children);
      replacements.push(...sub);
    } else if (!e.isObject && !local.isObject) {
      // Both are primitives — replace upstream value with local source text
      const upstreamText = upstreamSrc.slice(e.valueStart, e.valueEnd).trim();
      if (upstreamText !== local.sourceText) {
        replacements.push({ start: e.valueStart, end: e.valueEnd, text: local.sourceText });
      }
    } else if (e.isObject && !local.isObject) {
      // Upstream has object, local has primitive — replace whole object with local value
      replacements.push({ start: e.valueStart, end: e.valueEnd, text: local.sourceText });
    } else if (!e.isObject && local.isObject) {
      // Upstream has primitive, local has object — replace with serialised local object
      replacements.push({ start: e.valueStart, end: e.valueEnd, text: serialiseMap(local.children, 0) });
    }
  }

  return replacements;
}

// ─── Handle commented-out keys in upstream ───────────────────────────────────
// Finds lines of the form `   //key: value,` inside the module.exports block.
// If that key is active in localMap, records a replacement that uncomments the
// line and patches in the local value.
// Only handles single-line comments (//key: primitiveValue). Multi-line
// commented blocks (adminAuth etc.) are left alone.

function buildCommentedReplacements(upstreamSrc, upstreamObjStart, localMap) {
  const replacements = [];
  const diffs = [];

  const { entries, closingBrace } = parseObject(upstreamSrc, upstreamObjStart);

  // Recurse into nested objects first
  for (const e of entries) {
    if (!e.isObject) continue;
    const local = localMap[e.key];
    if (!local || !local.isObject) continue;
    const sub = buildCommentedReplacements(upstreamSrc, e.valueStart, local.children);
    replacements.push(...sub.replacements);
    diffs.push(...sub.diffs);
  }

  // Scan this object level for commented-out keys active in localMap.
  // Exclude ranges occupied by nested object values so we don't match
  // commented lines inside nested blocks.
  const nestedRanges = entries
    .filter(e => e.isObject)
    .map(e => ({ start: e.valueStart, end: e.valueEnd }));

  const block = upstreamSrc.slice(upstreamObjStart, closingBrace);
  const blockOffset = upstreamObjStart;

  const lineRe = /^([ \t]*)\/\/\s*([a-zA-Z_$][\w$]*)\s*:(.*?)(?:,?[ \t]*)$/gm;
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    const [fullMatch, indent, key, rawVal] = m;
    const absPos = blockOffset + m.index;

    // Skip if inside a nested object's value range
    if (nestedRanges.some(r => absPos >= r.start && absPos <= r.end)) continue;

    const localEntry = localMap[key];
    if (!localEntry) continue;

    const lineStart = blockOffset + m.index;
    // Consume the full matched line including its trailing newline if present
    const lineEnd = lineStart + fullMatch.length +
      (upstreamSrc[blockOffset + m.index + fullMatch.length] === '\n' ? 1 : 0);

    const localText = localEntry.rawSourceText;
    const uncommented = `${indent}${key}: ${localText},\n`;
    replacements.push({ start: lineStart, end: lineEnd, text: uncommented });
    diffs.push({ key, from: `//${key}:${rawVal} (commented)`, to: localText });
  }

  return { replacements, diffs };
}

// ─── Serialise a source map back to object source (fallback for type mismatches)

function serialiseMap(map, indent) {
  const pad  = ' '.repeat(indent);
  const pad2 = ' '.repeat(indent + 4);
  const entries = Object.entries(map).map(([k, v]) => {
    const sk = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
    const val = v.isObject ? serialiseMap(v.children, indent + 4) : v.sourceText;
    return `${pad2}${sk}: ${val}`;
  }).join(',\n');
  return `{\n${entries}\n${pad}}`;
}

// ─── Find local-only keys (not present anywhere in upstream) ──────────────────
// Returns keys that exist in local but are absent from upstream — both as active
// entries AND as commented-out lines. These will be appended to the output with
// a warning comment so nothing from the old file is silently lost.

function findUpstreamKeys(upstreamSrc, upstreamObjStart) {
  // Active parsed keys at this level
  const { entries, closingBrace } = parseObject(upstreamSrc, upstreamObjStart);
  const keys = new Set(entries.map(e => e.key));

  // Also include commented-out keys at this level only.
  // We scan line by line but skip ranges that belong to nested objects/arrays.
  // Build a set of character ranges occupied by nested values so we can exclude them.
  const nestedRanges = entries
    .filter(e => e.isObject)
    .map(e => ({ start: e.valueStart, end: e.valueEnd }));

  const block = upstreamSrc.slice(upstreamObjStart, closingBrace);
  const blockOffset = upstreamObjStart;
  const lineRe = /^[ \t]*\/\/\s*([a-zA-Z_$][\w$]*)\s*:/gm;
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    const absPos = blockOffset + m.index;
    // Skip if this position falls inside a nested object's value range
    const inNested = nestedRanges.some(r => absPos >= r.start && absPos <= r.end);
    if (!inNested) keys.add(m[1]);
  }

  return keys;
}

function buildOrphanInsertions(upstreamSrc, upstreamObjStart, localMap, indent = '    ') {
  const upstreamKeys = findUpstreamKeys(upstreamSrc, upstreamObjStart);
  const { entries: upstreamEntries, closingBrace } = parseObject(upstreamSrc, upstreamObjStart);
  const allReplacements = [];
  const allDiffs = [];

  // Recurse into nested objects that exist in both — they may have orphaned sub-keys
  for (const e of upstreamEntries) {
    if (!e.isObject) continue;
    const local = localMap[e.key];
    if (!local || !local.isObject) continue;
    const sub = buildOrphanInsertions(upstreamSrc, e.valueStart, local.children, indent + '    ');
    allReplacements.push(...sub.replacements);
    allDiffs.push(...sub.diffs);
  }

  // Find keys in local that are completely absent from this upstream object
  const orphans = [];
  for (const [key, entry] of Object.entries(localMap)) {
    if (upstreamKeys.has(key)) continue;
    orphans.push({ key, entry });
  }

  if (orphans.length > 0) {
    // Insert just before the closing brace of this object
    let lastContent = closingBrace - 1;
    while (lastContent > upstreamObjStart && ' \t\n\r'.includes(upstreamSrc[lastContent])) lastContent--;
    const needsComma = upstreamSrc[lastContent] !== ',' && upstreamSrc[lastContent] !== '{';

    let text = needsComma ? ',' : '';
    text += `\n\n${indent}// ── Preserved from local settings (not present in upstream) ──────────────\n`;
    for (const { key, entry } of orphans) {
      const sk = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      text += `${indent}${sk}: ${entry.rawSourceText},\n`;
    }

    allDiffs.push(...orphans.map(({ key }) => ({ key, from: '(not in upstream)', to: '(preserved from local)' })));
    allReplacements.push({ start: lastContent + 1, end: lastContent + 1, text });
  }

  return { replacements: allReplacements, diffs: allDiffs };
}

// ─── Diff: what local values differ from upstream ─────────────────────────────

function findDiffs(upstreamSrc, upstreamObjStart, localMap, prefix = '') {
  const { entries } = parseObject(upstreamSrc, upstreamObjStart);
  const diffs = [];
  for (const e of entries) {
    const local = localMap[e.key];
    if (!local) continue;
    const full = prefix ? `${prefix}.${e.key}` : e.key;
    if (e.isObject && local.isObject) {
      diffs.push(...findDiffs(upstreamSrc, e.valueStart, local.children, full));
    } else {
      const upstreamText = upstreamSrc.slice(e.valueStart, e.valueEnd).trim();
      const localText    = local.isObject ? serialiseMap(local.children, 0) : local.sourceText;
      if (upstreamText !== localText) {
        diffs.push({ key: full, from: upstreamText, to: localText });
      }
    }
  }
  return diffs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const localPath    = path.resolve(localFile);
const upstreamPath = path.resolve(upstreamFile);
const outputPath   = path.resolve(outputFile ?? localFile);

const localSrc    = fs.readFileSync(localPath, 'utf8');
const upstreamSrc = fs.readFileSync(upstreamPath, 'utf8');

let localMap, upstreamObjStart, replacements, diffs;

try {
  const localObjStart = findModuleExportsStart(localSrc);
  localMap = buildSourceMap(localSrc, localObjStart);
} catch (e) {
  console.error(`✗ Failed to parse local file: ${e.message}`);
  process.exit(1);
}

try {
  upstreamObjStart = findModuleExportsStart(upstreamSrc);
} catch (e) {
  console.error(`✗ Failed to parse new settings file: ${e.message}`);
  process.exit(1);
}

try {
  replacements = buildReplacements(upstreamSrc, upstreamObjStart, localMap);
  diffs        = findDiffs(upstreamSrc, upstreamObjStart, localMap);

  // Handle keys commented out in upstream but active in local
  const commented = buildCommentedReplacements(upstreamSrc, upstreamObjStart, localMap);
  replacements.push(...commented.replacements);
  diffs.push(...commented.diffs);

  // Preserve local-only keys that don't exist anywhere in upstream
  const orphans = buildOrphanInsertions(upstreamSrc, upstreamObjStart, localMap);
  replacements.push(...orphans.replacements);
  diffs.push(...orphans.diffs);
} catch (e) {
  console.error(`✗ Failed to compute replacements: ${e.message}`);
  process.exit(1);
}

// ─── Diff / dry-run output ────────────────────────────────────────────────────

if (flags.has('--diff') || flags.has('--dry-run')) {
  const changed  = diffs.filter(d => d.from !== '(not in upstream)');
  const orphaned = diffs.filter(d => d.from === '(not in upstream)');

  if (changed.length === 0 && orphaned.length === 0) {
    console.log('✓ No local customisations found — output would be identical to upstream.');
  }
  if (changed.length > 0) {
    console.log(`\n📋 Local values that will be patched in (${changed.length}):\n`);
    for (const { key, from, to } of changed) {
      console.log(`  ~ ${key}`);
      console.log(`      new settings  : ${from}`);
      console.log(`      local settings: ${to}`);
    }
  }
  if (orphaned.length > 0) {
    console.log(`\n⚠️  Local-only keys not found in new settings — will be preserved (${orphaned.length}):\n`);
    for (const { key } of orphaned) {
      console.log(`  + ${key}`);
    }
    console.log();
  }
}

if (flags.has('--dry-run')) {
  console.log('Dry run — no files written.');
  process.exit(0);
}

// ─── Apply replacements back-to-front (all in memory) ─────────────────────────

replacements.sort((a, b) => b.start - a.start);

let output = upstreamSrc;
try {
  for (const { start, end, text } of replacements) {
    output = output.slice(0, start) + text + output.slice(end);
  }
} catch (e) {
  console.error(`✗ Failed to apply replacements: ${e.message}`);
  console.error('  Original file has not been modified.');
  process.exit(1);
}

// ─── Inject any local-only preamble lines (e.g. const os = ...) ──────────────

try {
  const preamble = mergePreamble(localSrc, output);
  if (preamble) {
    output = output.slice(0, preamble.insertAt) + preamble.injection + output.slice(preamble.insertAt);
    if (flags.has('--diff')) {
      console.log(`\n📎 Preamble lines from local carried over:\n`);
      preamble.injection.trim().split('\n').forEach(l => console.log(`  + ${l}`));
      console.log();
    }
  }
} catch (e) {
  console.error(`✗ Failed to merge preamble: ${e.message}`);
  console.error('  Original file has not been modified.');
  process.exit(1);
}

// ─── Validate the output before touching any files ───────────────────────────
// Syntax-only check — we can't do a full runtime execution here because the
// file may reference environment-specific things (network interfaces, env vars)
// that only exist on the target machine.

try {
  new vm.Script(output, { filename: outputPath }); // syntax check only
} catch (e) {
  console.error(`✗ Validation failed — merged output has a syntax error: ${e.message}`);
  console.error('  Original file has not been modified.');
  process.exit(1);
}

// ─── Everything looks good — backup then write ────────────────────────────────

const backupPath = localPath + '.bak';
try {
  fs.copyFileSync(localPath, backupPath);
  console.log(`📦 Backup saved to: ${backupPath}`);
} catch (e) {
  console.error(`✗ Could not write backup to ${backupPath}: ${e.message}`);
  console.error('  Aborting — original file has not been modified.');
  process.exit(1);
}

try {
  fs.writeFileSync(outputPath, output, 'utf8');
} catch (e) {
  console.error(`✗ Failed to write output to ${outputPath}: ${e.message}`);
  console.error(`  Original file is intact. Backup is at: ${backupPath}`);
  process.exit(1);
}

if (diffs.length === 0) {
  console.log(`✓ No changes needed. Output written to: ${outputPath}`);
} else {
  console.log(`✓ Patched ${diffs.length} value(s) into settings file. Output written to: ${outputPath}`);
}
