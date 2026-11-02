import type { CommandEditor } from "@opencode/plugin/promise/command"

import { SKILLS, bundlePath } from "./assets.ts"

interface CommandSpec {
  name: string
  skill: string
  description: string
}

const COMMANDS: readonly CommandSpec[] = [
  {
    name: "egm-brainstorm",
    skill: "egm-brainstorm",
    description: "Turn a rough idea into a reviewed concepts brief with EGM Goldfish lenses.",
  },
  {
    name: "egm-draft",
    skill: "egm-draft",
    description: "Draft a design document section by section, with approval gates.",
  },
  {
    name: "egm-review",
    skill: "egm-review",
    description: "Run the full EGM Goldfish review protocol on a design document.",
  },
  {
    name: "egm-review-loop",
    skill: "egm-review-loop",
    description: "Run the antagonistic EGM review loop against a target document range.",
  },
  {
    name: "egm-resolve",
    skill: "egm-resolve",
    description: "Evaluate review findings and apply approved fixes in the main context.",
  },
  {
    name: "egm-bootstrap",
    skill: "egm-bootstrap",
    description: "Bootstrap EGM-compliant README contracts across a repository subtree.",
  },
  {
    name: "egm-drift-report",
    skill: "egm-drift-report",
    description: "Detect drift between design documents or READMEs and the current code.",
  },
]

interface PromptSender {
  prompt(input: {
    sessionID: string
    text: string
    skills?: ReadonlyArray<{ id: string }>
    delivery?: "steer" | "queue" | null
  }): Promise<unknown>
}

export function registerCommands(editor: CommandEditor, ctx: { session: PromptSender }, root: string): void {
  for (const spec of COMMANDS) {
    const skillPath = bundlePath(root, "skills", spec.skill, "SKILL.md")

    editor.add({
      name: spec.name,
      description: spec.description,
      async execute(input) {
        const argumentsText = input.prompt.text.trim()
        const text = [
          `The user ran /${spec.name} with these arguments:`,
          "",
          argumentsText.length > 0 ? argumentsText : "(no arguments supplied)",
          "",
          `The \`${spec.skill}\` skill is attached to this message (id: \`${spec.skill}\`).`,
          `Follow it exactly. If the attachment did not load, read \`${skillPath}\` and`,
          "follow that file.",
          "",
          "Keep the EGM gates: one question at a time, artifact-first delivery, and",
          "fresh-context reviewers dispatched through the `task` tool.",
        ].join("\n")

        await ctx.session.prompt({
          sessionID: input.sessionID,
          text,
          skills: [{ id: spec.skill }],
          delivery: input.delivery,
        })
      },
    })
  }

}

export function registeredCommandNames(): string[] {
  return COMMANDS.map((command) => command.name)
}

export function registeredSkillNames(): string[] {
  return SKILLS.map((skill) => skill.id)
}
