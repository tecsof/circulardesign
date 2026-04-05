# Circular Design Research MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes the Circular Design Research Dataset — the result of 3 years of PhD research — as tools for AI assistants.

## What's Inside

- **229 circular design strategies** organized in a 3-level DfX hierarchy (X1 → X2 → X3), each with rich content: why it matters, how to implement it, usage context, characteristics, and guiding questions
- **129 real-world case studies** demonstrating circular design in practice
- **56 glossary terms** for circular economy terminology

## Tools

| Tool | Description |
|------|-------------|
| `search_strategies` | Search and filter strategies by circular objective, lifecycle phase, loop, applicability, or free text |
| `get_strategy_details` | Get full details for a strategy: metadata + why/how/use/characteristics/questions |
| `search_case_studies` | Search and filter case studies by focus, cycle, business model, or free text |
| `get_case_study` | Get full case study details including markdown body |
| `search_glossary` | Look up circular economy terminology |

## Setup

### Prerequisites

- Node.js >= 18

### Install

```bash
cd mcp-server
npm install
```

### Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "circular-design": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/absolute/path/to/circulardesign/mcp-server"
    }
  }
}
```

### Use with Claude Code

A `.mcp.json` file is included at the project root for auto-discovery. Just open the project in Claude Code and the tools will be available.

Or add manually to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "circular-design": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "mcp-server"
    }
  }
}
```

## Example Queries

Once connected, your AI assistant can:

- *"What circular design strategies apply to electronic products?"* → `search_strategies` with query "electronic"
- *"Show me reuse strategies for the service phase"* → `search_strategies` with x1="Reuse", lifecycle_phase="service"
- *"Tell me about Design for Care"* → `get_strategy_details` with the appropriate slug
- *"Find case studies about refurbishment"* → `search_case_studies` with x1="REFURBISH"
- *"What does 'remanufacturing' mean?"* → `search_glossary` with term "remanufacturing"

## Framework Overview

The Multi-hierarchical Design for X (DfX) framework organizes circular design strategies across three dimensions:

**Hierarchy (X-levels):**
- **X1** — Circular objective: Maintenance → Reuse → Refurbishment → Remanufacturing → Recycle
- **X2** — Strategy group (e.g., "Df Modular Design")
- **X3** — Specific strategy (e.g., "Df Standardization")

**Lifecycle Phases:** Business & Network → Resources & Production → Forward Logistics → Sale → Use & Operation → Service & Maintenance → Reverse Logistics → Recovery

**Loops:** LOOP 1 (first use) → LOOP N (multiple cycles) → LAST LOOP (end-of-life)
