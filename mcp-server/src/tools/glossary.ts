import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GlossaryTerm } from '../data-loader.js';

export function registerGlossaryTools(server: McpServer, glossary: Map<string, GlossaryTerm>) {
  const allTerms = Array.from(glossary.values());

  server.tool(
    'search_glossary',
    `Look up circular economy and circular design terminology.

Searches across 58+ curated glossary terms with definitions. Useful for understanding technical terms related to circular design, product lifecycle, material flows, and design strategies.`,
    {
      term: z.string().describe('Search term — matches against term names and definitions'),
    },
    async ({ term }) => {
      const query = term.toLowerCase();
      const results = allTerms.filter(t => {
        const haystack = `${t.term} ${t.definition}`.toLowerCase();
        return haystack.includes(query);
      });

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No glossary terms found matching "${term}". Try a broader search or different keywords.`,
          }],
        };
      }

      const formatted = results.map(t => ({
        term: t.term,
        definition: t.definition,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${formatted.length} matching terms.\n\n${JSON.stringify(formatted, null, 2)}`,
        }],
      };
    }
  );
}
