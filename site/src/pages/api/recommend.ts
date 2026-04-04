import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

interface Strategy {
  slug: string;
  x1: string;
  x2: string;
  x3: string;
  type: string;
  loop: string[];
  appliesTo: string[];
  productTags: string;
  circularityIndex: number;
  dfxRelationship: string;
}

// Load strategies at build time via Vite's import.meta.glob (works on Netlify)
const strategyModules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../../content/strategies/*/index.json',
  { eager: true }
);

function loadStrategies(): Strategy[] {
  return Object.entries(strategyModules).map(([filepath, mod]) => {
    const slug = filepath.split('/').slice(-2, -1)[0];
    const data = mod.default ?? mod;
    return { slug, ...data } as Strategy;
  });
}

function buildStrategyContext(strategies: Strategy[]): string {
  const x1Order = ['Maintenance', 'Reuse', 'Refurbishment', 'Remanufacturing', 'Recycle'];
  const phaseLabels: Record<string, string> = {
    business: 'Business & Network', resource: 'Resources & Production',
    logistics: 'Forward Logistics', sale: 'Sale', use: 'Use & Operation',
    service: 'Service & Maintenance', reverse: 'Reverse Logistics', recovery: 'Recovery',
  };

  const byX1 = new Map<string, Strategy[]>();
  for (const s of strategies) {
    const arr = byX1.get(s.x1) || [];
    arr.push(s);
    byX1.set(s.x1, arr);
  }

  let ctx = 'CIRCULAR DESIGN STRATEGIES DATABASE:\n\n';
  for (const x1 of x1Order) {
    const items = byX1.get(x1) || [];
    ctx += `## ${x1} (X1)\n`;
    for (const s of items) {
      const phase = phaseLabels[s.type] || s.type;
      ctx += `- ${s.x3} [slug:${s.slug}] | X2: ${s.x2} | Phase: ${phase}`;
      if (s.loop.length) ctx += ` | Loops: ${s.loop.join(', ')}`;
      if (s.appliesTo.length) ctx += ` | Applies to: ${s.appliesTo.join(', ')}`;
      if (s.productTags) ctx += ` | Tags: ${s.productTags}`;
      ctx += '\n';
    }
    ctx += '\n';
  }
  return ctx;
}

const SYSTEM_PROMPT = `You are the Circular Design Assistant, a deep expert on circular economy design strategies based on the Multi-hierarchical Design for X (DfX) framework — output of 3 years of PhD research.

Your knowledge base contains 230+ circular design strategies organized in a 3-level hierarchy:
- X1: Main circular objective (Maintenance, Reuse, Refurbishment, Remanufacturing, Recycle)
- X2: Strategy group (e.g. "Df Modular Design", "Df Circular Business Model")
- X3: Specific strategy (e.g. "Df Standardization", "Df Product Leasing")

Each strategy belongs to one of 8 lifecycle phases (in supply chain order):
1. Business & Network (business) — business model, partnerships, ecosystem design
2. Resources & Production (resource) — materials selection, manufacturing, production
3. Forward Logistics (logistics) — distribution, packaging, delivery
4. Sale (sale) — point of sale, user acquisition, ownership models
5. Use & Operation (use) — active product use, user behaviour, operation
6. Service & Maintenance (service) — upkeep, repair, spare parts, diagnostics
7. Reverse Logistics (reverse) — return, collection, take-back systems
8. Recovery (recovery) — end-of-life processing, material recovery, recycling

Strategies also belong to Loops (product lifecycle iterations):
- LOOP 0: Pre-use / first lifecycle design decisions
- LOOP 1: First use cycle (maintenance, repair, reuse within original lifecycle)
- LOOP N: Multiple subsequent cycles (refurbishment, remanufacturing — extending life across users)
- LAST LOOP: Final end-of-life (recycling, material recovery — when product can no longer be maintained/reused)

HOW TO THINK ABOUT RECOMMENDATIONS:

When a user describes a product or service, think deeply and specifically about it:

1. **Understand the product/service.** Consider its materials, components, user interaction patterns, typical lifespan, failure modes, and end-of-life challenges. Don't give generic advice — reason about THIS specific product.

2. **Design a cascading loop strategy.** The most circular products are designed to flow through multiple loops in sequence, each preserving as much value as possible:
   - LOOP 1: How can this product be maintained and kept in use as long as possible? (Maintenance strategies)
   - LOOP 1→N: When the first user is done, how can it be reused by another? (Reuse strategies)
   - LOOP N: When reuse isn't enough, how can it be refurbished or remanufactured? (Refurbishment/Remanufacturing strategies)
   - LAST LOOP: Only when the product truly cannot serve its function, how do we recover materials? (Recycle strategies)

   Explain this cascade explicitly for the specific product.

3. **Cover the full supply chain.** For each loop, recommend strategies across different lifecycle phases. A well-designed circular product needs strategies at every phase — from how the business model works, to how it's produced, sold, used, maintained, returned, and recovered.

4. Recommend 8-12 strategies total, organized as a cascading loop plan across lifecycle phases.

RESPONSE FORMAT:

Structure your response as follows:

First, briefly describe your understanding of the product and its circular potential (2-3 sentences).

Then present your recommendations organized by loop, from tightest to widest:

**LOOP 1 — [Maintenance/Keeping in use]**
For each strategy: **Strategy Name** [slug:exact-slug] — one sentence explaining why this is relevant to THIS specific product, referencing the lifecycle phase.

**LOOP N — [Reuse / Refurbishment / Remanufacturing]**
...

**LAST LOOP — [Recycling / Material Recovery]**
...

IMPORTANT FORMATTING RULES:
- When recommending a strategy, always use its exact name from the database and include its slug: [slug:strategy-slug-here]
- Use markdown bold for strategy names
- Be specific and concrete — reference actual product characteristics, not generic circular economy principles
- End your response with the exact line: <!--strategies:["slug1","slug2",...]-->
  listing all recommended strategy slugs as a JSON array. This line will be parsed by the UI.

If the user asks general questions about circular design, answer using your knowledge of the framework.`;

export const POST: APIRoute = async ({ request }) => {
  const { message, history } = await request.json();
  const strategies = loadStrategies();
  const strategyContext = buildStrategyContext(strategies);

  const apiKey = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  // If no API key, fall back to keyword matching
  if (!apiKey) {
    return fallbackResponse(message, strategies);
  }

  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    ...(history || []).slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // Ensure the conversation starts with a user message
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: message });
  }

  const stream = await client.messages.stream({
    model: 'claude-opus-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT + '\n\n' + strategyContext,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
};

// Fallback when no API key is configured
function fallbackResponse(message: string, strategies: Strategy[]) {
  const stopWords = new Set([
    'i', 'me', 'my', 'we', 'the', 'a', 'an', 'is', 'are', 'was', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'and', 'but', 'or', 'not', 'want', 'need', 'design',
    'make', 'project', 'working', 'help', 'looking', 'use', 'using', 'how', 'what', 'can',
  ]);

  const keywords = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w: string) => w.length > 2 && !stopWords.has(w));

  const phaseLabels: Record<string, string> = {
    business: 'Business & Network', resource: 'Resources & Production',
    logistics: 'Forward Logistics', sale: 'Sale', use: 'Use & Operation',
    service: 'Service & Maintenance', reverse: 'Reverse Logistics', recovery: 'Recovery',
  };

  const scored = strategies
    .map((s) => {
      const haystack = `${s.x1} ${s.x2} ${s.x3} ${s.type} ${s.productTags} ${s.appliesTo.join(' ')}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (haystack.includes(kw)) {
          score += 1;
          if (s.x3.toLowerCase().includes(kw)) score += 2;
        }
      }
      return { strategy: s, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const results = scored.length > 0
    ? scored.map((s) => s.strategy)
    : strategies.filter((s) => s.circularityIndex && s.circularityIndex >= 1).slice(0, 6);

  const topSlugs = results.map((r) => r.slug);

  // Group by X1 for cascading loop presentation
  const byX1 = new Map<string, typeof results>();
  for (const r of results) {
    const arr = byX1.get(r.x1) || [];
    arr.push(r);
    byX1.set(r.x1, arr);
  }

  let text = scored.length > 0
    ? 'Based on your description, here are circular design strategies organized by circular loop:\n\n'
    : 'Here are foundational circular design strategies to consider:\n\n';

  for (const [x1, items] of byX1) {
    text += `**${x1}**\n`;
    for (const r of items) {
      text += `- **${r.x3}** [slug:${r.slug}] — ${phaseLabels[r.type] || r.type} phase`;
      if (r.loop?.length) text += ` (${r.loop.join(', ')})`;
      text += '\n';
    }
    text += '\n';
  }

  text += '\n*Note: For deeper, AI-powered recommendations that design a full circular supply chain, configure your ANTHROPIC_API_KEY.*';
  text += `\n<!--strategies:${JSON.stringify(topSlugs)}-->`;

  const encoder = new TextEncoder();
  const words = text.split(/(?<=\s)/);
  const stream = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        await new Promise((r) => setTimeout(r, 15 + Math.random() * 25));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
