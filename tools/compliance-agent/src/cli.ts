#!/usr/bin/env -S tsx
import { reviewCompliance } from './index.js';

const result = reviewCompliance({});
console.log(JSON.stringify(result, null, 2));
