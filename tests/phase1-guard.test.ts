import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

describe('Phase 1 Guard Tests', () => {
  it('ensures session.ts is server-only', () => {
    const sessionPath = path.join(__dirname, '../lib/session.ts');
    const content = fs.readFileSync(sessionPath, 'utf8');
    expect(content).toMatch(/import\s+['"]server-only['"]/);
  });
});
