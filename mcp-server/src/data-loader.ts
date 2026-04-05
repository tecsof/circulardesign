import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '../../site/src/content');

// --- Types ---

export interface Strategy {
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
  authorId: string;
}

export interface StrategyFull extends Strategy {
  why: string;
  how: string;
  use: string;
  characteristics: string;
  questionsToAnswer: string;
}

export interface CaseStudy {
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

export interface CaseStudyFull extends CaseStudy {
  body: string;
}

export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
}

// --- Helpers ---

function readJsonFile(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function readMdocFile(path: string): string {
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8').trim();
  }
  return '';
}

function listContentDirs(collection: string): string[] {
  const dir = join(CONTENT_DIR, collection);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

// --- Loaders ---

export function loadStrategies(): Map<string, StrategyFull> {
  const strategies = new Map<string, StrategyFull>();
  const slugs = listContentDirs('strategies');

  for (const slug of slugs) {
    const dir = join(CONTENT_DIR, 'strategies', slug);
    const indexPath = join(dir, 'index.json');
    if (!existsSync(indexPath)) continue;

    const data = readJsonFile(indexPath);
    const strategy: StrategyFull = {
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
      authorId: (data.authorId as string) || '',
      why: readMdocFile(join(dir, 'why.mdoc')),
      how: readMdocFile(join(dir, 'how.mdoc')),
      use: readMdocFile(join(dir, 'use.mdoc')),
      characteristics: readMdocFile(join(dir, 'characteristics.mdoc')),
      questionsToAnswer: readMdocFile(join(dir, 'questionsToAnswer.mdoc')),
    };

    strategies.set(slug, strategy);
  }

  return strategies;
}

export function loadCaseStudies(): Map<string, CaseStudyFull> {
  const caseStudies = new Map<string, CaseStudyFull>();
  const slugs = listContentDirs('case-studies');

  for (const slug of slugs) {
    const dir = join(CONTENT_DIR, 'case-studies', slug);
    const indexPath = join(dir, 'index.json');
    if (!existsSync(indexPath)) continue;

    const data = readJsonFile(indexPath);
    const cs: CaseStudyFull = {
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
      body: readMdocFile(join(dir, 'body.mdoc')),
    };

    caseStudies.set(slug, cs);
  }

  return caseStudies;
}

export function loadGlossary(): Map<string, GlossaryTerm> {
  const glossary = new Map<string, GlossaryTerm>();
  const slugs = listContentDirs('glossary-terms');

  for (const slug of slugs) {
    const indexPath = join(CONTENT_DIR, 'glossary-terms', slug, 'index.json');
    if (!existsSync(indexPath)) continue;

    const data = readJsonFile(indexPath);
    glossary.set(slug, {
      slug,
      term: (data.term as string) || '',
      definition: (data.definition as string) || '',
    });
  }

  return glossary;
}

// --- Phase labels (reused from recommend.ts) ---

export const PHASE_LABELS: Record<string, string> = {
  business: 'Business & Network',
  resource: 'Resources & Production',
  logistics: 'Forward Logistics',
  sale: 'Sale',
  use: 'Use & Operation',
  service: 'Service & Maintenance',
  reverse: 'Reverse Logistics',
  recovery: 'Recovery',
};
