import { Plugin } from "@opencode/plugin"

import { findEgmRoot } from "./assets.ts"
import { registerAgents } from "./agents.ts"
import { registerCommands, registeredCommandNames } from "./commands.ts"
import { registerSkills } from "./skills.ts"

export default Plugin.define({
  id: "opencode-egm",
  async setup(ctx) {
    const root = findEgmRoot()

    await ctx.skill.transform((editor) => {
      registerSkills(editor, root)
    })

    await ctx.agent.transform((editor) => {
      registerAgents(editor, root)
    })

    await ctx.command.transform((editor) => {
      registerCommands(editor, ctx, root)
    })

    console.log(
      `[opencode-egm] registered 7 EGM skills, 10 personas, and ${registeredCommandNames().length} commands.`,
    )
  },
})
