# Local Agent Skill Area

`.agents/skills/` contains installed third-party skills and their lockfile metadata. These skills are helpful references, but they are not the canonical project instruction layer.

## Source Of Truth

- Project rules: `AGENTS.md`
- DesignRail workflow skills: `agents/*.SKILL.md`
- Installed third-party skills: `.agents/skills/*`
- Installed skill lockfile: `skills-lock.json`

Keep DesignRail-specific instructions in `agents/`. Keep vendor or externally installed skills in `.agents/skills/`.
