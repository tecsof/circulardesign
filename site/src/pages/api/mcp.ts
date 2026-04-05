import type { APIRoute } from 'astro';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

export const prerender = false;

// ── Data types ──────────────────────────────────────────────────────────

interface Strategy {
  slug: string;
  x1: string;
  x2: string;
  x3: string;
  type: string;
  loop: string[];
  appliesTo: string[];
  productTags: string;
  circularityIndex: number | null;
  dfxRelationship: string;
  references: string;
  caseStudyId: string;
}

interface StrategyContent {
  why: string;
  how: string;
  use: string;
  characteristics: string;
  questionsToAnswer: string;
}

interface CaseStudy {
  slug: string;
  id: number;
  title: string;
  videoLink: string;
  links: string;
  x3: string;
  filterFocus: string[];
  filterCycle: string[];
  filterX1: string[];
  filterBusinessModel: string[];
  filterMaterialFlow: string[];
  heroImage: string;
}

interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
}

const PHASE_LABELS: Record<string, string> = {
  business: 'Business & Network',
  resource: 'Resources & Production',
  logistics: 'Forward Logistics',
  sale: 'Sale',
  use: 'Use & Operation',
  service: 'Service & Maintenance',
  reverse: 'Reverse Logistics',
  recovery: 'Recovery',
};

// ── Load data via Vite glob (same pattern as recommend.ts) ──────────────

const strategyModules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../../content/strategies/*/index.json',
  { eager: true }
);

const strategyContentModules: Record<string, Record<string, () => Promise<string>>> = {};
const contentFiles = import.meta.glob<string>(
  '../../content/strategies/*/*.mdoc',
  { eager: true, query: '?raw', import: 'default' }
);

// Index content files by strategy slug
for (const [filepath, content] of Object.entries(contentFiles)) {
  const parts = filepath.split('/');
  const slug = parts[parts.length - 2];
  const filename = parts[parts.length - 1].replace('.mdoc', '');
  if (!strategyContentModules[slug]) strategyContentModules[slug] = {};
  (strategyContentModules[slug] as Record<string, string>)[filename] = content as unknown as string;
}

const caseStudyModules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../../content/case-studies/*/index.json',
  { eager: true }
);

const caseStudyBodyModules = import.meta.glob<string>(
  '../../content/case-studies/*/body.mdoc',
  { eager: true, query: '?raw', import: 'default' }
);

const glossaryModules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../../content/glossary-terms/*/index.json',
  { eager: true }
);

// ── Build in-memory data ────────────────────────────────────────────────

function loadStrategies(): Strategy[] {
  return Object.entries(strategyModules).map(([filepath, mod]) => {
    const slug = filepath.split('/').slice(-2, -1)[0];
    const data = mod.default ?? mod;
    return {
      slug,
      x1: (data.x1 as string) || '',
      x2: (data.x2 as string) || '',
      x3: (data.x3 as string) || '',
      type: (data.type as string) || '',
      loop: (data.loop as string[]) || [],
      appliesTo: (data.appliesTo as string[]) || [],
      productTags: (data.productTags as string) || '',
      circularityIndex: (data.circularityIndex as number | null) ?? null,
      dfxRelationship: (data.dfxRelationship as string) || '',
      references: (data.references as string) || '',
      caseStudyId: (data.caseStudyId as string) || '',
    };
  });
}

function getStrategyContent(slug: string): StrategyContent {
  const content = strategyContentModules[slug] || {};
  return {
    why: ((content as Record<string, string>).why || '').trim(),
    how: ((content as Record<string, string>).how || '').trim(),
    use: ((content as Record<string, string>).use || '').trim(),
    characteristics: ((content as Record<string, string>).characteristics || '').trim(),
    questionsToAnswer: ((content as Record<string, string>).questionsToAnswer || '').trim(),
  };
}

function loadCaseStudies(): CaseStudy[] {
  return Object.entries(caseStudyModules).map(([filepath, mod]) => {
    const slug = filepath.split('/').slice(-2, -1)[0];
    const data = mod.default ?? mod;
    return {
      slug,
      id: (data.id as number) || 0,
      title: (data.title as string) || '',
      videoLink: (data.videoLink as string) || '',
      links: (data.links as string) || '',
      x3: (data.x3 as string) || '',
      filterFocus: (data.filterFocus as string[]) || [],
      filterCycle: (data.filterCycle as string[]) || [],
      filterX1: (data.filterX1 as string[]) || [],
      filterBusinessModel: (data.filterBusinessModel as string[]) || [],
      filterMaterialFlow: (data.filterMaterialFlow as string[]) || [],
      heroImage: (data.heroImage as string) || '',
    };
  });
}

function getCaseStudyBody(slug: string): string {
  for (const [filepath, content] of Object.entries(caseStudyBodyModules)) {
    if (filepath.includes(`/${slug}/`)) {
      return (content as unknown as string || '').trim();
    }
  }
  return '';
}

function loadGlossary(): GlossaryTerm[] {
  return Object.entries(glossaryModules).map(([filepath, mod]) => {
    const slug = filepath.split('/').slice(-2, -1)[0];
    const data = mod.default ?? mod;
    return {
      slug,
      term: (data.term as string) || '',
      definition: (data.definition as string) || '',
    };
  });
}

// Pre-load all data at module level
const strategies = loadStrategies();
const strategiesBySlug = new Map(strategies.map(s => [s.slug, s]));
const caseStudies = loadCaseStudies();
const caseStudiesBySlug = new Map(caseStudies.map(cs => [cs.slug, cs]));
const glossaryTerms = loadGlossary();

// ── MCP Server factory ─────────────────────────────────────────────────

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'circular-design-research',
    version: '1.0.0',
  });

  // ── Tool: search_strategies ────────────────────────────────────────

  server.tool(
    'search_strategies',
    `Search and filter the circular design strategies database (${strategies.length} strategies from PhD research).

Strategies are organized in a 3-level hierarchy:
- X1: Circular objective (Maintenance, Reuse, Refurbishment, Remanufacturing, Recycle)
- X2: Strategy group (e.g. "Df Modular Design", "Df Circular Business Model")
- X3: Specific strategy (e.g. "Df Care", "Df Standardization")

Each strategy belongs to a lifecycle phase and one or more loops.
All parameters are optional — omit all to list every strategy.`,
    {
      query: z.string().optional().describe('Free-text search across strategy names, product tags, and descriptions'),
      x1: z.enum(['Maintenance', 'Reuse', 'Refurbishment', 'Remanufacturing', 'Recycle']).optional().describe('Filter by circular objective (X1 level)'),
      x2: z.string().optional().describe('Filter by strategy group (X2 level), e.g. "Df Modular Design"'),
      lifecycle_phase: z.enum(['business', 'resource', 'logistics', 'sale', 'use', 'service', 'reverse', 'recovery']).optional().describe('Filter by lifecycle phase'),
      loop: z.enum(['LOOP 1', 'LOOP N', 'LAST LOOP']).optional().describe('Filter by product lifecycle loop'),
      applies_to: z.enum(['Products', 'Components', 'Materials', 'Processes', 'Systems']).optional().describe('Filter by what the strategy applies to'),
    },
    async (params) => {
      let results = strategies;

      if (params.x1) results = results.filter(s => s.x1 === params.x1);
      if (params.x2) {
        const x2Lower = params.x2.toLowerCase();
        results = results.filter(s => s.x2.toLowerCase().includes(x2Lower));
      }
      if (params.lifecycle_phase) results = results.filter(s => s.type === params.lifecycle_phase);
      if (params.loop) results = results.filter(s => s.loop.includes(params.loop!));
      if (params.applies_to) results = results.filter(s => s.appliesTo.includes(params.applies_to!));
      if (params.query) {
        const keywords = params.query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        results = results.filter(s => {
          const content = getStrategyContent(s.slug);
          const haystack = `${s.x1} ${s.x2} ${s.x3} ${s.productTags} ${s.appliesTo.join(' ')} ${content.why}`.toLowerCase();
          return keywords.some(kw => haystack.includes(kw));
        });
      }

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
        content: [{ type: 'text' as const, text: `Found ${formatted.length} strategies.\n\n${JSON.stringify(formatted, null, 2)}` }],
      };
    }
  );

  // ── Tool: get_strategy_details ─────────────────────────────────────

  server.tool(
    'get_strategy_details',
    `Get the full details of a specific circular design strategy by its slug.

Returns complete metadata (hierarchy, lifecycle phase, loops, applicability, references, circularity index) AND rich content (why this strategy matters, how to implement it, usage context, characteristics, and guiding questions).

Use search_strategies first to find relevant slugs.`,
    {
      slug: z.string().describe('Strategy slug, e.g. "maintenance-df-behavioural-change-df-care-use"'),
    },
    async ({ slug }) => {
      const strategy = strategiesBySlug.get(slug);
      if (!strategy) {
        return {
          content: [{ type: 'text' as const, text: `Strategy not found: "${slug}". Use search_strategies to find valid slugs.` }],
          isError: true,
        };
      }

      const content = getStrategyContent(slug);
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
          why: content.why || '(not available)',
          how: content.how || '(not available)',
          use: content.use || '(not available)',
          characteristics: content.characteristics || '(not available)',
          questions_to_answer: content.questionsToAnswer || '(not available)',
        },
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }],
      };
    }
  );

  // ── Tool: search_case_studies ──────────────────────────────────────

  server.tool(
    'search_case_studies',
    `Search and filter ${caseStudies.length} real-world circular design case studies.

Case studies demonstrate circular design strategies in practice, with filters for:
- Focus: what level the case operates at (Materials, Components, Product, System)
- Cycle: Technical or Biological
- X1: which circular objective (Maintain, Reuse, Refurbish, Remanufacture, Recycle)
- Business Model: Product Oriented, Use Oriented, or Result Oriented

All parameters are optional.`,
    {
      query: z.string().optional().describe('Free-text search in case study titles and body content'),
      focus: z.enum(['MATERIALS', 'COMPONENTS', 'PRODUCT', 'SYSTEM']).optional().describe('Filter by focus level'),
      cycle: z.enum(['TECHNICAL', 'BIOLOGICAL']).optional().describe('Filter by cycle type'),
      x1: z.enum(['MAINTAIN', 'REUSE', 'REFURBISH', 'REMANUFACTURE', 'RECYCLE']).optional().describe('Filter by circular objective'),
      business_model: z.enum(['PRODUCT ORIENTED', 'USE ORIENTED', 'RESULT ORIENTED']).optional().describe('Filter by business model type'),
    },
    async (params) => {
      let results = caseStudies;

      if (params.focus) results = results.filter(cs => cs.filterFocus.includes(params.focus!));
      if (params.cycle) results = results.filter(cs => cs.filterCycle.includes(params.cycle!));
      if (params.x1) results = results.filter(cs => cs.filterX1.includes(params.x1!));
      if (params.business_model) results = results.filter(cs => cs.filterBusinessModel.includes(params.business_model!));
      if (params.query) {
        const keywords = params.query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        results = results.filter(cs => {
          const body = getCaseStudyBody(cs.slug);
          const haystack = `${cs.title} ${body}`.toLowerCase();
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
        content: [{ type: 'text' as const, text: `Found ${formatted.length} case studies.\n\n${JSON.stringify(formatted, null, 2)}` }],
      };
    }
  );

  // ── Tool: get_case_study ───────────────────────────────────────────

  server.tool(
    'get_case_study',
    `Get the full details of a specific case study by its slug.

Returns metadata (title, filters, video link, related strategies) and the full markdown body content.

Use search_case_studies first to find relevant slugs.`,
    {
      slug: z.string().describe('Case study slug, e.g. "algramo"'),
    },
    async ({ slug }) => {
      const cs = caseStudiesBySlug.get(slug);
      if (!cs) {
        return {
          content: [{ type: 'text' as const, text: `Case study not found: "${slug}". Use search_case_studies to find valid slugs.` }],
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
        body: getCaseStudyBody(slug) || '(no content available)',
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }],
      };
    }
  );

  // ── Tool: search_glossary ──────────────────────────────────────────

  server.tool(
    'search_glossary',
    `Look up circular economy and circular design terminology.

Searches across ${glossaryTerms.length} curated glossary terms with definitions.`,
    {
      term: z.string().describe('Search term — matches against term names and definitions'),
    },
    async ({ term }) => {
      const query = term.toLowerCase();
      const results = glossaryTerms.filter(t =>
        `${t.term} ${t.definition}`.toLowerCase().includes(query)
      );

      if (results.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `No glossary terms found matching "${term}".` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: `Found ${results.length} matching terms.\n\n${JSON.stringify(results.map(t => ({ term: t.term, definition: t.definition })), null, 2)}` }],
      };
    }
  );

  return server;
}

// ── HTTP handlers ───────────────────────────────────────────────────────

async function handleMcpRequest(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode for serverless
    enableJsonResponse: true,      // Simple JSON responses (no SSE needed)
  });

  const server = createMcpServer();
  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}

export const POST: APIRoute = async ({ request }) => {
  return handleMcpRequest(request);
};

export const GET: APIRoute = async ({ request }) => {
  return handleMcpRequest(request);
};

export const DELETE: APIRoute = async ({ request }) => {
  return handleMcpRequest(request);
};
