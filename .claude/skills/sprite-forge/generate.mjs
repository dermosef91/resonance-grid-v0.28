#!/usr/bin/env node
// sprite-forge — generate consistent transparent-PNG sprites via OpenAI GPT Image.
// Dependency-free (Node 20+: global fetch/FormData/Blob). Reads OPENAI_API_KEY
// from the environment ONLY — never hard-code or log the key.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const OUT_ROOT = path.join(REPO_ROOT, 'public', 'sprites');
const INDEX_PATH = path.join(OUT_ROOT, 'sprite-index.json');

const MODEL = process.env.SPRITE_MODEL || 'gpt-image-1';
const QUALITY = process.env.SPRITE_QUALITY || 'high';
const API = 'https://api.openai.com/v1';

// --- args ---
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const DRY = has('--dry-run');
const FORCE = has('--force');
const onlyArg = args.find((a) => a.startsWith('--only'));
let only = null;
if (onlyArg) {
    const v = onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1];
    only = new Set((v || '').split(',').map((s) => s.trim()).filter(Boolean));
}

const style = fs.readFileSync(path.join(__dirname, 'style.md'), 'utf8').trim();
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const assets = manifest.assets;
const byId = new Map(assets.map((a) => [a.id, a]));

// --- topological order by `references` (asset-id refs only) ---
const ordered = [];
const seen = new Set();
const visit = (a, stack = new Set()) => {
    if (seen.has(a.id)) return;
    if (stack.has(a.id)) throw new Error(`Reference cycle at ${a.id}`);
    stack.add(a.id);
    for (const r of a.references || []) {
        if (byId.has(r)) visit(byId.get(r), stack);
    }
    stack.delete(a.id);
    seen.add(a.id);
    ordered.push(a);
};
assets.forEach((a) => visit(a));

const outPathFor = (a) => path.join(OUT_ROOT, a.category, `${a.id}.png`);
const relFor = (a) => path.posix.join('sprites', a.category, `${a.id}.png`);
const buildPrompt = (a) =>
    `${style}\n\nSUBJECT: ${a.prompt}\n\nRemember: single centered subject, fully transparent background, no text, no border.`;

const readIndex = () => {
    try { return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')); } catch { return {}; }
};

const apiKey = process.env.OPENAI_API_KEY;

async function callGenerations(prompt, size) {
    const res = await fetch(`${API}/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: MODEL, prompt, size, n: 1, quality: QUALITY, background: 'transparent', output_format: 'png' }),
    });
    return handle(res);
}

async function callEdits(prompt, size, refPaths) {
    const form = new FormData();
    form.append('model', MODEL);
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('quality', QUALITY);
    form.append('background', 'transparent');
    for (const p of refPaths) {
        const buf = fs.readFileSync(p);
        form.append('image[]', new Blob([buf], { type: 'image/png' }), path.basename(p));
    }
    const res = await fetch(`${API}/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
    });
    return handle(res);
}

async function handle(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI ${res.status}: ${text.slice(0, 800)}`);
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 400)}`);
    return Buffer.from(b64, 'base64');
}

async function main() {
    console.log(`sprite-forge — model=${MODEL} quality=${QUALITY}${DRY ? ' (DRY RUN)' : ''}`);
    const index = readIndex();
    const targets = ordered.filter((a) => !only || only.has(a.id));

    for (const a of targets) {
        const out = outPathFor(a);
        const refIds = (a.references || []);
        const refPaths = refIds.map((r) => (byId.has(r) ? outPathFor(byId.get(r)) : path.join(REPO_ROOT, r)));
        const mode = refPaths.length ? 'edits' : 'generations';

        console.log(`\n[${a.id}] ${mode} (${a.size})${refIds.length ? `  refs: ${refIds.join(', ')}` : ''}`);
        if (DRY) { console.log(buildPrompt(a)); continue; }

        if (fs.existsSync(out) && !FORCE) { console.log(`  skip (exists): ${relFor(a)}`); index[a.id] = relFor(a); continue; }
        if (!apiKey) throw new Error('OPENAI_API_KEY is not set in the environment.');

        const missing = refPaths.filter((p) => !fs.existsSync(p));
        if (missing.length) throw new Error(`Missing reference(s) for ${a.id}: ${missing.join(', ')}`);

        const prompt = buildPrompt(a);
        const buf = refPaths.length ? await callEdits(prompt, a.size, refPaths) : await callGenerations(prompt, a.size);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, buf);
        index[a.id] = relFor(a);
        console.log(`  wrote ${relFor(a)} (${(buf.length / 1024).toFixed(0)} KB)`);
    }

    if (!DRY) {
        fs.mkdirSync(OUT_ROOT, { recursive: true });
        fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n');
        console.log(`\nindex → ${path.relative(REPO_ROOT, INDEX_PATH)} (${Object.keys(index).length} entries)`);
    }
}

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
