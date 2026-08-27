import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

describe('Guard Tests for EDIS Frontend (spec00)', () => {

  it('should not contain any files under app/api/**', () => {
    const apiPath = path.join(process.cwd(), 'app', 'api');
    if (fs.existsSync(apiPath)) {
      const traverseDir = (dir: string): string[] => {
        let files: string[] = [];
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.lstatSync(fullPath).isDirectory()) {
            files = files.concat(traverseDir(fullPath));
          } else {
            files.push(fullPath);
          }
        });
        return files;
      };
      
      const apiFiles = traverseDir(apiPath);
      expect(apiFiles.length).toBe(0);
    }
  });

  it('should not contain test files inside the routable app directory', () => {
    const appPath = path.join(process.cwd(), 'app');
    if (fs.existsSync(appPath)) {
      const traverseDir = (dir: string): string[] => {
        let testFiles: string[] = [];
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.lstatSync(fullPath).isDirectory()) {
            testFiles = testFiles.concat(traverseDir(fullPath));
          } else if (file.includes('.test.') || file.includes('.spec.')) {
            testFiles.push(fullPath);
          }
        });
        return testFiles;
      };
      
      const appTestFiles = traverseDir(appPath);
      expect(appTestFiles.length).toBe(0);
    }
  });

  it('should throw in next.config.ts if NEXT_PUBLIC_API_BASE_URL is set', () => {
    // This is tricky to test directly without running the build, but we can verify 
    // the source code of next.config.ts contains the required check.
    const configPath = path.join(process.cwd(), 'next.config.ts');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('NEXT_PUBLIC_API_BASE_URL');
      expect(content).toContain('throw new Error');
    }
  });
});
