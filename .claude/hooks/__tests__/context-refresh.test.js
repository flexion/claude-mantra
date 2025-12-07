const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  processHook,
  processSessionStart,
  processUserPromptSubmit,
  buildContextContent,
  loadState,
  saveState,
  findContextFiles,
  readClaudeMd,
  readContextFiles,
  freshnessIndicator
} = require('../context-refresh');

describe('context-refresh hook', () => {
  let tmpDir;
  let stateFile;

  beforeEach(() => {
    // Create isolated temp directory for each test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-test-'));
    stateFile = path.join(tmpDir, 'state.json');
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('freshnessIndicator', () => {
    it('shows count without refresh suffix', () => {
      expect(freshnessIndicator(5, 50)).toBe('📍 Context: 5/50');
    });

    it('shows count with refresh suffix when refreshed', () => {
      expect(freshnessIndicator(0, 50, true)).toBe('📍 Context: 0/50 (refreshed)');
    });

    it('uses custom refresh interval', () => {
      expect(freshnessIndicator(10, 100)).toBe('📍 Context: 10/100');
    });
  });

  describe('loadState', () => {
    it('returns default state when file does not exist', () => {
      const state = loadState(path.join(tmpDir, 'nonexistent.json'));
      expect(state).toEqual({ count: 0 });
    });

    it('loads existing state from file', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 25 }));
      const state = loadState(stateFile);
      expect(state).toEqual({ count: 25 });
    });

    it('returns default state on invalid JSON', () => {
      fs.writeFileSync(stateFile, 'not valid json');
      const state = loadState(stateFile);
      expect(state).toEqual({ count: 0 });
    });
  });

  describe('saveState', () => {
    it('saves state to file', () => {
      saveState(stateFile, { count: 42 });
      const content = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(content).toEqual({ count: 42 });
    });

    it('creates parent directories if needed', () => {
      const nestedStateFile = path.join(tmpDir, 'nested', 'dir', 'state.json');
      saveState(nestedStateFile, { count: 10 });
      expect(fs.existsSync(nestedStateFile)).toBe(true);
    });
  });

  describe('findContextFiles', () => {
    it('returns empty array when context dir does not exist', () => {
      const files = findContextFiles(tmpDir, '.claude/context');
      expect(files).toEqual([]);
    });

    it('finds .yml files in context directory', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'behavior.yml'), 'test: true');
      fs.writeFileSync(path.join(contextDir, 'git.yml'), 'branch: main');
      fs.writeFileSync(path.join(contextDir, 'readme.md'), '# Readme');

      const files = findContextFiles(tmpDir, '.claude/context');
      expect(files).toHaveLength(2);
      expect(files.every(f => f.endsWith('.yml'))).toBe(true);
    });

    it('ignores non-yml files', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'notes.txt'), 'some notes');
      fs.writeFileSync(path.join(contextDir, 'guide.md'), '# Guide');

      const files = findContextFiles(tmpDir, '.claude/context');
      expect(files).toEqual([]);
    });
  });

  describe('readClaudeMd', () => {
    it('returns null when file does not exist', () => {
      const content = readClaudeMd(tmpDir, 'CLAUDE.md');
      expect(content).toBeNull();
    });

    it('reads CLAUDE.md content', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project Guide');
      const content = readClaudeMd(tmpDir, 'CLAUDE.md');
      expect(content).toBe('# Project Guide');
    });
  });

  describe('readContextFiles', () => {
    it('returns empty string for empty file list', () => {
      const content = readContextFiles([]);
      expect(content).toBe('');
    });

    it('reads and formats multiple files', () => {
      const file1 = path.join(tmpDir, 'behavior.yml');
      const file2 = path.join(tmpDir, 'git.yml');
      fs.writeFileSync(file1, 'stance: skeptical');
      fs.writeFileSync(file2, 'branch: main');

      const content = readContextFiles([file1, file2]);
      expect(content).toContain('### behavior.yml');
      expect(content).toContain('stance: skeptical');
      expect(content).toContain('### git.yml');
      expect(content).toContain('branch: main');
    });

    it('skips unreadable files', () => {
      const file1 = path.join(tmpDir, 'exists.yml');
      const file2 = path.join(tmpDir, 'nonexistent.yml');
      fs.writeFileSync(file1, 'content: here');

      const content = readContextFiles([file1, file2]);
      expect(content).toContain('### exists.yml');
      expect(content).not.toContain('nonexistent');
    });
  });

  describe('processHook', () => {
    it('increments counter and shows freshness indicator', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(result.hookSpecificOutput.additionalContext).toContain('📍 Context: 1/50');
    });

    it('triggers refresh when counter reaches interval', () => {
      // Set state to 49 so next call triggers refresh (49 + 1 = 50 % 50 = 0)
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      // Create CLAUDE.md for fallback
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test Project');

      const config = { stateFile, refreshInterval: 50 };
      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('📍 Context: 0/50 (refreshed)');
      expect(result.hookSpecificOutput.additionalContext).toContain('**Context Refresh**');
    });

    it('injects yml files on refresh when they exist', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'test.yml'), 'key: value');

      const config = { stateFile, refreshInterval: 50, contextDir: '.claude/context' };
      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('### test.yml');
      expect(result.hookSpecificOutput.additionalContext).toContain('key: value');
      expect(result.hookSpecificOutput.additionalContext).not.toContain('Tip');
    });

    it('falls back to CLAUDE.md with warning when no yml files', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project');

      const config = { stateFile, refreshInterval: 50, contextDir: '.claude/context' };
      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('# My Project');
      expect(result.hookSpecificOutput.additionalContext).toContain('from CLAUDE.md');
      expect(result.hookSpecificOutput.additionalContext).toContain('Multi-file context is supported');
    });

    it('shows warning when no context files at all', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      const config = { stateFile, refreshInterval: 50, contextDir: '.claude/context' };
      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('No context files found');
    });

    it('resets counter after refresh', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      const config = { stateFile, refreshInterval: 50 };
      processHook({ cwd: tmpDir }, config);

      const newState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(newState.count).toBe(0);
    });

    it('persists counter across calls', () => {
      const config = { stateFile, refreshInterval: 50 };

      processHook({ cwd: tmpDir }, config);
      processHook({ cwd: tmpDir }, config);
      processHook({ cwd: tmpDir }, config);

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(3);
    });

    it('respects custom refresh interval', () => {
      const config = { stateFile, refreshInterval: 5 };

      // Run 4 times (counts 1, 2, 3, 4)
      for (let i = 0; i < 4; i++) {
        const result = processHook({ cwd: tmpDir }, config);
        expect(result.hookSpecificOutput.additionalContext).not.toContain('(refreshed)');
      }

      // 5th call triggers refresh (count becomes 0)
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('(refreshed)');
    });

    it('routes to SessionStart handler when hook_event_name is SessionStart', () => {
      const config = { stateFile, refreshInterval: 50 };
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');

      const result = processHook({ cwd: tmpDir, hook_event_name: 'SessionStart' }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toContain('(refreshed)');
    });

    it('routes to UserPromptSubmit handler by default', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });
  });

  describe('processSessionStart', () => {
    it('always injects context on session start', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'test.yml'), 'key: value');

      const config = { stateFile, refreshInterval: 50, contextDir: '.claude/context' };
      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toContain('📍 Context: 0/50 (refreshed)');
      expect(result.hookSpecificOutput.additionalContext).toContain('### test.yml');
      expect(result.hookSpecificOutput.additionalContext).toContain('session startup');
    });

    it('resets counter to 0 on session start', () => {
      // Set existing state
      fs.writeFileSync(stateFile, JSON.stringify({ count: 35 }));

      const config = { stateFile, refreshInterval: 50 };
      processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(0);
    });

    it('includes source in refresh reason for startup', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session startup');
    });

    it('includes source in refresh reason for resume', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'resume' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session resume');
    });

    it('includes source in refresh reason for clear', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'clear' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session clear');
    });

    it('includes source in refresh reason for compact', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'compact' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session compact');
    });

    it('falls back to CLAUDE.md when no yml files', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project');
      const config = { stateFile, refreshInterval: 50, contextDir: '.claude/context' };

      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('# My Project');
      expect(result.hookSpecificOutput.additionalContext).toContain('from CLAUDE.md');
    });

    it('shows warning when no context files at all', () => {
      const config = { stateFile, refreshInterval: 50, contextDir: '.claude/context' };

      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('No context files found');
    });
  });

  describe('buildContextContent', () => {
    it('builds content from yml files', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'test.yml'), 'key: value');

      const cfg = { contextDir: '.claude/context', claudeMd: 'CLAUDE.md' };
      const content = buildContextContent(tmpDir, cfg, 'test reason');

      expect(content).toContain('**Context Refresh** (test reason)');
      expect(content).toContain('### test.yml');
      expect(content).toContain('key: value');
    });

    it('falls back to CLAUDE.md with reason', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Guide');
      const cfg = { contextDir: '.claude/context', claudeMd: 'CLAUDE.md' };

      const content = buildContextContent(tmpDir, cfg, 'my reason');

      expect(content).toContain('(my reason, from CLAUDE.md)');
      expect(content).toContain('# Guide');
    });
  });
});
