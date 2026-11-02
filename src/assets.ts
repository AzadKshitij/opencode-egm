import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const moduleDirectory = dirname(fileURLToPath(import.meta.url))

/**
 * Locate the vendored EGM bundle. The package layout is:
 *   package.json
 *   src/...
 *   assets/egm/{skills,agents,resources,docs}
 *
 * Walking up keeps this working when the plugin is loaded from a package
 * directory, a linked checkout, or a temporary local plugin directory.
 */
export function findEgmRoot(start: string = moduleDirectory): string {
  let directory = resolve(start)

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(directory, "assets", "egm")
    if (existsSync(join(candidate, "skills"))) return candidate

    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }

  throw new Error(
    "opencode-egm: cannot find assets/egm. Reinstall the package so its assets directory is present.",
  )
}

export function toPosix(path: string): string {
  return path.replaceAll("\\", "/")
}

export function bundlePath(root: string, ...parts: string[]): string {
  return toPosix(join(root, ...parts))
}

export function readText(path: string): string {
  return readFileSync(path, "utf8")
}

export interface Frontmatter {
  attributes: Record<string, string>
  body: string
}

/**
 * Parse the small YAML frontmatter subset used by EGM. We only need scalar
 * values and folded/literal blocks such as `description: >-`.
 */
export function parseFrontmatter(markdown: string): Frontmatter {
  const normalized = markdown.replace(/^\uFEFF/, "")
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(normalized)
  if (!match) return { attributes: {}, body: normalized }

  const attributes: Record<string, string> = {}
  const lines = match[1].split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) continue
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue

    const keyMatch = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line)
    if (!keyMatch) continue

    const key = keyMatch[1]!
    const rawValue = (keyMatch[2] ?? "").trim()

    if (/^[>|][+-]?$/.test(rawValue)) {
      const folded = rawValue.startsWith(">")
      const block: string[] = []

      while (index + 1 < lines.length) {
        const next = lines[index + 1]!
        if (next.trim() === "") {
          block.push("")
          index += 1
          continue
        }
        if (!/^\s+/.test(next)) break
        block.push(next.replace(/^\s+/, ""))
        index += 1
      }

      attributes[key] = folded
        ? block.join(" ").replace(/\s+/g, " ").trim()
        : block.join("\n").trim()
      continue
    }

    attributes[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2")
  }

  return { attributes, body: normalized.slice(match[0].length) }
}

export interface SkillSpec {
  id: string
  directory: string
}

export interface AgentSpec {
  id: string
  file: string
  title: string
  role: "reviewer" | "synthesizer" | "bootstrap" | "explorer"
}

export const SKILLS: readonly SkillSpec[] = [
  { id: "egm-brainstorm", directory: "egm-brainstorm" },
  { id: "egm-draft", directory: "egm-draft" },
  { id: "egm-review", directory: "egm-review" },
  { id: "egm-review-loop", directory: "egm-review-loop" },
  { id: "egm-resolve", directory: "egm-resolve" },
  { id: "egm-bootstrap", directory: "egm-bootstrap" },
  { id: "egm-drift-report", directory: "egm-drift-report" },
]

export const AGENTS: readonly AgentSpec[] = [
  { id: "egm-zoom-out", file: "zoom_out.md", title: "EGM Zoom Out", role: "reviewer" },
  {
    id: "egm-comprehension",
    file: "comprehension.md",
    title: "EGM Comprehension",
    role: "reviewer",
  },
  { id: "egm-design", file: "design_critic.md", title: "EGM Design Critic", role: "reviewer" },
  { id: "egm-structural", file: "structural.md", title: "EGM Structural", role: "reviewer" },
  { id: "egm-style", file: "style.md", title: "EGM Style", role: "reviewer" },
  {
    id: "egm-implementation-readiness",
    file: "implementation_readiness.md",
    title: "EGM Implementation Readiness",
    role: "reviewer",
  },
  {
    id: "egm-codebase-details",
    file: "codebase_details.md",
    title: "EGM Codebase Details",
    role: "reviewer",
  },
  {
    id: "egm-synthesizer",
    file: "synthesizer.md",
    title: "EGM Synthesizer",
    role: "synthesizer",
  },
  {
    id: "egm-bootstrap-orchestrator",
    file: "bootstrap_orchestrator.md",
    title: "EGM Bootstrap Orchestrator",
    role: "bootstrap",
  },
  {
    id: "egm-goldfish-explorer",
    file: "goldfish_explorer.md",
    title: "EGM Goldfish Explorer",
    role: "explorer",
  },
]

export interface LoadedSkill {
  id: string
  path: string
  description: string
  body: string
}

export function loadSkill(root: string, spec: SkillSpec): LoadedSkill {
  const path = bundlePath(root, "skills", spec.directory, "SKILL.md")
  const raw = readText(path)
  const { attributes, body } = parseFrontmatter(raw)

  return {
    id: spec.id,
    path,
    description: attributes.description || `EGM ${spec.id} skill.`,
    body,
  }
}

export interface LoadedAgent {
  id: string
  path: string
  description: string
  body: string
}

export function loadAgent(root: string, spec: AgentSpec): LoadedAgent {
  const path = bundlePath(root, "agents", spec.file)
  const raw = readText(path)
  const { attributes, body } = parseFrontmatter(raw)

  return {
    id: spec.id,
    path,
    description: attributes.description || spec.title,
    body,
  }
}
