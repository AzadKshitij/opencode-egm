# opencode-egm

Unofficial OpenCode V2 adapter for Google's
[Elephant-Goldfish Model (EGM)](https://github.com/google/elephant-goldfish-model)
skill pack. It bundles the EGM skills and reviewer personas as a single
self-contained OpenCode plugin, so you can install and use them without a
manual multi-step setup.

This is **not** an officially supported Google product.

## What you get

- **7 skills**: brainstorm, draft, review, review-loop, resolve, bootstrap, and
  drift-report.
- **7 `/egm-*` commands** that attach the matching skill automatically.
- **10 subagents**: nine EGM reviewer and orchestrator personas plus a
  read-only scout.
- **Artifact-first output**: briefs, drafts, and reports are written to files,
  not dumped into chat.
- **Question gates**: one question per turn, as the EGM method requires.

## Requirements

- OpenCode V2 (latest), with a configured model provider.
- Node.js 18+ (only needed to build from source).
- Recommended: allow one level of subagent nesting so the synthesizer and
  bootstrap orchestrator can spawn their own reviewers and scouts. Add this to
  your `opencode.jsonc`:
  ```jsonc
  {
    "experimental": { "subagent_depth": 2 }
  }
  ```
  Without it, everything still runs, but the primary agent does all spawning.

A full EGM review is token-heavy: it spawns several subagents. Use a capable
model and expect the run to take a few minutes.

## Install

### From npm

```sh
opencode plugin add opencode-egm
```

This installs the plugin and adds it to your global OpenCode config. Restart
OpenCode afterward.

### From a local checkout

Add the checkout to your project or global `opencode.jsonc`:

```jsonc
{
  "plugins": ["C:/path/to/opencode-egm"]
}
```

Use an absolute path. Restart OpenCode afterward.

## Verify the install

1. Start OpenCode in any project.
2. Type `/egm-` in the message box. You should see seven commands.
3. Optional: `opencode debug agents --standalone` should list ten `egm-*`
   agents.
4. Run `/egm-brainstorm <a small idea>` to check that the skill responds.

## How to use

### The normal flow

For a new feature or design:

1. `/egm-brainstorm` turns a rough idea into a reviewed `concepts_brief.md`.
2. `/egm-draft` turns the brief into `design_draft.md`, section by section.
3. `/egm-review` sends fresh-context reviewers at the draft and writes
   `goldfish_review_report.md`.
4. `/egm-resolve` classifies each finding, then applies the fixes you approve.

You can start at any step. For example, `/egm-review` works directly on a design
document you already wrote.

### Command reference

| Command | What you pass | What it produces |
| --- | --- | --- |
| `/egm-brainstorm <idea>` | Idea in plain language | `concepts_brief.md` |
| `/egm-draft [context file]` | Brief or notes; defaults to `concepts_brief.md` | `design_draft.md` |
| `/egm-review <file> [step]` | Target design file; optional preset or stage | `goldfish_review_report.md` |
| `/egm-review-loop <file>` | Target plus reviewers and standards; asks for anything missing | `goldfish_review_report.md` |
| `/egm-resolve <file>` | Target plus findings; defaults to `goldfish_review_report.md` | Edits to the target file |
| `/egm-bootstrap <path>` | Directory to document | `README.md` files across the tree |
| `/egm-drift-report <dir>` | Directory of designs or READMEs | `YYYY-MM-DD_DRIFT_REPORT.md` |

Paths are relative to the project you opened in OpenCode.

### `/egm-brainstorm`

```text
/egm-brainstorm Add an offline mode to the mobile app
```

The agent asks open-ended questions, one per turn, until the problem and
boundaries are clear. It does not launch reviewers until you confirm the working
hypothesis. It then runs parallel Goldfish reviews and writes
`concepts_brief.md`.

### `/egm-draft`

```text
/egm-draft concepts_brief.md
```

With no argument it looks for `concepts_brief.md` or `discussion_summary.md`.
It drafts one section at a time and stops at an approval gate after each section.
Review `design_draft.md`, answer the gate, and continue.

### `/egm-review`

```text
/egm-review design_draft.md
```

If you omit the preset, the agent asks which pipeline to run. To skip that gate,
name a preset or stage:

```text
/egm-review design_draft.md feature_spec
/egm-review design_draft.md implementation
/egm-review design_draft.md uninterrupted
/egm-review design_draft.md 7
```

Add baseline context for reviewers as extra paths:

```text
/egm-review design_draft.md feature_spec Context: src/api/, docs/architecture.md
```

Reviewers start in fresh child sessions with no conversation history. The
consolidated result is `goldfish_review_report.md`.

### `/egm-review-loop`

```text
/egm-review-loop design_draft.md
```

The loop asks for the missing inputs: semantic target (`full file` or a
section), reviewers, standards, and a reading list. Full form:

```text
/egm-review-loop TargetFile=design_draft.md SemanticTarget="full file" Reviewers=design_critic,structural Standards=feature-spec-standard GoldfishContext=src/api/
```

It re-reads the target before every iteration, runs the review swarm, and
repeats until the findings stop changing.

### `/egm-resolve`

```text
/egm-resolve design_draft.md
```

Run this in the same session that produced the draft when possible. The agent
reads the findings, marks each as fix, contest, or defer, and asks before
applying changes. Approved fixes are edited directly into the target file.

### `/egm-bootstrap`

```text
/egm-bootstrap src/
```

Writes EGM-compliant `README.md` contract files from the leaves up. To avoid
overwriting human-maintained READMEs, pass an alternate filename:

```text
/egm-bootstrap src/ target_filename=EGM.md
```

The agent writes documentation only. It does not commit or refactor source code.

### `/egm-drift-report`

```text
/egm-drift-report docs/designs
```

Each design document or README is compared with the code it describes. The
report lists only divergences and is saved as `YYYY-MM-DD_DRIFT_REPORT.md`.

### Question gates

Every gate asks one question per turn. Pick an option in the UI or answer in
plain text. For open-ended questions, such as a file path or a constraint,
expect a normal chat question instead of a menu. Answer it and the gate resumes.

### Artifacts

By default, artifacts go to the working directory of the project you opened.
To choose another folder, put this in your prompt or `AGENTS.md`:

```text
EGM artifact directory: docs/egm
```

The agent creates the directory and writes there. Artifacts are never pasted
into chat in full.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/egm-*` commands are missing | Restart OpenCode, then confirm the plugin is listed by `opencode plugin list` or in your `opencode.jsonc`. |
| Commands run but no reviewers appear | Set `experimental.subagent_depth` to `2` and restart. Otherwise only the primary agent can spawn. |
| A subagent type is rejected | The adapter falls back to `subagent_type: "general"` with the persona path. If it still fails, check that the plugin version matches your OpenCode version. |
| Artifacts land in the wrong folder | Set `EGM artifact directory: <path>` in the prompt or `AGENTS.md`. |
| The agent dumps a long draft in chat | Tell it to follow the skill's artifact-first rule and write the file. Re-run the command if needed. |

## Complete documentation

This README covers installation and basic use. For the full EGM workflow,
standards, persona mandates, and advanced configuration, see the original
project:

https://github.com/google/elephant-goldfish-model

OpenCode-specific details are in
[`assets/egm/docs/opencode.md`](assets/egm/docs/opencode.md).

## License

Apache-2.0. Vendored EGM content remains Copyright 2026 Google LLC and is
distributed under Apache-2.0. See `LICENSE` and `NOTICE`.
