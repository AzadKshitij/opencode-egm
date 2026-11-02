import { Agent } from "@opencode/plugin"
import type { AgentEditor } from "@opencode/plugin/promise/agent"

import { AGENTS, bundlePath, loadAgent } from "./assets.ts"
import { adaptAgentContent } from "./adapt.ts"
import type { AgentSpec } from "./assets.ts"

type Permission = {
  action: string
  resource: string
  effect: "allow" | "deny" | "ask"
}

const READ_TOOLS: readonly Permission[] = [
  { action: "read", resource: "*", effect: "allow" },
  { action: "grep", resource: "*", effect: "allow" },
  { action: "glob", resource: "*", effect: "allow" },
  { action: "list", resource: "*", effect: "allow" },
]

const NESTABLE_AGENTS = [
  "egm-zoom-out",
  "egm-design",
  "egm-comprehension",
  "egm-implementation-readiness",
  "egm-codebase-details",
  "egm-structural",
  "egm-style",
  "egm-synthesizer",
  "egm-bootstrap-orchestrator",
  "egm-goldfish-explorer",
]

function permissionsFor(role: AgentSpec["role"]): Permission[] {
  const rules: Permission[] = [{ action: "*", resource: "*", effect: "deny" }, ...READ_TOOLS]

  if (role === "synthesizer" || role === "bootstrap") {
    // Allow nested subagent spawning (OpenCode V2: "subagent" action, not "task").
    rules.push({ action: "subagent", resource: "*", effect: "deny" })
    for (const target of NESTABLE_AGENTS) {
      rules.push({ action: "subagent", resource: target, effect: "allow" })
    }
  }

  if (role === "synthesizer") {
    rules.push(
      { action: "write", resource: "*", effect: "allow" },
      { action: "edit", resource: "*", effect: "allow" },
    )
  }

  if (role === "bootstrap") {
    rules.push(
      { action: "write", resource: "*", effect: "allow" },
      { action: "edit", resource: "*", effect: "allow" },
      { action: "bash", resource: "*", effect: "allow" },
    )
  }

  return rules
}

export function registerAgents(editor: AgentEditor, root: string): void {
  for (const spec of AGENTS) {
    const agent = loadAgent(root, spec)
    const system = adaptAgentContent(spec, agent.body, root)

    editor.update(spec.id, (draft) => {
      draft.name = Agent.Name.make(spec.title)
      draft.description = agent.description
      draft.system = system
      draft.mode = "subagent"
      draft.hidden = false
      draft.permissions = permissionsFor(spec.role)
    })
  }
}

export function registeredAgentPaths(root: string): string[] {
  return AGENTS.map((spec) => bundlePath(root, "agents", spec.file))
}
