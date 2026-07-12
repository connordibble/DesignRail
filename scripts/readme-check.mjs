#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const README_PATH = resolve(ROOT, 'README.md');
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const REQUIRED_PROOF_ASSETS = [
  'assets/designrail-demo.mp4',
  'assets/designrail-demo.vtt',
  'assets/designrail-poster.png',
  'assets/demo-compliance.png',
  'assets/demo-rejection-rationale.png',
  'assets/demo-history-diff.png',
  'assets/demo-agent-brief.png',
];

const failures = [];
const readme = readFileSync(README_PATH, 'utf8');

for (const target of collectLocalTargets(readme)) {
  validateLocalTarget(target);
}

for (const asset of REQUIRED_PROOF_ASSETS) {
  validateLocalTarget(asset);
}

validateDemoVideo(resolve(ROOT, 'assets/designrail-demo.mp4'));

if (readme.includes('designrail-demo.mov')) {
  failures.push('README.md still references the replaced .mov demo.');
}

if (isTracked('assets/designrail-demo.mov')) {
  failures.push('assets/designrail-demo.mov is still tracked.');
}

if (isTracked('assets/review-workspace-old.png')) {
  failures.push('assets/review-workspace-old.png is still tracked.');
}

if (failures.length > 0) {
  process.stderr.write('README proof check failed:\n');
  for (const failure of failures) {
    process.stderr.write(`- ${failure}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `README proof check passed (${collectLocalTargets(readme).size} local targets, ${REQUIRED_PROOF_ASSETS.length} required assets).\n`,
);

function collectLocalTargets(markdown) {
  const targets = new Set();
  const markdownTargetPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*)?\)/g;
  const htmlTargetPattern = /\b(?:href|poster|src)=["']([^"']+)["']/g;

  for (const match of markdown.matchAll(markdownTargetPattern)) {
    addLocalTarget(targets, match[1]);
  }

  for (const match of markdown.matchAll(htmlTargetPattern)) {
    addLocalTarget(targets, match[1]);
  }

  return targets;
}

function addLocalTarget(targets, rawTarget) {
  const target = rawTarget.replace(/^<|>$/g, '').split(/[?#]/, 1)[0];

  if (
    target.length === 0 ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^[a-z][a-z\d+.-]*:/i.test(target)
  ) {
    return;
  }

  targets.add(decodeURIComponent(target));
}

function validateLocalTarget(target) {
  const absolutePath = resolve(ROOT, target);
  const relativePath = toRepoPath(absolutePath);

  if (relativePath.startsWith(`..${sep}`) || relativePath === '..') {
    failures.push(`Local target escapes the repository: ${target}`);
    return;
  }

  if (!existsSync(absolutePath)) {
    failures.push(`Missing local target: ${target}`);
    return;
  }

  if (!statSync(absolutePath).isFile()) {
    failures.push(`Local target is not a file: ${target}`);
    return;
  }

  if (!isTracked(relativePath)) {
    failures.push(`Local target is not tracked by git: ${target}`);
  }
}

function validateDemoVideo(videoPath) {
  // Read once and derive the size from the buffer so the size check and the atom
  // parse always describe the same bytes (a missing video is reported by the
  // required-asset check, not here).
  let video;
  try {
    video = readFileSync(videoPath);
  } catch {
    return;
  }

  if (video.length > MAX_VIDEO_BYTES) {
    failures.push(`Demo video is ${(video.length / 1024 / 1024).toFixed(1)} MiB; limit is 20 MiB.`);
  }
  const boxes = readTopLevelMp4Boxes(video);
  const ftyp = boxes.findIndex((box) => box.type === 'ftyp');
  const moov = boxes.findIndex((box) => box.type === 'moov');
  const mdat = boxes.findIndex((box) => box.type === 'mdat');

  if (ftyp === -1 || moov === -1 || mdat === -1) {
    failures.push('Demo video is not a valid MP4 with ftyp, moov, and mdat atoms.');
  } else if (moov > mdat) {
    failures.push('Demo video is not fast-start: moov must appear before mdat.');
  }

  if (!video.includes(Buffer.from('avc1')) && !video.includes(Buffer.from('avc3'))) {
    failures.push('Demo video does not advertise an H.264 (avc1/avc3) track.');
  }
}

function readTopLevelMp4Boxes(buffer) {
  const boxes = [];
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const size32 = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;
    let size = size32;

    if (size32 === 1) {
      if (offset + 16 > buffer.length) {
        break;
      }
      headerSize = 16;
      const extendedSize = buffer.readBigUInt64BE(offset + 8);
      if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) {
        break;
      }
      size = Number(extendedSize);
    } else if (size32 === 0) {
      size = buffer.length - offset;
    }

    if (size < headerSize || offset + size > buffer.length) {
      break;
    }

    boxes.push({ type, offset, size });
    offset += size;
  }

  return boxes;
}

function isTracked(repoPath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', repoPath], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function toRepoPath(absolutePath) {
  return relative(ROOT, absolutePath).split(sep).join('/');
}
