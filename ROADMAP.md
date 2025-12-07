# claude-mantra Roadmap

## Current State (v0.1.0)

- SessionStart hook: inject context on session start/resume/clear/compact
- UserPromptSubmit hook: show freshness indicator, periodic refresh every N interactions
- Multi-file context from `.claude/context/*.yml`
- CLAUDE.md fallback

## Near Term

### Token-Based Refresh Trigger
Replace interaction count with token-based threshold for more accurate drift detection.

**Why:** Context drift correlates with token usage, not prompt count. 50 short prompts vs 50 long prompts have vastly different context pressure.

**Approach options:**
1. Estimate tokens from transcript file (hook receives `transcript_path`)
2. Track cumulative prompt/response size
3. Use heuristic (avg tokens per interaction × count)

**Considerations:**
- Hook doesn't receive token count directly
- Need to balance accuracy vs complexity
- User visibility: "Context: 45k/100k tokens" vs "12/50 prompts"

### Configurable Refresh Settings
Read configuration from `.claude/config.json` instead of hardcoded defaults:
- Refresh interval (interactions or tokens)
- Context file patterns
- Freshness indicator format

### On-Demand Refresh
Trigger refresh via keyword in prompt (e.g., "refresh context") without waiting for interval.

## Medium Term

### Convention-Based Plugin Discovery
Enable plugins to discover and integrate with each other through file conventions:

```
.claude/
├── context/        # mantra reads *.yml
├── sessions/       # session-recorder writes current.md
│   └── current.md  # mantra could also read this if present
└── plugins/
    └── manifest.json  # declares installed plugins
```

Plugins don't need explicit knowledge of each other - integration happens through shared locations.

### Context Priority System
- Some files always refresh (high priority)
- Some files only refresh when stale (normal)
- Some files refresh on-demand only (low priority)

### Freshness Decay Visualization
Visual indicator that changes as staleness increases:
- Fresh: `🟢 Context: 5/50`
- Aging: `🟡 Context: 35/50`
- Stale: `🔴 Context: 48/50`

## Long Term

### claude-domestique Orchestrator
Make [claude-domestique](https://github.com/flexion/claude-domestique) a plugin orchestrator that coordinates multiple plugins:

**Plugin examples:**
- `claude-mantra` - context refresh (this project)
- `claude-session` - session recording to source control
- `claude-guard` - behavior guardrails
- `claude-workflow` - git/PR conventions

**Orchestration benefits:**
- Plugins work standalone but gain enhanced behavior together
- Shared context protocol - plugins can register context sources
- Coordinated refresh - session recorder writes, mantra reads
- Single settings file for all plugins

**Architecture options:**
1. **Convention-based** (simplest) - plugins follow file conventions
2. **Shared manifest** - `.claude/plugins.json` declares capabilities
3. **Orchestrator hook** - meta-hook loads and coordinates plugin modules

### Context Summarization
Option to inject condensed summaries instead of full files to reduce token overhead while maintaining guidance.
