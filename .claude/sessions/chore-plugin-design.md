# Session: Plugin Design

## Goal
Design the claude-mantra plugin architecture for periodic context refresh in Claude Code sessions.

## Problem Statement
Claude has the "memory of a goldfish in a context window." Even with well-documented CLAUDE.md files and project conventions, Claude gradually drifts from original guidance as conversations grow. claude-mantra solves this by periodically re-injecting key instruction files into Claude's working context.

## Requirements (from ideas.txt)
- Keep plugin as unobtrusive as possible
- Keep scope as narrow as possible
- JavaScript/Node tooling (cross-platform, Node is Claude Code prerequisite)
- Flexible structures for context files
- Make context freshness apparent with every prompt response (drift detector for user)
- Do not overwhelm working context with reinforcement
- Make refresh fast but obvious
- Dog-food the plugin on this project when mature

## Context Structure
Core pattern: `.claude/context/` folder with:
- `*.yml` files - Abbreviated assertions (compact, machine-optimized)
- `*.md` files - Verbose descriptions, templates, detailed guidance

## Session Log

### 2024-12-07 - Session Created
- Created branch: chore/plugin-design
- Read ideas.txt and context-refresh.md agent spec
- Discussed initial architecture questions with user

**User Responses to Architecture Questions:**

1. **Plugin type (hook vs MCP vs skill)**: Unknown - needs deeper architecture discussion. Must explore how/if we can orchestrate multiple plugins/tools to achieve claude-domestique goals.

2. **Context drift indicator**: Needs design work - how to make freshness apparent with every response.

3. **"Fast but obvious" refresh**: Needs design work - balance between full re-read, cached summaries, or lightweight reminders.

4. **Context structure**: Start with core `.claude/context/` pattern:
   - `*.yml` - abbreviated assertions
   - `*.md` - verbose descriptions/templates

5. **Dog-fooding**: Once plugin is mature enough, use it in this project to keep context fresh.

6. **Relationship to claude-domestique**: Part of architecture discussion - explore orchestration of multiple plugins/tools.

### 2024-12-07 - Project Initialized
- Ran `/init` command to set up project structure
- Created `.claude/config.json` with:
  - Runtime: node
  - Work items: GitHub issues
  - Branch pattern: `issue/feature-<N>/<desc>` | `chore/<desc>`
  - Periodic refresh: enabled (every 50 interactions)
- Created directory structure: `.claude/{branches, sessions, context, templates}`

### 2024-12-07 - Context Files Copied and Adapted
- Copied context files from claude-domestique
- Adapted examples for claude-mantra (hook patterns, context-refresh references)

**Files created in `.claude/context/`:**
- `format-guide.yml` - How to read/write compact YAML
- `behavior.yml` - AI behavior rules (skeptical, evidence-based)
- `assistant-preferences.md` - Detailed implementation protocol
- `git.yml` - Git workflow (no attribution, HEREDOC)
- `git-workflow.md` - Commit/PR examples
- `sessions.yml` - Session management rules
- `session-workflow.md` - Session patterns and templates
- `project.yml` - claude-mantra specific context
- `README.md` - Directory guide

### 2024-12-07 - Architecture Decision: Hook
- Decided on **Hook** as plugin type (not MCP, skill, or agent)
- Rationale: Hooks are lightweight, automatic, native to Claude Code, support `additionalContext` injection
- Hook event: `UserPromptSubmit` - runs before each prompt

### 2024-12-07 - Core Hook Implemented
- Created `.claude/hooks/context-refresh.js`
- Implemented interaction counter with state file (`~/.claude/mantra-state.json`)
- Freshness indicator on every prompt: `📍 Context: N/50`
- On refresh (every 50 interactions):
  - If `.claude/context/*.yml` exists → inject those files
  - Fallback to `CLAUDE.md` + warning about multi-file support
- Configured hook in `.claude/settings.json`
- Tested: indicator works, refresh triggers correctly, fallback works

**Key Design Decisions:**
1. **Hook over MCP/Agent** - Simpler, automatic, no external process
2. **UserPromptSubmit event** - Runs on every prompt, can inject context
3. **Freshness indicator always visible** - User always knows context staleness
4. **YML files only on refresh** - MD files are for human reference, not injection
5. **State in home directory** - Persists across sessions, per-user

## Open Questions
- How to orchestrate multiple plugins/tools for full domestique functionality?
- Should refresh interval be configurable per-project?
- Should there be an on-demand refresh command?

## Todos
- [x] Copy and adapt claude-domestique context files to this project
- [x] Deep architecture discussion: plugin type (hook vs MCP vs skill vs other)
- [x] Design context drift indicator (freshness visibility)
- [x] Design "fast but obvious" refresh mechanism
- [x] Implement core plugin
- [ ] Explore multi-plugin orchestration for claude-domestique goals
- [ ] Dog-food plugin on this project
- [ ] Add configurable refresh interval
- [ ] Add on-demand refresh trigger

## Files Changed
- `.claude/hooks/context-refresh.js` - Main hook implementation
- `.claude/settings.json` - Hook configuration
- `CLAUDE.md` - Project documentation

## Next Steps
1. Start dog-fooding: restart Claude Code session to activate hook
2. Consider configurable refresh interval (read from `.claude/config.json`)
3. Explore on-demand refresh mechanism
