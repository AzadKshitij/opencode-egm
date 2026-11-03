---
license: Apache-2.0
---

# OpenCode integration

This document is the OpenCode-specific companion to the EGM skills and personas
vendored by `opencode-egm`.

## Bundle layout

`opencode-egm` vendors the complete EGM pack under its package directory:

- `assets/egm/skills/<skill>/SKILL.md`
- `assets/egm/agents/<persona>.md`
- `assets/egm/resources/document_standards/*.md`
- `assets/egm/docs/*.md`

Every path referenced by a skill or persona is rewritten to an absolute path
against this bundle root. Do not substitute similarly named files from the
user's project.

## Tools

OpenCode V2 exposes these tools instead of the harness-specific names used by
EGM:

| EGM reference | OpenCode tool |
| --- | --- |
| `ask_question` | `question` |
| `invoke_subagent` / `Agent` / `spawn_agent` | `task` |
| `Skill` | load the skill's `SKILL.md` (attached by commands) |
| filesystem tools | `read`, `grep`, `glob`, `write`, `edit`, `bash` |

Skills are attached to `/egm-*` commands automatically. If a skill is not attached
for any reason, read its `SKILL.md` at the absolute path under the bundle root.

## Subagents

By default OpenCode limits subagent nesting to depth 1, meaning a subagent
cannot spawn further subagents. To enable the EGM orchestration pattern
(synthesizer and bootstrap orchestrator spawning their own reviewers/scouts),
set this in your `opencode.jsonc`:

```jsonc
{
  "experimental": {
    "subagent_depth": 2
  }
}
```

With that set, spawn each Goldfish with `task` and `subagent_type` set to a
persona registered by this plugin. Without it, only the primary agent can
spawn, and the synthesizer/bootstrap orchestrator fall back to direct
dispatch or inline work.

```
task({ subagent_type: "egm-zoom-out", prompt: ... })
```

Registered persona types:

- `egm-zoom-out`
- `egm-design`
- `egm-comprehension`
- `egm-implementation-readiness`
- `egm-codebase-details`
- `egm-structural`
- `egm-style`
- `egm-synthesizer` (aggregator only)
- `egm-bootstrap-orchestrator`
- `egm-goldfish-explorer` (read-only scout)

If a named type is rejected, call `task` with `subagent_type: "general"` and
tell the child to read the absolute persona path under the plugin's `agents/`
directory first.

A `task` call starts a fresh child session. Pass only the task, target, line
range, standards, and explicitly selected context. Never paste the parent
conversation or reasoning.

The `egm-synthesizer` can spawn reviewers itself (it has `subagent`
permission) and compile their reports, or you can spawn reviewers first and
pass their reports in its prompt. Either way, it writes the consolidated
artifact.

The `egm-bootstrap-orchestrator` can likewise spawn scouts (it has `subagent`
permission); use it for large trees, or run steps inline for small ones.

## Question gates

Use the `question` tool. Send exactly one question per turn:

- `questions` has one entry.
- `multiple: false` for single-choice gates.
- Action-oriented option labels.
- The `question` call must be the only tool call in that turn.

Translate EGM's `is_multi_select` to `multiple` and turn each string option into
`{ "label": "..." }`. Use the same tool for open-ended input: provide at least
one plausible option and let the user type a path or constraint in the
free-form answer field. The tool blocks until the user answers; continue the
workflow in the same turn after it returns. Do not ask gates in plain chat and
stop.

## Artifacts

Write briefs, drafts, and reports to the user's working directory. If the user's
prompt or `AGENTS.md` contains `EGM artifact directory: <path>`, write there
instead and create the directory. Do not dump large artifacts into chat.

## Isolation caveats

OpenCode `task` starts a fresh child session with no conversation history, but
it does **not** provide filesystem isolation: the working directory is shared
between parent and children. EGM's fresh-context reviewers still receive no
parent reasoning, but they can read files that the parent wrote. This is a
known limitation compared to harnesses that provide true isolation.

OpenCode V2 allows nested `task` calls when a subagent is granted `subagent`
permission. The synthesizer and bootstrap orchestrator have it; reviewer
personas do not, so they stay read-only leaves. The adapter's skills and
personas are written to take advantage of this.

Reviewer personas are registered as read-only subagents and will not modify your
workspace. The synthesizer and bootstrap orchestrator have write access limited
to their documented roles.
