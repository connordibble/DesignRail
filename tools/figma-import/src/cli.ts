#!/usr/bin/env -S tsx
import { importFigmaFixture } from './index.js';

const [, , inputPath = ''] = process.argv;
if (!inputPath) {
  console.error('Usage: figma-import <path-to-fixture.json>');
  process.exit(2);
}

const result = importFigmaFixture(inputPath);
console.log(JSON.stringify(result, null, 2));
