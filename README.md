# mcps

The CLI for the open agent MCP ecosystem.

Supports **Claude Code**, **Codex**, **Cursor**, **OpenCode**, **VS Code**, **Grok Build** and [16 more](#supported-agents).

Docs and registry: [newtondotcom.github.io/mcps](https://newtondotcom.github.io/mcps)

## Install an MCP Server

Install an MCP server by remote URL or package name:

```bash
npx mcps url | package name [options]
```

Example installing the Context7 remote MCP server:

```bash
npx mcps https://mcp.context7.com/mcp
```

Example installing the Context7 remote MCP server via the programmatic API — great for integrating mcps in your own CLI tool:

```ts
import { upsertServer } from "mcps";

const result = upsertServer(
  "cursor",
  "context7",
  { type: "http", url: "https://mcp.context7.com/mcp" },
  { local: true },
);
console.log(result);
```

You can add env variables and arguments (stdio) and headers (remote) to the server config using the `--env`, `--args` and `--header` options. With `${VAR}` placeholders, interactive installs prompt for each variable (omit skipped optional keys so empty strings are not written to config).

## Find MCP Servers

Find and install MCP servers from the [mcps registry](https://newtondotcom.github.io/mcps/registry):

```bash
npx mcps find vercel
```

The first `find`/`search` run automatically saves the mcps registry to `~/.config/mcps/config.json` (or `$XDG_CONFIG_HOME/mcps/config.json`). You can edit that file to replace the default registry, add the official Anthropic registry, or point at any registry-compatible server. Pass `--registry <url>` to search a different registry for one command without changing that file.

## Supported Agents

MCP servers can be installed to any of these agents:

| Agent                  | `--agent`            | Project Path                                                                  | Global Path                                                                                                     |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Antigravity            | `antigravity`        | -                                                                             | `~/.gemini/config/mcp_config.json` (shared by Antigravity, Antigravity IDE, and Antigravity CLI)                |
| Cline VSCode Extension | `cline`              | -                                                                             | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| Cline CLI              | `cline-cli`          | -                                                                             | `~/.cline/data/settings/cline_mcp_settings.json`                                                                |
| Claude Code            | `claude-code`        | `.mcp.json`                                                                   | `~/.claude.json`                                                                                                |
| Claude Desktop         | `claude-desktop`     | -                                                                             | `~/Library/Application Support/Claude/claude_desktop_config.json`                                               |
| Codex                  | `codex`              | `.codex/config.toml`                                                          | `~/.codex/config.toml`                                                                                          |
| Cursor                 | `cursor`             | `.cursor/mcp.json`                                                            | `~/.cursor/mcp.json`                                                                                            |
| fx                     | `fx`                 | -                                                                             | `~/.fx/mcp.json`                                                                                                |
| Gemini CLI             | `gemini-cli`         | `.gemini/settings.json`                                                       | `~/.gemini/settings.json`                                                                                       |
| Goose                  | `goose`              | `.goose/config.yaml`                                                          | `~/.config/goose/config.yaml`                                                                                   |
| GitHub Copilot CLI     | `github-copilot-cli` | `.mcp.json` (or existing `.github/mcp.json`)                                  | `$COPILOT_HOME/mcp-config.json` (defaults to `~/.copilot/mcp-config.json`)                                      |
| Grok Build             | `grok-build`         | `.grok/config.toml`                                                           | `$GROK_HOME/config.toml` (defaults to `~/.grok/config.toml`)                                                    |
| Kilo Code              | `kilo-code`          | `kilo.json` (or existing `.kilo/`, `.kilocode/`, or root `kilo.jsonc` config) | `~/.config/kilo/kilo.json` (or existing `~/.config/kilo/kilo.jsonc`)                                            |
| Kimi Code              | `kimi-code`          | `.kimi-code/mcp.json`                                                         | `$KIMI_CODE_HOME/mcp.json` (defaults to `~/.kimi-code/mcp.json`)                                                |
| Kiro CLI               | `kiro-cli`           | `.kiro/settings/mcp.json`                                                     | `~/.kiro/settings/mcp.json` (shared with the Kiro IDE)                                                          |
| Mastra Code            | `mastracode`         | `.mastracode/mcp.json`                                                        | `~/.mastracode/mcp.json`                                                                                        |
| MCPorter               | `mcporter`           | `config/mcporter.json`                                                        | `~/.mcporter/mcporter.json` (or existing `~/.mcporter/mcporter.jsonc`)                                          |
| OpenCode               | `opencode`           | `opencode.jsonc` (or existing `opencode.json` / `.opencode/` config)          | `~/.config/opencode/opencode.jsonc` (or existing `opencode.json`)                                               |
| Pi                     | `pi`                 | `.pi/mcp.json`                                                                | `$PI_CODING_AGENT_DIR/mcp.json` (defaults to `~/.pi/agent/mcp.json`)                                            |
| VS Code                | `vscode`             | `.vscode/mcp.json`                                                            | `~/Library/Application Support/Code/User/mcp.json`                                                              |
| Windsurf               | `windsurf`           | -                                                                             | `~/.codeium/windsurf/mcp_config.json`                                                                           |
| Zed                    | `zed`                | `.zed/settings.json`                                                          | `~/Library/Application Support/Zed/settings.json`                                                               |

**Aliases:** `codeium`, `cascade` → `windsurf`, `cline-vscode` → `cline`, `gemini` → `gemini-cli`, `github-copilot` → `vscode`, `grok` → `grok-build`, `kilo`, `kilocode` → `kilo-code`, `kimi` → `kimi-code`, `kiro` → `kiro-cli`, `mastra` → `mastracode`, `pi-agent` → `pi`

Mastra Code also reads project `.mcp.json` for Claude Code compatibility. mcps writes `.mastracode/mcp.json` so a mixed Claude + Mastra install does not share that file.

Pi has no built-in MCP. mcps writes the Pi-owned files [`pi-mcp-adapter`](https://github.com/nicobailon/pi-mcp-adapter) reads (`pi install npm:pi-mcp-adapter`). A running Pi session picks the change up after `/reload`.

Kimi Code only loads a project-level `.kimi-code/mcp.json` after you trust the folder in the CLI, so a project install may not take effect until then.

fx reads MCP servers only from `~/.fx/mcp.json`. A project file cannot add a server. A running session applies the change with `/mcp reload`.

OpenCode keeps the shape already in the file: `mcp.<name>` on a V1 or empty config, `mcp.servers.<name>` when that native map is already there. In a mixed file, a native entry wins over a legacy entry with the same name. Adding a new name to a mixed file still writes V1; renaming a server keeps it in the map it already uses.

GitHub Copilot CLI project installs write `.mcp.json`. If `.mcp.json` is absent, an existing `.github/mcp.json` is reused. Copilot CLI does not read `.vscode/mcp.json` (that path is the VS Code agent). Entries left in `.vscode/mcp.json` from older Copilot CLI installs stay there for VS Code; rerun with `--agent github-copilot-cli` to write the CLI path. `.mcp.json` is shared with Claude Code: removing a server from either agent removes it for both. mcps will not create `.mcp.json` when `.github/mcp.json` already exists, because Copilot CLI would then ignore the GitHub file. Merge those servers into `.mcp.json` under `mcpServers` first. Copilot writes replace the file with strict JSON, so comments in that file are dropped (including global `~/.copilot/mcp-config.json`). Copilot CLI loads a project file only after the folder is trusted; confirm with `copilot mcp list --json`.

## Installation Scope

| Scope       | Flag      | Location                | Use Case                                      |
| ----------- | --------- | ----------------------- | --------------------------------------------- |
| **Project** | (default) | `.cursor/mcp.json` etc. | Committed with your project, shared with team |
| **Global**  | `-g`      | `~/.cursor/mcp.json`    | Available across all projects                 |

## Smart Detection

The CLI automatically detects agents based on your environment:

**Default (project mode):**

- Detects project-level config files (`.cursor/`, `.vscode/`, `.mcp.json`, etc.)
- Selects detected agents (have project config in the current directory) by default
- Shows detected agents plus all other supported agents for selection

**With `-g` (global mode):**

- Detects all globally-installed agents (including Claude Desktop, Codex, Zed)
- Selects detected agents by default
- Shows detected agents plus all other supported agents for selection

**No agents detected:**

- Interactive mode: Defaults to the last selection and shows all agents for selection
- With `--yes`: Installs to all project-capable agents (project mode) or all global-capable agents (global mode)

## Commands

Besides the implicit add command, `mcps` also supports the following commands:

| Command       | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `find`        | Search MCP registry servers and install a selected match     |
| `search`      | Alias for `find`                                             |
| `list`        | List installed MCP servers across detected agents            |
| `remove`      | Remove an MCP server from agent configurations               |
| `sync`        | Synchronize server names and installations across agents     |
| `unify`       | Alias for `sync`                                             |
| `list-agents` | List all supported coding agents with scope (project/global) |

## Add Command

### Usage Examples

```bash
# Remote MCP server (streamable HTTP)
npx mcps https://mcp.example.com/mcp

# Remote MCP server (SSE transport)
npx mcps https://mcp.example.com/sse --transport sse

# Remote MCP server with auth header
npx mcps https://mcp.example.com/mcp --header "Authorization: Bearer $TOKEN"

# Remote server; fx reads the bearer token from this env var
npx mcps https://mcp.example.com/mcp --bearer-token-env NEON_API_KEY

# Remote server with a request timeout and OAuth scopes
# (each agent only keeps the fields it supports; others are dropped with a warning)
npx mcps https://mcp.example.com/mcp --timeout 30000 --scopes "read,write"

# Auto-approve all tools for agents that support it (Codex, Claude Code)
npx mcps "executor mcp" --name executor -a codex -a claude-code --auto-approve

# Auto-approve only selected tools
npx mcps "executor mcp" --name executor -a codex --auto-approve --approve-tool execute

# npm package (runs via npx)
npx mcps @modelcontextprotocol/server-postgres

# Non-interactive installation to all detected agents in the project directory
npx mcps https://mcp.example.com/mcp -y

# Non-interactive installation to the global Claude Code config
npx mcps https://mcp.example.com/mcp -g -a claude-code -y

# Full command with arguments
npx mcps "npx -y @org/mcp-server --flag value"

# Node.js script
npx mcps "node /path/to/server.js --port 3000"

# Local stdio server with environment variables (repeatable)
npx mcps @modelcontextprotocol/server-filesystem --env "API_KEY=secret" --env "DATABASE_URL=postgres://localhost/app"

# Install for Cursor and Claude Code
npx mcps https://mcp.example.com/mcp -a cursor -a claude-code

# Install with custom server name
npx mcps @modelcontextprotocol/server-postgres --name postgres

# Install to all supported agents
npx mcps mcp-server-github --all

# Install to all agents, globally, without prompts
npx mcps mcp-server-github --all -g -y

# Add generated config files to .gitignore
npx mcps https://mcp.example.com/mcp -a cursor -y --gitignore
```

### Options

| Option                      | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `-g, --global`              | Install to user directory instead of project                                 |
| `-a, --agent <agent>`       | Target specific agents (e.g., `cursor`, `claude-code`). Can be repeated.     |
| `-t, --transport <type>`    | Transport type for remote servers: `http` (default), `sse`                   |
| `--type <type>`             | Alias for `--transport`                                                      |
| `-h, --header <header>`     | HTTP header for remote servers (repeatable, `Key: Value`)                    |
| `--bearer-token-env <name>` | Env var whose value fx sends as a bearer token (capability-gated, see below) |
| `--env <env>`               | Env var for local stdio servers (repeatable, `KEY=VALUE`)                    |
| `--timeout <ms>`            | Request timeout (ms) for remote servers (capability-gated, see below)        |
| `--scopes <scopes>`         | OAuth scopes for remote servers, comma-separated (capability-gated)          |
| `--oauth-scopes <scopes>`   | Alias for `--scopes`                                                         |
| `--auto-approve`            | Auto-approve MCP tool calls for supported agents (Codex, Claude Code)        |
| `--approve-tool <tool>`     | Tool to auto-approve with `--auto-approve` (repeatable; defaults to all)     |
| `-n, --name <name>`         | Server name (auto-inferred if not provided)                                  |
| `-y, --yes`                 | Skip all confirmation prompts                                                |
| `--all`                     | Install to all agents                                                        |
| `--gitignore`               | Add generated config files to `.gitignore`                                   |

#### Capability-gated fields (`--timeout`, `--scopes`, `--bearer-token-env`)

Not every MCP client understands every field. `mcps` keeps one canonical
server config and each agent declares which optional fields it supports, mapping
them into that client's native shape:

| Field              | Flag                                | Supported by                                                                        | Mapped to                                                                                                           |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Timeout            | `--timeout`                         | Claude Code, Gemini CLI, Grok Build, Kilo Code, Kimi Code, Kiro CLI, Pi             | `timeout` (milliseconds); Grok Build `tool_timeout_sec` (seconds), Kimi Code `toolTimeoutMs`, Pi `requestTimeoutMs` |
| OAuth scopes       | `--scopes`                          | Cursor, Gemini CLI, Mastra Code                                                     | Cursor `auth.scopes`, Gemini and Mastra Code `oauth.scopes`                                                         |
| Bearer token env   | `--bearer-token-env`                | fx                                                                                  | `bearer_token_env`                                                                                                  |
| Tool auto-approval | `--auto-approve` / `--approve-tool` | Codex, Claude Code                                                                  | Codex approval modes; Claude Code permission allow rules                                                            |

When you target an agent that does not support a field, `mcps` drops it from
that agent's config and prints a warning (e.g. _"request timeout is not
supported by VS Code; dropped from that config."_). Other agents still receive
it. `--timeout`, `--scopes`, and `--bearer-token-env` apply to remote servers
only; `--auto-approve` applies to both remote and local servers.

When `--bearer-token-env` and `--header Authorization` are both set, fx omits
the Authorization header and writes `bearer_token_env`. Other agents keep the
header.

#### Auto-approving tool calls (`--auto-approve`)

`--auto-approve` preconfigures agent-level approval so the agent doesn't prompt
before each MCP tool call — useful for servers that already gate actions
internally. Use `--approve-tool <name>` (repeatable) to approve only specific
tools; without it, all tools are approved.

- **Codex** — writes approval modes into `config.toml`: per-tool
  `tools.<name>.approval_mode = "approve"`, or `default_tools_approval_mode = "approve"` for all tools.
- **Claude Code** — writes permission allow rules to a separate settings file
  (`.claude/settings.local.json` for project installs, `~/.claude/settings.json`
  for global), e.g. `mcp__<server>__<tool>`, or `mcp__<server>` for all tools.
  The MCP server entry itself stays clean.

> Note: Claude Code's all-tools rule (`mcp__<server>`) follows the documented
> format, but a known Claude Code bug ([#34739](https://github.com/anthropics/claude-code/issues/34739))
> can still prompt for non-fully-qualified MCP rules. Listing tools explicitly
> with `--approve-tool` is the most reliable path there.

### Transport Types

`mcps` supports all three transport types: HTTP, SSE, and stdio. Some agents require `type` option to be set to specify the transport type. You can use the `--type` or `--transport` option to specify the transport type:

| Transport | Flag               | Description                                           |
| --------- | ------------------ | ----------------------------------------------------- |
| **HTTP**  | `--transport http` | Streamable HTTP (default)                             |
| **SSE**   | `--transport sse`  | Server-Sent Events (deprecated by MCP but still used) |

Local servers (npm packages, commands) always use **stdio** transport.

Note that most agents like Cursor and opencode do not require the `type` information to be set.

## Find Command

### Usage Examples

```bash
# Search for servers by keyword and choose one interactively
npx mcps find vercel

# Browse servers without a keyword
npx mcps find

# Use search alias (same as find)
npx mcps search notion

# Install a found server globally to a specific agent without prompts
npx mcps find neon -a claude-code -g -y

# Search a different registry for this command only
npx mcps find vercel -a claude-code --registry https://registry.modelcontextprotocol.io/v0.1/servers -g -y

# Install to all agents and add generated project configs to .gitignore
npx mcps find github --all --gitignore
```

### Options

| Option                  | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `-g, --global`          | Install to user directory instead of project                             |
| `-a, --agent <agent>`   | Target specific agents (e.g., `cursor`, `claude-code`). Can be repeated. |
| `-n, --name <name>`     | Server name override (defaults to the selected catalog entry name)       |
| `--registry <url>`      | Search this registry URL instead of the saved registries                 |
| `-y, --yes`             | Skip confirmation prompts                                                |
| `--auto-approve`        | Auto-approve MCP tool calls for supported agents (Codex, Claude Code)    |
| `--approve-tool <tool>` | Tool to auto-approve with `--auto-approve` (repeatable; defaults to all) |
| `--all`                 | Install to all agents                                                    |
| `--gitignore`           | Add generated config files to `.gitignore`                               |

Transport for `find`/`search` is inferred from registry metadata. The CLI prefers HTTP remotes when available and only falls back to SSE when HTTP is not available for the selected install context.

When a server offers both remote and stdio package options, interactive mode lets you choose one (remote is the default). With `-y`, it auto-selects remote.

If a selected remote server defines URL variables or header inputs:

- required values must be provided
- optional values can be skipped with Enter
- with `-y`, placeholders are inserted (for example `<your-header-value-here>`)

### Configuring Registries for Find / Search

The first time you run `find` or `search`, the CLI automatically saves the mcps registry to `~/.config/mcps/config.json` (respects `XDG_CONFIG_HOME`) and reuses that registry on every subsequent search.

`--registry <url>` overrides that selection for a single command. The URL must be an `http` or `https` registry API endpoint. Saved `findRegistries` are not rewritten.

```bash
npx mcps find vercel -a claude-code --registry https://registry.modelcontextprotocol.io/v0.1/servers -g -y
```

### Built-in Registries

| Registry                        | Base URL                                                | Description                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **mcps registry**            | `https://newtondotcom.github.io/mcps/registry/api/v1/servers`           | MCP servers discovered by integrations.sh and exposed through an MCP registry-compatible API, using mcps's checked-in `registry.json` as the source of truth. |
| **Official Anthropic registry** | `https://registry.modelcontextprotocol.io/v0.1/servers` | The community-driven MCP server registry maintained by Anthropic. Contains the broadest catalog of MCP servers.                                                  |

> The mcps registry previously lived at `https://mcp.agent-tooling.dev/api/v1/servers`. That URL keeps working, and saved configs referencing it are migrated to the newtondotcom.github.io/mcps address automatically on the next `find`/`search` run.

### Missing A Server in integrations.sh?

The default mcps registry is generated from [integrations.sh](https://integrations.sh). To be listed in mcps, add your MCP server to integrations.sh. Package-only servers, and remotes integrations.sh dropped that we still want in `find`, go in `registry.overlay.json`.

Maintainers can refresh the checked-in registry snapshot with:

```bash
bun run registry:sync
bun run registry:verify
```

### Editing or Removing Registries

Registry selections are stored in `~/.config/mcps/config.json` under the `findRegistries` key. You can edit this file directly to replace, add, remove, or reorder registries.

Default mcps registry:

```json
{
  "version": 1,
  "findRegistries": [
    {
      "url": "https://newtondotcom.github.io/mcps/registry/api/v1/servers",
      "label": "mcps registry"
    }
  ]
}
```

Replace the default with the official Anthropic registry:

```json
{
  "version": 1,
  "findRegistries": [
    {
      "url": "https://registry.modelcontextprotocol.io/v0.1/servers",
      "label": "Official Anthropic registry"
    }
  ]
}
```

Search both the mcps registry and the official Anthropic registry:

```json
{
  "version": 1,
  "findRegistries": [
    {
      "url": "https://newtondotcom.github.io/mcps/registry/api/v1/servers",
      "label": "mcps registry"
    },
    {
      "url": "https://registry.modelcontextprotocol.io/v0.1/servers",
      "label": "Official Anthropic registry"
    }
  ]
}
```

To reset to the default mcps registry, remove the `findRegistries` key or delete the config file.

### Adding a Custom Registry

Any server that implements the registry API can be added as a custom entry. The CLI sends a `GET` request to the configured `url` with the following query parameters:

| Parameter | Value                                  |
| --------- | -------------------------------------- |
| `search`  | The user's search keyword (lowercased) |
| `version` | `latest`                               |
| `limit`   | `100`                                  |

The endpoint must return JSON in this shape:

```json
{
  "servers": [
    {
      "server": {
        "name": "example-server",
        "description": "An example MCP server",
        "version": "1.0.0",
        "remotes": [
          {
            "type": "streamable-http",
            "url": "https://mcp.example.com/mcp"
          }
        ]
      }
    }
  ]
}
```

To add your own registry, append an entry to `findRegistries` in `~/.config/mcps/config.json`:

```json
{
  "url": "https://my-registry.example.com/api/v1/servers",
  "label": "My custom registry"
}
```

## List Command

List installed MCP servers across detected agents:

```bash
# List servers for all detected agents in the project
npx mcps list

# List global server configs
npx mcps list -g

# List servers for a specific agent (shown even if not detected)
npx mcps list -a cursor
```

| Option                | Description                            |
| --------------------- | -------------------------------------- |
| `-g, --global`        | List global configs instead of project |
| `-a, --agent <agent>` | Filter to specific agent(s)            |

## Remove Command

Remove an MCP server from agent configurations by server name, URL, or package name:

```bash
# Remove by server name (interactive selection by default)
npx mcps remove neon

# Remove all matches without prompting
npx mcps remove neon -y

# Remove by URL
npx mcps remove https://mcp.neon.tech/mcp -y

# Remove from global configs for a specific agent
npx mcps remove neon -g -a cursor -y
```

| Option                | Description                          |
| --------------------- | ------------------------------------ |
| `-g, --global`        | Remove from global configs           |
| `-a, --agent <agent>` | Filter to specific agent(s)          |
| `-y, --yes`           | Remove all matches without prompting |

## Sync Command

Synchronize server names and installations across all detected agents. Servers are grouped by URL or package name, and each group is unified to the shortest server name. Servers with conflicting headers, env, or args across agents are skipped with a warning.

```bash
# Sync project-level configs (interactive confirmation)
npx mcps sync

# Sync without prompting
npx mcps sync -y

# Sync global configs
npx mcps sync -g -y
```

| Option         | Description                            |
| -------------- | -------------------------------------- |
| `-g, --global` | Sync global configs instead of project |
| `-y, --yes`    | Skip confirmation prompts              |

`unify` is an alias for `sync`.

## Programmatic API

```ts
import {
  detectProjectAgents,
  detectGlobalAgents,
  upsertServer,
  removeServer,
  listInstalledServers,
} from "mcps";

const project = detectProjectAgents("/path/to/project");
const global = await detectGlobalAgents();

// Remote server
upsertServer(
  "claude-code",
  "example",
  { type: "http", url: "https://mcp.example.com/api" },
  { local: true, cwd: "/path/to/project" },
);

// Stdio (npm package)
upsertServer("claude-code", "postgres", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-postgres"],
});

const projectServers = await listInstalledServers({
  cwd: "/path/to/project",
});
const globalServers = await listInstalledServers({ global: true });

removeServer("claude-code", "example", {
  local: true,
  cwd: "/path/to/project",
});
```

`upsertServer` and `removeServer` return `{ success, path, error? }` rather than throwing.

## Troubleshooting

### Server not loading

Some agents & editors like Claude Code require a restart to load the new MCP server. Otherwise, like Cursor, require you to navigate to the MCP settings page and toggle the new server as enabled.

fx reads MCP servers only from `~/.fx/mcp.json`. A project file cannot add a server. A running session applies the change with `/mcp reload`.
