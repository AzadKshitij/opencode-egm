import { bundlePath, parseFrontmatter, toPosix } from "./assets.ts"

const PERSONAS = [
  ["egm-zoom-out", "zoom_out.md"],
  ["egm-comprehension", "comprehension.md"],
  ["egm-design", "design_critic.md"],
  ["egm-structural", "structural.md"],
  ["egm-style", "style.md"],
  ["egm-implementation-readiness", "implementation_readiness.md"],
  ["egm-codebase-details", "codebase_details.md"],
  ["egm-synthesizer", "synthesizer.md"],
  ["egm-bootstrap-orchestrator", "bootstrap_orchestrator.md"],
  ["egm-goldfish-explorer", "goldfish_explorer.md"],
] as const

function skillPreamble(root: string, skillDirectory: string): string {
  return [
    "> **OpenCode V2 adapter (`opencode-egm`).** Bundle root: `" + root + "`.",
    ">",
    "> - **Subagents:** spawn each Goldfish with `task` and `subagent_type` set to",
    ">   a persona registered by this plugin: `egm-zoom-out`, `egm-design`,",
    ">   `egm-comprehension`, `egm-implementation-readiness`,",
    ">   `egm-codebase-details`, `egm-structural`, `egm-style`,",
    ">   `egm-synthesizer`, `egm-bootstrap-orchestrator`, or",
    ">   `egm-goldfish-explorer`. If a named type is rejected, use",
    '>   `subagent_type: "general"` and tell the child to read the absolute persona path',
    ">   under `" + root + "/agents/` first. A `task` call starts a fresh child session.",
    ">   Pass only the task, target, line range, standards, and explicitly selected",
    ">   context. Never paste this conversation or the parent's reasoning.",
    ">   OpenCode V2 allows subagents to spawn further subagents when granted",
    ">   `subagent` permission AND `experimental.subagent_depth` > 1: the",
    ">   synthesizer and bootstrap orchestrator have permission. Reviewer",
    ">   personas do not, so they stay read-only leaves.",
    ">   The synthesizer can spawn reviewers itself (it has `subagent` permission)",
    ">   and compile their reports, or you can spawn reviewers first and pass their",
    ">   reports in its prompt. Either way, it writes the consolidated artifact.",
    "> - **Question gates:** use the `question` tool. Send exactly one question",
    ">   (`questions` has one entry), set `multiple: false`, and use action-oriented",
    ">   option labels. The `question` call must be the only tool call in that turn. The",
    ">   JSON blocks below describe the intended interaction; translate",
    '>   `is_multi_select` to `multiple` and turn each string option into `{ "label": "..." }`.',
    ">   For open-ended input (a path, a free-form constraint), ask one plain-text",
    ">   question in chat and stop instead.",
    "> - **Artifacts:** write briefs, drafts, and reports to the user's working directory.",
    ">   If the user's prompt or `AGENTS.md` contains `EGM artifact directory: <path>`,",
    ">   write there instead and create the directory. Do not dump large artifacts into chat.",
    "> - **Tools:** `read`, `grep`, `glob`, `write`, `edit`, `bash`, `task`, `question`.",
    ">   Do not call harness-specific names from other hosts. Use `task` for subagents",
    ">   and `question` for gates.",
    "> - **Paths:** all bundle paths below are absolute. Resolve `references/...` against",
    ">   this skill's directory, `" + skillDirectory + "`.",
  ].join("\n")
}

function delegationBlock(root: string, skillId: string): string {
  const lines = [
    "## Delegation (OpenCode)",
    "",
    "Each Goldfish runs in a fresh child session with no conversation history.",
    "Spawn every reviewer with `task` and `subagent_type` set to a persona",
    "registered by this plugin. OpenCode V2 allows subagents to spawn further",
    "subagents when granted `subagent` permission AND when",
    "`experimental.subagent_depth` is > 1 in `opencode.jsonc`: the synthesizer",
    "and bootstrap orchestrator have permission. Reviewer personas do not.",
    "The persona files are under `" + root + "/agents/`.",
    "",
  ]

  for (const [id, file] of PERSONAS) {
    lines.push("- `" + id + "` (`" + file + "`)")
  }

  lines.push(
    "",
    'If `task` rejects a named type, call `task` with `subagent_type: "general"` and',
    'put the absolute persona path in the prompt: "Read `' +
      root +
      "/agents/<file>.md`",
    "first, then perform the task below.\" Pass the original task prompt verbatim",
    "otherwise.",
    "",
    "Wait for each child to finish. A launched child is not a completed review.",
    "",
    "The `egm-synthesizer` can spawn reviewers itself (it has `subagent`",
    "permission) and compile their reports, or you can spawn reviewers first and",
    "pass their reports in its prompt. Either way, it writes the consolidated",
    "artifact.",
    "",
  )

  if (skillId === "egm-bootstrap") {
    lines.push(
      "The `egm-bootstrap-orchestrator` can spawn scouts itself (it has",
      "`subagent` permission); use it for large trees, or run steps inline for",
      "small ones.",
    )
  } else {
    lines.push(
      "If `task` is unavailable, stop and tell the user that a review in the same",
      "context is not a Goldfish review.",
    )
  }

  return lines.join("\n")
}

const OPENCODE_HARNESS_NOTE = [
  "This skill runs in OpenCode V2 through the `opencode-egm` adapter. Read",
  "[OpenCode integration](" + "{{ROOT}}/docs/opencode.md) when you need the exact",
  "tool mapping. The bundle root is `{{ROOT}}`; all `agents/`, `resources/`, and",
  "`docs/` paths below are absolute.",
].join("\n")

const BOOTSTRAP_SCOUT = [
  "1.  **Scout Registration**: Use the pre-registered read-only",
  "    `egm-goldfish-explorer` subagent. Call `task` with",
  '    `subagent_type: "egm-goldfish-explorer"` and give it the directory to scan.',
  "    It returns the JSON object with `interface`, `invariants`, and",
  "    `side_effects`. If that type is unavailable, use `general` and give it the",
  "    scout instructions from `{{ROOT}}/docs/opencode.md`.",
].join("\n")

function replacePaths(text: string, root: string, skillDirectory: string): string {
  let result = text

  result = result.replaceAll("${CLAUDE_PLUGIN_ROOT}/docs/claude.md", root + "/docs/opencode.md")
  result = result.replaceAll("${CLAUDE_PLUGIN_ROOT}", root)
  result = result.replaceAll("../../docs/codex.md", root + "/docs/opencode.md")
  result = result.replaceAll("../../docs/claude.md", root + "/docs/opencode.md")
  result = result.replaceAll("docs/harnesses.md", root + "/docs/opencode.md")
  result = result.replaceAll("agents/", root + "/agents/")
  result = result.replaceAll("resources/", root + "/resources/")
  result = result.replace(/\(references\//g, "(" + skillDirectory + "/references/")
  result = result.replace(/`references\//g, "`" + skillDirectory + "/references/")

  return result
}

function insertAfterTitle(markdown: string, block: string): string {
  const lines = markdown.split(/\r?\n/)
  const title = lines.findIndex((line) => /^#\s+/.test(line))

  if (title === -1) return block + "\n\n" + markdown

  lines.splice(title + 1, 0, "", block)
  return lines.join("\n")
}

export function adaptSkillContent(skillId: string, raw: string, root: string): string {
  const { body } = parseFrontmatter(raw)
  const skillDirectory = bundlePath(root, "skills", skillId)

  let text = replacePaths(body, root, skillDirectory)

  text = text.replace(
    /When running in Codex or ChatGPT Work[\s\S]*?In Claude Code or Cowork[^\n]*\n/,
    OPENCODE_HARNESS_NOTE + "\n",
  )

  text = text.replace(
    /## Delegation\r?\n[\s\S]*?(?=\r?\n## )/,
    delegationBlock(root, skillId) + "\n",
  )

  text = text.replaceAll("ask_question", "question")
  text = text.replaceAll("your harness's subagent tool", "OpenCode's `task` tool")
  text = text.replaceAll(
    "harness's artifact directory, if it has one",
    "configured EGM artifact directory, if one is set",
  )
  text = text.replace(/(?<!egm-)goldfish-explorer/g, "egm-goldfish-explorer")
  text = text.replace(/\ba egm-goldfish-explorer/g, "an egm-goldfish-explorer")

  if (skillId === "egm-bootstrap") {
    text = text.replace(
      /1\.\s+\*\*Scout Registration\*\*[\s\S]*?(?=2\.\s+\*\*Post-Order Traversal\*\*)/,
      BOOTSTRAP_SCOUT + "\n\n",
    )
  }

  text = text.replaceAll("{{ROOT}}", root)

  return insertAfterTitle(text.trimStart(), skillPreamble(root, skillDirectory)) + "\n"
}

function agentNote(root: string, id: string, role: string): string {
  const lines = [
    "> **OpenCode V2 adapter (`opencode-egm`).** Bundle root: `" + root + "`.",
    "> You are the `" + id + "` subagent. You run in a fresh child session with no",
    "> parent conversation history. Use absolute paths. `read`, `grep`, and `glob`",
    "> are available.",
  ]

  if (role === "reviewer") {
    lines.push(
      "> You are strictly read-only: do not call `write`, `edit`, `bash`, or `task`.",
      "> Do not modify the workspace. Report findings only. If you cannot read your",
      "> persona, target, or a required standard, stop and report the missing file;",
      "> an incomplete read is not a clean review.",
    )
  } else if (role === "synthesizer") {
    lines.push(
      "> You CAN spawn reviewers: this agent has `subagent` permission for all",
      "> EGM personas. Use the `task` tool with `subagent_type` set to a persona id",
      "> and collect their reports. Compile them into the consolidated report and",
      "> `write` it. Do not run `bash` or edit source files. Require a status",
      "> (`completed` or `not run`) for every requested reviewer.",
    )
  } else if (role === "bootstrap") {
    lines.push(
      "> You CAN spawn scouts: this agent has `subagent` permission for EGM",
      "> personas. Use `task` with `subagent_type: \"egm-goldfish-explorer\"` for",
      "> scouts, plus `read`, `grep`, `glob`, `write`, `edit`, and `bash`.",
      "> Keep writes limited to documentation files. Do not commit to version",
      "> control or modify source code.",
    )
  } else {
    lines.push(
      "> You are strictly read-only: do not call `write`, `edit`, `bash`, or `task`.",
      "> Return the JSON object exactly as specified.",
    )
  }

  return lines.join("\n")
}

export function adaptAgentContent(
  spec: { id: string; role: "reviewer" | "synthesizer" | "bootstrap" | "explorer" },
  raw: string,
  root: string,
): string {
  const { body } = parseFrontmatter(raw)
  const text = replacePaths(body, root, root)

  return insertAfterTitle(
    text
      .replaceAll("your harness's subagent tool", "OpenCode's `task` tool")
      .trimStart(),
    agentNote(root, spec.id, spec.role),
  ) + "\n"
}

export function normalizeRoot(root: string): string {
  return toPosix(root)
}
