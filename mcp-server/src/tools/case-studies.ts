import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CaseStudyFull } from '../data-loader.js';

export function registerCaseStudyTools(server: McpServer, caseStudies: Map<string, CaseStudyFull>) {
  const allCaseStudies = Array.from(caseStudies.values());

  server.tool(
    'search_case_studies',
    `Search and filter 129 real-world circular design case studies.

Case studies demonstrate circular design strategies in practice, with filters for:
- Focus: what level the case operates at (Materials, Components, Product, System)
- Cycle: Technical or Biological
- X1: which circular objective (Maintain, Reuse, Refurbish, Remanufacture, Recycle)
- Business Model: Product Oriented, Use Oriented, or Result Oriented
- Material Flow: Linear, Linear Extension, Circular, Circular Extension

All parameters are optional.`,
    {
      query: z.string().optional().describe('Free-text search in case study titles and body content'),
      focus: z.enum(['MATERIALS', 'COMPONENTS', 'PRODUCT', 'SYSTEM']).optional().describe('Filter by focus level'),
      cycle: z.enum(['TECHNICAL', 'BIOLOGICAL']).optional().describe('Filter by cycle type'),
      x1: z.enum(['MAINTAIN', 'REUSE', 'REFURBISH', 'REMANUFACTURE', 'RECYCLE']).optional().describe('Filter by circular objective'),
      business_model: z.enum(['PRODUCT ORIENTED', 'USE ORIENTED', 'RESULT ORIENTED']).optional().describe('Filter by business model type'),
    },
    async (params) => {
      let results = allCaseStudies;

      if (params.focus) {
        results = results.filter(cs => cs.filterFocus.includes(params.focus!));
      }
      if (params.cycle) {
        results = results.filter(cs => cs.filterCycle.includes(params.cycle!));
      }
      if (params.x1) {
        results = results.filter(cs => cs.filterX1.includes(params.x1!));
      }
      if (params.business_model) {
        results = results.filter(cs => cs.filterBusinessModel.includes(params.business_model!));
      }
      if (params.query) {
        const keywords = params.query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        results = results.filter(cs => {
          const haystack = `${cs.title} ${cs.body}`.toLowerCase();
          return keywords.some(kw => haystack.includes(kw));
        });
      }

      const formatted = results.map(cs => ({
        slug: cs.slug,
        title: cs.title,
        focus: cs.filterFocus,
        cycle: cs.filterCycle,
        x1: cs.filterX1,
        business_model: cs.filterBusinessModel,
        material_flow: cs.filterMaterialFlow,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${formatted.length} case studies.\n\n${JSON.stringify(formatted, null, 2)}`,
        }],
      };
    }
  );

  server.tool(
    'get_case_study',
    `Get the full details of a specific case study by its slug.

Returns metadata (title, filters, video link, related strategies) and the full markdown body content describing the case study.

Use search_case_studies first to find relevant slugs.`,
    {
      slug: z.string().describe('Case study slug, e.g. "algramo"'),
    },
    async ({ slug }) => {
      const cs = caseStudies.get(slug);
      if (!cs) {
        return {
          content: [{
            type: 'text' as const,
            text: `Case study not found: "${slug}". Use search_case_studies to find valid slugs.`,
          }],
          isError: true,
        };
      }

      const detail = {
        slug: cs.slug,
        title: cs.title,
        filters: {
          focus: cs.filterFocus,
          cycle: cs.filterCycle,
          x1: cs.filterX1,
          business_model: cs.filterBusinessModel,
          material_flow: cs.filterMaterialFlow,
        },
        video_link: cs.videoLink || undefined,
        related_strategies: cs.x3 || undefined,
        body: cs.body || '(no content available)',
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
