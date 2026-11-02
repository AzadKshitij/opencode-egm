import { Skill } from "@opencode/plugin"
import type { SkillEditor } from "@opencode/plugin/promise/skill"

import { SKILLS, bundlePath, loadSkill } from "./assets.ts"
import { adaptSkillContent } from "./adapt.ts"

export function registerSkills(editor: SkillEditor, root: string): void {
  for (const spec of SKILLS) {
    const skill = loadSkill(root, spec)
    const content = adaptSkillContent(spec.id, skill.body, root)

    editor.add({
      id: Skill.ID.make(spec.id),
      name: Skill.Name.make(spec.id),
      description: skill.description,
      autoinvoke: false,
      path: bundlePath(root, "skills", spec.directory, "SKILL.md") as never,
      content,
    })
  }
}
