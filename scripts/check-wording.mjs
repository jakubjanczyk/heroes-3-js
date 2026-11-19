import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const RULES = [
  {
    pattern: /vcmi/i,
    appliesTo: (file) =>
      !file.startsWith('.claude/') &&
      !file.startsWith('.codex/') &&
      file !== 'AGENTS.md' &&
      file !== 'scripts/check-wording.mjs',
    why: 'Never mention VCMI in code, tests or docs: describe the rule itself (AGENTS.md).'
  },
  {
    pattern: /heroes\s*(3|iii)\b/i,
    appliesTo: (file) => /\.(js|mjs|css|html)$/.test(file) && file !== 'scripts/check-wording.mjs',
    allowed: (line) => line.includes('<title>Heroes 3 JS</title>'),
    why: 'This is a Heroes 3 game: drop "as in Heroes 3" and "the Heroes 3 <thing>", state the rule itself (AGENTS.md).'
  }
]

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
const problems = []

for (const file of files) {
  const rules = RULES.filter((rule) => rule.appliesTo(file))
  if (rules.length === 0) {
    continue
  }

  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.pattern.test(line) && !rule.allowed?.(line)) {
        problems.push(`${file}:${index + 1}: ${rule.why}\n  ${line.trim()}`)
      }
    }
  })
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
