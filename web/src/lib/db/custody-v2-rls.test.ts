import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('custody v2 migration RLS boundaries', () => {
  it('must not contain participant INSERT, UPDATE, or DELETE policies for custody tables', () => {
    const fileContent = fs.readFileSync(path.join(__dirname, '../../../supabase/migrations/20260630_custody_v2_persistence.sql'), 'utf-8');
    
    // There shouldn't be any "FOR INSERT", "FOR UPDATE", or "FOR DELETE" for custody_v2 tables
    expect(fileContent).not.toMatch(/CREATE POLICY.*ON custody_v2_.*FOR INSERT/);
    expect(fileContent).not.toMatch(/CREATE POLICY.*ON custody_v2_.*FOR UPDATE/);
    expect(fileContent).not.toMatch(/CREATE POLICY.*ON custody_v2_.*FOR DELETE/);
  });

  it('must not contain participant SELECT policies for event cursors', () => {
    const fileContent = fs.readFileSync(path.join(__dirname, '../../../supabase/migrations/20260630_custody_v2_persistence.sql'), 'utf-8');
    
    expect(fileContent).not.toMatch(/CREATE POLICY.*ON custody_v2_event_cursors.*FOR SELECT/);
  });
});
