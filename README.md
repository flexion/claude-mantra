# claude-mantra

> I told you. You agreed. You forgot. Repeat.

Periodic context refresh plugin for Claude Code sessions.

Claude is brilliant. Claude is helpful. Claude also has the memory of a goldfish in a context window. You've written the perfect CLAUDE.md. You've carefully documented your project conventions. Claude reads it. Claude agrees. Claude then proceeds to ignore half of it by turn 47.

**claude-mantra** solves this by periodically re-injecting key instruction files into Claude's working context—reinforcing the behavioral guidance before it fades into the abyss of distant tokens.

## Features

- **Session start refresh** - Injects context immediately when sessions start, resume, or reset
- **Freshness indicator** - Shows context staleness on every prompt (`📍 Context: 12/50`)
- **Periodic refresh** - Re-injects context files every N interactions
- **Multi-file context** - Reads from `.claude/context/*.yml` for modular guidance
- **CLAUDE.md fallback** - Works with existing CLAUDE.md if no context directory
- **Lightweight** - Native Claude Code hook, no external dependencies

## Installation

### Add to existing project

```bash
npx degit flexion/claude-mantra/.claude .claude
```

This copies the `.claude/` directory (hooks, settings) into your project.

### Manual installation

1. Copy `.claude/hooks/context-refresh.js` to your project
2. Copy `.claude/settings.json` to your project
3. Restart Claude Code session

## Usage

Once installed, the hook runs automatically:

1. **On session start** - Context is injected immediately (startup, resume, clear, compact)
2. **Every prompt** shows freshness: `📍 Context: 12/50`
3. **Every 50 prompts** triggers periodic refresh
4. **On refresh** you'll see: `📍 Context: 0/50 (refreshed)` followed by your context

### Context Files

Create `.claude/context/*.yml` files with your project guidance:

```
.claude/context/
├── behavior.yml      # AI behavior rules
├── git.yml           # Git conventions
├── project.yml       # Project-specific context
└── testing.yml       # Testing patterns
```

Use compact YAML for token efficiency. See `.claude/context/format-guide.yml` for conventions.

If no `.claude/context/*.yml` files exist, falls back to `CLAUDE.md` with a tip about multi-file support.

## Configuration

Edit `.claude/hooks/context-refresh.js` to customize:

```javascript
const DEFAULT_CONFIG = {
  refreshInterval: 50,        // Prompts between refreshes
  contextDir: '.claude/context',
  claudeMd: 'CLAUDE.md'
};
```

## Development

```bash
npm install
npm test    # Run Jest tests (36 specs)
```

## Why "mantra"?

A mantra is a phrase repeated to focus the mind. Claude's mind wanders. This brings it back.

## License

ISC
