import assert from "node:assert/strict"

import { Agent, Skill } from "@opencode/plugin"
import type { AgentEditor } from "@opencode/plugin/promise/agent"
import type { CommandEditor } from "@opencode/plugin/promise/command"
import type { SkillEditor } from "@opencode/plugin/promise/skill"

import { AGENTS, SKILLS, findEgmRoot } from "../src/assets.ts"
import { registerAgents } from "../src/agents.ts"
import { registerCommands } from "../src/commands.ts"
import { registerSkills } from "../src/skills.ts"

const root = findEgmRoot()
assert.ok(root.endsWith("assets/egm") || root.endsWith("assets\\egm"), `unexpected root: ${root}`)

const skills: Skill.Info[] = []
const skillEditor = {
  add(skill: Skill.Info) {
    skills.push(skill)
  },
} as unknown as SkillEditor

registerSkills(skillEditor, root)

assert.equal(skills.length, SKILLS.length)
assert.equal(skills.length, 7)

for (const skill of skills) {
  assert.ok(skill.content.includes("OpenCode V2 adapter"), `${skill.id} missing adapter preamble`)
  assert.ok(skill.content.includes(root.replaceAll("\\", "/")), `${skill.id} missing absolute root`)
  assert.ok(!skill.content.includes("ask_question"), `${skill.id} still references ask_question`)
  assert.ok(!skill.content.includes("${CLAUDE_PLUGIN_ROOT}"), `${skill.id} still has plugin root variable`)
  assert.ok(!skill.content.includes("harness's subagent tool"), `${skill.id} still has harness wording`)
  assert.ok(!skill.content.includes("egm-egm-"), `${skill.id} has a doubled egm prefix`)
  assert.ok(
    skill.content.includes("use the `question` tool for every gate"),
    `${skill.id} missing question-tool gate instruction`,
  )
  assert.ok(!skill.content.includes("or plain chat"), `${skill.id} still offers a plain-chat fallback`)
  assert.ok(!skill.content.includes("and end your turn"), `${skill.id} still ends the turn at a gate`)
}

const brainstormSkill = skills.find((skill) => skill.id === "egm-brainstorm")
assert.ok(brainstormSkill)
assert.ok(
  brainstormSkill.content.includes("Use the `question` tool for each open-ended question"),
  "brainstorm does not route open-ended questions through the question tool",
)
assert.ok(!brainstormSkill.content.includes("directly in chat"), "brainstorm still asks in chat")

const reviewSkill = skills.find((skill) => skill.id === "egm-review")
assert.ok(reviewSkill)
assert.ok(
  reviewSkill.content.includes("Ask for the path with the `question` tool"),
  "review does not route the path prompt through the question tool",
)

const agents: Agent.Info[] = []
const agentEditor = {
  update(id: string, update: (agent: Agent.Info) => void) {
    const draft = Agent.Info.default(Agent.ID.make(id))
    update(draft)
    agents.push(draft)
  },
} as unknown as AgentEditor

registerAgents(agentEditor, root)

assert.equal(agents.length, AGENTS.length)
assert.equal(agents.length, 10)

for (const agent of agents) {
  assert.equal(agent.mode, "subagent", `${agent.id} should be a subagent`)
  assert.equal(agent.hidden, false, `${agent.id} should be visible`)
  assert.ok(agent.system?.includes("OpenCode V2 adapter"), `${agent.id} missing adapter note`)
}

const synthesizer = agents.find((agent) => agent.id === "egm-synthesizer")
assert.ok(synthesizer)
assert.ok(synthesizer.permissions.some((rule) => rule.action === "subagent" && rule.effect === "allow"))
assert.ok(synthesizer.permissions.some((rule) => rule.action === "write" && rule.effect === "allow"))

const reviewer = agents.find((agent) => agent.id === "egm-design")
assert.ok(reviewer)
assert.ok(reviewer.permissions.some((rule) => rule.action === "*" && rule.effect === "deny"))
assert.ok(!reviewer.permissions.some((rule) => rule.action === "write" && rule.effect === "allow"))

const prompts: Array<Record<string, unknown>> = []
const commands: Array<{ name: string; execute: (input: unknown) => Promise<void> }> = []
const commandEditor = {
  add(command: { name: string; execute: (input: unknown) => Promise<void> }) {
    commands.push(command)
  },
} as unknown as CommandEditor

registerCommands(
  commandEditor,
  {
    session: {
      async prompt(input: Record<string, unknown>) {
        prompts.push(input)
      },
    },
  },
  root,
)

assert.equal(commands.length, 7)

const brainstorm = commands.find((command) => command.name === "egm-brainstorm")
assert.ok(brainstorm)
await brainstorm.execute({
  sessionID: "ses_test",
  prompt: { text: "offline-first sync" },
  delivery: "steer",
})

assert.equal(prompts.length, 1)
assert.equal(prompts[0]?.sessionID, "ses_test")
assert.deepEqual(prompts[0]?.skills, [{ id: "egm-brainstorm" }])
assert.ok(String(prompts[0]?.text).includes("offline-first sync"))
assert.ok(String(prompts[0]?.text).includes("Use the `question` tool for every gate"))

console.log(`opencode-egm smoke test passed: ${skills.length} skills, ${agents.length} agents, ${commands.length} commands.`)
