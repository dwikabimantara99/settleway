import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('admin-writer module boundaries', () => {
  it('must include the server-only import as the first statement', () => {
    const fileContent = fs.readFileSync(path.join(__dirname, 'admin-writer.ts'), 'utf-8');
    const firstLine = fileContent.split('\n')[0].trim();
    expect(firstLine).toBe('import "server-only";');
  });

  it('must not import runtimeMode from repositories/index to prevent instantiation loops', () => {
    const fileContent = fs.readFileSync(path.join(__dirname, 'admin-writer.ts'), 'utf-8');
    expect(fileContent).not.toMatch(/from '\.\/index'/);
    expect(fileContent).not.toMatch(/from "\.\/index"/);
  });
});
