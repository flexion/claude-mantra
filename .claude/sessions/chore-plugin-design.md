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

## Open Questions
- What plugin type best fits the use case?
- How to orchestrate multiple plugins/tools for full domestique functionality?
- How to surface context freshness to user without overwhelming?
- What's the right refresh trigger (turn count, token threshold, on-demand)?

## Todos
- [ ] Deep architecture discussion: plugin type (hook vs MCP vs skill vs other)
- [ ] Design context drift indicator (freshness visibility)
- [ ] Design "fast but obvious" refresh mechanism
- [ ] Explore multi-plugin orchestration for claude-domestique goals
- [ ] Copy and adapt claude-domestique context files to this project
- [ ] Implement core plugin
- [ ] Dog-food plugin on this project

## Next Steps
1. Architecture discussion to determine plugin type
2. Design context drift indicator
3. Design refresh mechanism
