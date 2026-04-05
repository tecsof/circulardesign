import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadStrategies, loadCaseStudies, loadGlossary } from './data-loader.js';
import { registerStrategyTools } from './tools/strategies.js';
import { registerCaseStudyTools } from './tools/case-studies.js';
import { registerGlossaryTools } from './tools/glossary.js';

// Load all research data into memory
const strategies = loadStrategies();
const caseStudies = loadCaseStudies();
const glossary = loadGlossary();

console.error(`Circular Design MCP Server loaded: ${strategies.size} strategies, ${caseStudies.size} case studies, ${glossary.size} glossary terms`);

// Create MCP server
const server = new McpServer({
  name: 'circular-design-research',
  version: '1.0.0',
});

// Register all tools
registerStrategyTools(server, strategies);
registerCaseStudyTools(server, caseStudies);
registerGlossaryTools(server, glossary);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
