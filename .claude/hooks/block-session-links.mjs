import { readFileSync } from 'node:fs'

const SESSION_LINK =
  /Claude-Session:|claude\.ai\/code\/session_|Co-Authored-By: Claude|Generated (with|by) \[?Claude Code/i

const { tool_name: toolName, tool_input: input = {} } = JSON.parse(readFileSync(0, 'utf8'))

const text =
  toolName === 'Bash'
    ? /\bgit\b[^|;&]*\bcommit\b/.test(input.command ?? '') && input.command
    : [input.title, input.body].filter(Boolean).join('\n')

if (text && SESSION_LINK.test(text)) {
  process.stderr.write(
    'Leave out the Claude-Session line, session links and Claude attribution: AGENTS.md forbids them in commits, PRs and GitHub comments. Run it again without them.\n'
  )
  process.exit(2)
}
