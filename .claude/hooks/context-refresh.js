#!/usr/bin/env node
/**
 * claude-mantra: Periodic context refresh hook
 *
 * Runs on:
 * - SessionStart: Inject context immediately on new/resumed sessions
 * - UserPromptSubmit: Track interaction count, refresh periodically
 *
 * Features:
 * 1. Track interaction count
 * 2. Show freshness indicator every prompt
 * 3. Inject context files on refresh (every N interactions or session start)
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  refreshInterval: 50,
  stateFile: path.join(process.env.HOME || '/tmp', '.claude', 'mantra-state.json'),
  contextDir: '.claude/context',
  claudeMd: 'CLAUDE.md'
};

// Load state from file
function loadState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (e) {
    // Ignore errors, return default
  }
  return { count: 0 };
}

// Save state to file
function saveState(stateFile, state) {
  try {
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFile, JSON.stringify(state));
  } catch (e) {
    // Ignore save errors
  }
}

// Find all .yml files in context directory
function findContextFiles(cwd, contextDir) {
  const contextPath = path.join(cwd, contextDir);
  try {
    if (!fs.existsSync(contextPath)) {
      return [];
    }
    return fs.readdirSync(contextPath)
      .filter(f => f.endsWith('.yml'))
      .map(f => path.join(contextPath, f));
  } catch (e) {
    return [];
  }
}

// Read CLAUDE.md file
function readClaudeMd(cwd, claudeMdFile) {
  const claudePath = path.join(cwd, claudeMdFile);
  try {
    if (fs.existsSync(claudePath)) {
      return fs.readFileSync(claudePath, 'utf8');
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

// Read and concatenate context files
function readContextFiles(files) {
  const contents = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const basename = path.basename(file);
      contents.push(`### ${basename}\n${content}`);
    } catch (e) {
      // Skip unreadable files
    }
  }
  return contents.join('\n\n');
}

// Build freshness indicator
function freshnessIndicator(count, refreshInterval, refreshed = false) {
  const suffix = refreshed ? ' (refreshed)' : '';
  return `📍 Context: ${count}/${refreshInterval}${suffix}`;
}

/**
 * Build context content for injection
 * @param {string} cwd - Current working directory
 * @param {Object} cfg - Configuration
 * @param {string} reason - Reason for refresh (e.g., "session start", "periodic")
 * @returns {string} - Context content to inject
 */
function buildContextContent(cwd, cfg, reason) {
  const contextParts = [];
  const contextFiles = findContextFiles(cwd, cfg.contextDir);

  if (contextFiles.length > 0) {
    const contextContent = readContextFiles(contextFiles);
    contextParts.push(`\n---\n**Context Refresh** (${reason})\n` + contextContent);
  } else {
    const claudeMd = readClaudeMd(cwd, cfg.claudeMd);
    if (claudeMd) {
      contextParts.push(`\n---\n**Context Refresh** (${reason}, from CLAUDE.md)\n` + claudeMd);
      contextParts.push('\n⚠️ **Tip**: Multi-file context is supported in `.claude/context/`. Create `*.yml` files for modular context management.');
    } else {
      contextParts.push('\n⚠️ No context files found. Create `.claude/context/*.yml` or `CLAUDE.md` for context refresh.');
    }
  }

  return contextParts.join('\n');
}

/**
 * Process SessionStart hook - inject context immediately
 * @param {Object} input - Hook input from stdin
 * @param {Object} config - Configuration overrides
 * @returns {Object} - Hook output for stdout
 */
function processSessionStart(input, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cwd = input.cwd || process.cwd();
  const source = input.source || 'startup';

  // Reset counter on session start
  const state = { count: 0 };
  saveState(cfg.stateFile, state);

  // Build output
  const contextParts = [];

  // Freshness indicator shows reset state
  contextParts.push(freshnessIndicator(0, cfg.refreshInterval, true));

  // Always inject context on session start
  const reason = `session ${source}`;
  contextParts.push(buildContextContent(cwd, cfg, reason));

  return {
    systemMessage: freshnessIndicator(0, cfg.refreshInterval, true),
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: contextParts.join('\n')
    }
  };
}

/**
 * Process UserPromptSubmit hook - track count, refresh periodically
 * @param {Object} input - Hook input from stdin
 * @param {Object} config - Configuration overrides
 * @returns {Object} - Hook output for stdout
 */
function processUserPromptSubmit(input, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cwd = input.cwd || process.cwd();

  // Load and increment state
  const state = loadState(cfg.stateFile);
  state.count = (state.count + 1) % cfg.refreshInterval;
  const shouldRefresh = state.count === 0;

  // Build output
  const contextParts = [];

  // Always add freshness indicator
  contextParts.push(freshnessIndicator(state.count, cfg.refreshInterval, shouldRefresh));

  // On refresh, inject context
  if (shouldRefresh) {
    contextParts.push(buildContextContent(cwd, cfg, 'periodic'));
  }

  // Save updated state
  saveState(cfg.stateFile, state);

  return {
    systemMessage: freshnessIndicator(state.count, cfg.refreshInterval, shouldRefresh),
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: contextParts.join('\n')
    }
  };
}

/**
 * Core hook logic - routes to appropriate handler based on event type
 * @param {Object} input - Hook input from stdin
 * @param {Object} config - Configuration overrides
 * @returns {Object} - Hook output for stdout
 */
function processHook(input, config = {}) {
  const eventName = input.hook_event_name || 'UserPromptSubmit';

  if (eventName === 'SessionStart') {
    return processSessionStart(input, config);
  }

  return processUserPromptSubmit(input, config);
}

// Main CLI wrapper
async function main() {
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let input;
  try {
    input = JSON.parse(inputData);
  } catch (e) {
    process.exit(0);
  }

  const output = processHook(input);
  console.log(JSON.stringify(output));
  process.exit(0);
}

// Export for testing
module.exports = {
  processHook,
  processSessionStart,
  processUserPromptSubmit,
  buildContextContent,
  loadState,
  saveState,
  findContextFiles,
  readClaudeMd,
  readContextFiles,
  freshnessIndicator,
  DEFAULT_CONFIG
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
