#!/usr/bin/env -S tsx
import { mapComponent } from './index.js';

const result = mapComponent();
console.log(JSON.stringify(result, null, 2));
