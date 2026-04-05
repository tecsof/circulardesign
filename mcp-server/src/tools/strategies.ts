import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StrategyFull } from '../data-loader.js';
import { PHASE_LABELS } from '../data-loader.js';

export function registerStrategyTools(server: McpServer, strategies: Map<string, StrategyFull>) {
  const allStrategies = Array.from(strategies.values());

  server.tool(
    'search_strategies',
    `Search and filter the circular design strategies database (229 strategies from PhD research).

Strategies are organized in a 3-level hierarchy:
- X1: Circular objective (Maintenance, Reuse, Refurbishment, Remanufacturing, Recycle)
- X2: Strategy group (e.g. "Df Modular Design", "Df Circular Business Model")
- X3: Specific strategy (e.g. "Df Care", "Df Standardization")

Each strategy belongs to a lifecycle phase and one or more loops.
All parameters are optional — omit all to list every strategy.`,
    {
      query: z.string().optional().describe('Free-text search across strategy names (x1, x2, x3), product tags, and applies-to fields'),
      x1: z.enum(['Maintenance', 'Reuse', 'Refurbishment', 'Remanufacturing', 'Recycle']).optional().describe('Filter by circular objective (X1 level)'),
      x2: z.string().optional().describe('Filter by strategy group (X2 level), e.g. "Df Modular Design"'),
      lifecycle_phase: z.enum(['business', 'resource', 'logistics', 'sale', 'use', 'service', 'reverse', 'recovery']).optional().describe('Filter by lifecycle phase'),
      loop: z.enum(['LOOP 1', 'LOOP N', 'LAST LOOP']).optional().describe('Filter by product lifecycle loop'),
      applies_to: z.enum(['Products', 'Components', 'Materials', 'Processes', 'Systems']).optional().describe('Filter by what the strategy applies to'),
    },
    async (params) => {
      let results = allStrategies;

      if (params.x1) {
        results = results.filter(s => s.x1 === params.x1);
      }
      if (params.x2) {
        const x2Lower = params.x2.toLowerCase();
        results = results.filter(s => s.x2.toLowerCase().includes(x2Lower));
      }
      if (params.lifecycle_phase) {
        results = results.filter(s => s.type === params.lifecycle_phase);
      }
      if (params.loop) {
        results = results.filter(s => s.loop.includes(params.loop!));
      }
      if (params.applies_to) {
        results = results.filter(s => s.appliesTo.includes(params.applies_to!));
      }
      if (params.query) {
        const keywords = params.query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        results = results.filter(s => {
          const haystack = `${s.x1} ${s.x2} ${s.x3} ${s.productTags} ${s.appliesTo.join(' ')} ${s.why}`.toLowerCase();
          return keywords.some(kw => haystack.includes(kw));
        });
      }

      // Sort by X1 hierarchy order
      const x1Order = ['Maintenance', 'Reuse', 'Refurbishment', 'Remanufacturing', 'Recycle'];
      results.sort((a, b) => x1Order.indexOf(a.x1) - x1Order.indexOf(b.x1));

      const formatted = results.map(s => ({
        slug: s.slug,
        x1: s.x1,
        x2: s.x2,
        x3: s.x3,
        lifecycle_phase: PHASE_LABELS[s.type] || s.type,
        loops: s.loop,
        applies_to: s.appliesTo,
        product_tags: s.productTags || undefined,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${formatted.length} strategies.\n\n${JSON.stringify(formatted, null, 2)}`,
        }],
      };
    }
  );

  server.tool(
    'get_strategy_details',
    `Get the full details of a specific circular design strategy by its slug.

Returns complete metadata (hierarchy, lifecycle phase, loops, applicability, references, circularity index) AND rich content (why this strategy matters, how to implement it, usage context, characteristics, and guiding questions).

Use search_strategies first to find relevant slugs.`,
    {
      slug: z.string().describe('Strategy slug, e.g. "maintenance-df-behavioural-change-df-care-use"'),
    },
    async ({ slug }) => {
      const strategy = strategies.get(slug);
      if (!strategy) {
        return {
          content: [{
            type: 'text' as const,
            text: `Strategy not found: "${slug}". Use search_strategies to find valid slugs.`,
          }],
          isError: true,
        };
      }

      const detail = {
        slug: strategy.slug,
        hierarchy: {
          x1_circular_objective: strategy.x1,
          x2_strategy_group: strategy.x2,
          x3_specific_strategy: strategy.x3,
        },
        lifecycle_phase: PHASE_LABELS[strategy.type] || strategy.type,
        loops: strategy.loop,
        applies_to: strategy.appliesTo,
        product_tags: strategy.productTags || undefined,
        circularity_index: strategy.circularityIndex,
        related_strategies: strategy.dfxRelationship || undefined,
        references: strategy.references || undefined,
        linked_case_study_id: strategy.caseStudyId || undefined,
        content: {
          why: strategy.why || '(not available)',
          how: strategy.how || '(not available)',
          use: strategy.use || '(not available)',
          characteristics: strategy.characteristics || '(not available)',
          questions_to_answer: strategy.questionsToAnswer || '(not available)',
        },
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(detail, null, 2),
        }],
      };
    }
  );
}
