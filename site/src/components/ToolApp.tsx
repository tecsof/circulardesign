import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

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
  references: string;
  caseStudyId: string;
  caseStudySlug: string;
  authorId: string;
  why: string;
  how: string;
  use: string;
  characteristics: string;
  questionsToAnswer: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  strategySlugs?: string[];
}

interface ToolAppProps {
  strategies: Strategy[];
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const PHASE_COLORS: Record<string, string> = {
  business: '#E6883C',
  resource: '#AF7DEB',
  logistics: '#C94D8B',
  sale: '#5386D3',
  use: '#7BE3CD',
  service: '#64D069',
  reverse: '#C8D454',
  recovery: '#a65e2e',
};

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

const PHASE_KEYS = Object.keys(PHASE_COLORS);

const X1_ORDER = ['Maintenance', 'Reuse', 'Refurbishment', 'Remanufacturing', 'Recycle'];
const X1_OPTIONS = X1_ORDER;
const LOOP_OPTIONS = ['LOOP 0', 'LOOP 1', 'LOOP N', 'LAST LOOP'];
const APPLIES_TO_OPTIONS = ['Products', 'Components', 'Materials', 'Processes', 'Systems'];

const SUGGESTED_PROMPTS = ['repairable laptop', 'refill packaging', 'modular furniture'];

// -------------------------------------------------------------------
// Utility
// -------------------------------------------------------------------

function phaseDot(type: string, size = 10) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: PHASE_COLORS[type] ?? '#555',
      }}
    />
  );
}

function formatStrategyName(x3: string) {
  return x3.replace(/^Df\s+/i, 'Design for ');
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

// ---- Filter Chip (yellow theme) ----

function Chip({
  label,
  active,
  dotColor,
  onClick,
}: {
  label: string;
  active: boolean;
  dotColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer
        border whitespace-nowrap flex items-center gap-1.5
        ${active
          ? 'bg-black text-white border-black'
          : 'bg-white text-black border-black/20 hover:border-black/40'
        }
      `}
    >
      {dotColor && (
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {label}
    </button>
  );
}

// ---- Lifecycle Coverage Bar (horizontal, compact for X1 header) ----

function LifecycleCoverageBar({ strategies }: { strategies: Strategy[] }) {
  const covered = useMemo(() => {
    const set = new Set<string>();
    for (const s of strategies) set.add(s.type);
    return set;
  }, [strategies]);

  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
      {PHASE_KEYS.map((phase) => (
        <div
          key={phase}
          className="flex-1 rounded-full transition-opacity"
          style={{
            backgroundColor: PHASE_COLORS[phase],
            opacity: covered.has(phase) ? 1 : 0.15,
          }}
          title={PHASE_LABELS[phase]}
        />
      ))}
    </div>
  );
}


// ---- Strategy Card (compact, for X3 level) ----

function StrategyCard({
  strategy,
  highlighted,
  onClick,
}: {
  strategy: Strategy;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer group
        bg-white shadow-sm
        ${highlighted
          ? 'ring-2 ring-yellow-400 shadow-yellow-400/20'
          : 'hover:shadow-md'
        }
      `}
      style={highlighted ? { borderColor: '#facc15' } : undefined}
    >
      <div className="flex items-center gap-2">
        {phaseDot(strategy.type, 8)}
        <span className="text-sm font-medium text-black group-hover:text-black/70 transition-colors truncate">
          {formatStrategyName(strategy.x3)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        {strategy.loop.map((l) => (
          <span key={l} className="px-1.5 py-0.5 rounded bg-black/5 text-[10px] text-black/50 font-medium">
            {l}
          </span>
        ))}
        {strategy.appliesTo.map((a) => (
          <span key={a} className="px-1.5 py-0.5 rounded bg-black/5 text-[10px] text-black/50 font-medium">
            {a}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

// ---- Detail Panel (slide-in from right) ----

function DetailPanel({
  strategy,
  onClose,
}: {
  strategy: Strategy;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-black/10 z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-black/10 p-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {phaseDot(strategy.type, 12)}
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: PHASE_COLORS[strategy.type] }}>
              {PHASE_LABELS[strategy.type]}
            </span>
          </div>
          <h2 className="text-xl font-bold text-black leading-tight">
            {formatStrategyName(strategy.x3)}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/40 hover:text-black transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Hierarchy */}
        <Section title="Hierarchy">
          <div className="flex items-center gap-2 text-sm text-black/60 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-black/5 text-xs font-medium">{strategy.x1}</span>
            <span className="text-black/20">&rsaquo;</span>
            <span className="px-2 py-0.5 rounded bg-black/5 text-xs font-medium">{strategy.x2}</span>
            <span className="text-black/20">&rsaquo;</span>
            <span className="px-2 py-0.5 rounded bg-black/10 text-black text-xs font-medium">{strategy.x3}</span>
          </div>
        </Section>

        {/* Why */}
        {strategy.why && (
          <Section title="Why">
            <p className="text-sm text-black/70 leading-relaxed whitespace-pre-wrap">{strategy.why}</p>
          </Section>
        )}

        {/* How */}
        {strategy.how && (
          <Section title="How">
            <p className="text-sm text-black/70 leading-relaxed whitespace-pre-wrap">{strategy.how}</p>
          </Section>
        )}

        {/* Use */}
        {strategy.use && (
          <Section title="Use">
            <p className="text-sm text-black/70 leading-relaxed whitespace-pre-wrap">{strategy.use}</p>
          </Section>
        )}

        {/* Characteristics */}
        {strategy.characteristics && (
          <Section title="Characteristics">
            <p className="text-sm text-black/70 leading-relaxed whitespace-pre-wrap">{strategy.characteristics}</p>
          </Section>
        )}

        {/* Questions to Answer */}
        {strategy.questionsToAnswer && (
          <Section title="Questions to Answer">
            <ul className="text-sm text-black/70 leading-relaxed space-y-1.5 list-disc list-outside pl-4">
              {strategy.questionsToAnswer
                .split(/\n/)
                .map((line) => line.replace(/^[\s•\-\*]+/, '').trim())
                .filter(Boolean)
                .map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
            </ul>
          </Section>
        )}

        {/* Metadata */}
        <Section title="Properties">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {strategy.circularityIndex != null && (
              <MetaItem label="Circularity Index" value={String(strategy.circularityIndex)} />
            )}
            <MetaItem label="Lifecycle Phase" value={PHASE_LABELS[strategy.type] ?? strategy.type} />
            {strategy.loop.length > 0 && (
              <MetaItem label="Loop" value={strategy.loop.join(', ')} />
            )}
            {strategy.appliesTo.length > 0 && (
              <MetaItem label="Applies To" value={strategy.appliesTo.join(', ')} />
            )}
            {strategy.productTags && (
              <MetaItem label="Product Tags" value={strategy.productTags} />
            )}
          </div>
        </Section>

        {/* Case Study link */}
        {strategy.caseStudySlug && (
          <Section title="Case Study">
            <a
              href={`/case-studies/${strategy.caseStudySlug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-black hover:underline"
            >
              View case study
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </Section>
        )}

        {/* Relationships */}
        {strategy.dfxRelationship && (
          <Section title="Related Strategies">
            <div className="flex flex-wrap gap-2">
              {strategy.dfxRelationship.split(',').map((r) => (
                <span key={r} className="px-2 py-1 rounded bg-black/5 border border-black/10 text-xs text-black/60">
                  {r.trim()}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* References */}
        {strategy.references && (
          <Section title="References">
            <p className="text-xs text-black/50 whitespace-pre-wrap leading-relaxed">{strategy.references}</p>
          </Section>
        )}
      </div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-black/40">{label}</span>
      <span className="text-black/80">{value}</span>
    </div>
  );
}

// -------------------------------------------------------------------
// Main App
// -------------------------------------------------------------------

export default function ToolApp({ strategies }: ToolAppProps) {
  // AI state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [filtersX1, setFiltersX1] = useState<Set<string>>(new Set());
  const [filtersLoop, setFiltersLoop] = useState<Set<string>>(new Set());
  const [filtersApplies, setFiltersApplies] = useState<Set<string>>(new Set());
  const [filtersType, setFiltersType] = useState<Set<string>>(new Set());

  // Browse state
  const [highlightedSlugs, setHighlightedSlugs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Strategy | null>(null);
  const [expandedX1, setExpandedX1] = useState<Set<string>>(new Set());
  const [expandedX2, setExpandedX2] = useState<Set<string>>(new Set());

  // Toggle filter helper
  const toggleFilter = useCallback(
    (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) => {
      setFn((prev) => {
        const next = new Set(prev);
        if (next.has(val)) next.delete(val);
        else next.add(val);
        return next;
      });
    },
    [],
  );

  // Filtered strategies
  const filtered = useMemo(() => {
    return strategies.filter((s) => {
      if (filtersX1.size > 0 && !filtersX1.has(s.x1)) return false;
      if (filtersLoop.size > 0 && !s.loop.some((l) => filtersLoop.has(l))) return false;
      if (filtersApplies.size > 0 && !s.appliesTo.some((a) => filtersApplies.has(a))) return false;
      if (filtersType.size > 0 && !filtersType.has(s.type)) return false;
      return true;
    });
  }, [strategies, filtersX1, filtersLoop, filtersApplies, filtersType]);

  // Hierarchical grouping: X1 -> X2 -> Strategy[]
  const hierarchy = useMemo(() => {
    const x1Map = new Map<string, Map<string, Strategy[]>>();
    for (const s of filtered) {
      if (!x1Map.has(s.x1)) x1Map.set(s.x1, new Map());
      const x2Map = x1Map.get(s.x1)!;
      if (!x2Map.has(s.x2)) x2Map.set(s.x2, []);
      x2Map.get(s.x2)!.push(s);
    }
    // Sort X1 by custom order, X2 by dominant phase order
    const phaseOrder = (x2Items: Strategy[]) => {
      // Find the most common phase (type) in this X2 group
      const counts = new Map<string, number>();
      for (const s of x2Items) counts.set(s.type, (counts.get(s.type) || 0) + 1);
      let dominant = x2Items[0]?.type || '';
      let max = 0;
      for (const [t, c] of counts) if (c > max) { max = c; dominant = t; }
      return PHASE_KEYS.indexOf(dominant);
    };
    const sorted = [...x1Map.entries()]
      .sort((a, b) => X1_ORDER.indexOf(a[0]) - X1_ORDER.indexOf(b[0]))
      .map(([x1, x2Map]) => ({
        x1,
        count: [...x2Map.values()].reduce((sum, arr) => sum + arr.length, 0),
        allStrategies: [...x2Map.values()].flat(),
        x2Groups: [...x2Map.entries()]
          .sort((a, b) => phaseOrder(a[1]) - phaseOrder(b[1]))
          .map(([x2, items]) => ({ x2, items, dominantPhase: (() => {
            const counts = new Map<string, number>();
            for (const s of items) counts.set(s.type, (counts.get(s.type) || 0) + 1);
            let dom = items[0]?.type || '';
            let max = 0;
            for (const [t, c] of counts) if (c > max) { max = c; dom = t; }
            return dom;
          })() })),
      }));
    return sorted;
  }, [filtered]);

  // Toggle X1 expand
  const toggleX1 = useCallback((x1: string) => {
    setExpandedX1((prev) => {
      const next = new Set(prev);
      if (next.has(x1)) next.delete(x1);
      else next.add(x1);
      return next;
    });
  }, []);

  // Toggle X2 expand
  const toggleX2 = useCallback((x2Key: string) => {
    setExpandedX2((prev) => {
      const next = new Set(prev);
      if (next.has(x2Key)) next.delete(x2Key);
      else next.add(x2Key);
      return next;
    });
  }, []);

  // AI send
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsStreaming(true);
    setAiPanelOpen(true);

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      const assistantMsg: ChatMessage = { role: 'assistant', text: '' };
      setMessages((prev) => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        // Extract strategy slugs from meta comment
        let strategySlugs: string[] | undefined;
        const metaMatch = fullText.match(/<!--strategies:(\[.*?\])-->/);
        if (metaMatch) {
          try {
            strategySlugs = JSON.parse(metaMatch[1]);
          } catch {}
        }

        const displayText = fullText.replace(/<!--strategies:\[.*?\]-->/g, '');

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', text: displayText, strategySlugs };
          return next;
        });

        // Auto-highlight and expand recommended strategies
        if (strategySlugs && strategySlugs.length > 0) {
          setHighlightedSlugs(new Set(strategySlugs));
          // Find which X1/X2 sections contain these strategies and expand them
          const slugSet = new Set(strategySlugs);
          const x1sToExpand = new Set<string>();
          const x2sToExpand = new Set<string>();
          for (const s of strategies) {
            if (slugSet.has(s.slug)) {
              x1sToExpand.add(s.x1);
              x2sToExpand.add(`${s.x1}::${s.x2}`);
            }
          }
          setExpandedX1((prev) => new Set([...prev, ...x1sToExpand]));
          setExpandedX2((prev) => new Set([...prev, ...x2sToExpand]));
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, strategies]);

  // Get the latest assistant message (for display in response panel)
  const latestAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  // Parse bold markdown in AI text — bold strategy names become clickable buttons
  const formatText = (text: string) => {
    const clean = text
      .replace(/<!--strategies:\[.*?\]-->/g, '')
      .replace(/\s*\[slug:[^\]]+\]/g, '');
    const parts = clean.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const name = part.slice(2, -2);
        // Try to match this bold name to a strategy
        const nameLower = name.toLowerCase().replace(/^design\s+for\s+/i, 'df ');
        const match = strategies.find((s) => {
          const x3Lower = s.x3.toLowerCase();
          return x3Lower === nameLower || x3Lower === name.toLowerCase()
            || formatStrategyName(s.x3).toLowerCase() === name.toLowerCase();
        });
        if (match) {
          return (
            <button
              key={i}
              onClick={() => setSelected(match)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/5 hover:bg-black/10 font-semibold cursor-pointer transition-colors"
            >
              {phaseDot(match.type, 6)}
              {name}
            </button>
          );
        }
        return <strong key={i} className="font-semibold">{name}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const activeFilterCount = filtersX1.size + filtersLoop.size + filtersApplies.size + filtersType.size;

  // On first load only, expand all X1 sections
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current && hierarchy.length > 0) {
      hasInitialized.current = true;
      setExpandedX1(new Set(hierarchy.map((h) => h.x1)));
    }
  }, [hierarchy]);

  // ---- Render ----

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1ef2e' }}>
      {/* 1. AI Assistant Bar */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: '#f1ef2e' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-4">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            {/* Input row */}
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-black/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Describe what you're designing..."
                className="flex-1 text-sm text-black placeholder:text-black/30 bg-transparent focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={isStreaming || !input.trim()}
                className="shrink-0 w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer hover:bg-black/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Suggested prompts (only when no messages yet) */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTED_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1 rounded-full bg-black/5 text-xs text-black/50 hover:bg-black/10 hover:text-black transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 mt-3 text-xs text-black/40">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse [animation-delay:0.4s]" />
                </span>
                Thinking...
              </div>
            )}

            {/* Collapsible AI response panel */}
            <AnimatePresence>
              {aiPanelOpen && latestAssistant && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-black/10">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="text-[13px] text-black/60 leading-[1.7] whitespace-pre-wrap max-h-64 overflow-y-auto flex-1 pr-2 overscroll-contain [&_strong]:text-black/80 [&_button]:my-0.5"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.15) transparent' }}
                      >
                        {formatText(latestAssistant.text)}
                      </div>
                      <button
                        onClick={() => setAiPanelOpen(false)}
                        className="shrink-0 text-black/30 hover:text-black/60 cursor-pointer p-1"
                        aria-label="Collapse"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </button>
                    </div>

                    {/* Recommended strategies */}
                    {latestAssistant.strategySlugs && latestAssistant.strategySlugs.length > 0 && (
                      <>
                        <div className="mt-4 mb-2 flex items-center gap-2">
                          <div className="h-px flex-1 bg-black/5" />
                          <span className="text-[10px] font-medium uppercase tracking-widest text-black/30">Recommended strategies</span>
                          <div className="h-px flex-1 bg-black/5" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {latestAssistant.strategySlugs.map((slug) => {
                            const s = strategies.find((st) => st.slug === slug);
                            if (!s) return null;
                            return (
                              <button
                                key={slug}
                                onClick={() => setSelected(s)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-xs text-black/60 hover:text-black/80 cursor-pointer transition-colors"
                              >
                                {phaseDot(s.type, 6)}
                                {formatStrategyName(s.x3)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Simple history: show message count */}
                    {messages.filter((m) => m.role === 'user').length > 1 && (
                      <div className="mt-3 text-[10px] text-black/25">
                        {messages.filter((m) => m.role === 'user').length} messages in conversation
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed state toggle */}
            {!aiPanelOpen && latestAssistant && (
              <button
                onClick={() => setAiPanelOpen(true)}
                className="mt-2 text-xs text-black/40 hover:text-black/60 cursor-pointer flex items-center gap-1"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
                Show AI response
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* X1 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 mr-1">Category</span>
            {X1_OPTIONS.map((v) => (
              <Chip key={v} label={v} active={filtersX1.has(v)} onClick={() => toggleFilter(filtersX1, setFiltersX1, v)} />
            ))}
          </div>

          <span className="hidden sm:block w-px h-5 bg-black/10" />

          {/* Loop */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 mr-1">Loop</span>
            {LOOP_OPTIONS.map((v) => (
              <Chip key={v} label={v} active={filtersLoop.has(v)} onClick={() => toggleFilter(filtersLoop, setFiltersLoop, v)} />
            ))}
          </div>

          <span className="hidden sm:block w-px h-5 bg-black/10" />

          {/* Applies To */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 mr-1">Applies To</span>
            {APPLIES_TO_OPTIONS.map((v) => (
              <Chip key={v} label={v} active={filtersApplies.has(v)} onClick={() => toggleFilter(filtersApplies, setFiltersApplies, v)} />
            ))}
          </div>

          <span className="hidden sm:block w-px h-5 bg-black/10" />

          {/* Lifecycle Phase */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 mr-1">Phase</span>
            {PHASE_KEYS.map((v) => (
              <Chip
                key={v}
                label={PHASE_LABELS[v]}
                active={filtersType.has(v)}
                dotColor={PHASE_COLORS[v]}
                onClick={() => toggleFilter(filtersType, setFiltersType, v)}
              />
            ))}
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFiltersX1(new Set());
                setFiltersLoop(new Set());
                setFiltersApplies(new Set());
                setFiltersType(new Set());
              }}
              className="text-xs text-black/40 hover:text-black underline underline-offset-2 cursor-pointer"
            >
              Clear ({activeFilterCount})
            </button>
          )}

          {/* Strategy count */}
          <span className="ml-auto text-xs text-black/40">
            {filtered.length} strategies
          </span>
        </div>
      </div>

      {/* 3. Strategy Browser (hierarchical accordion) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        {hierarchy.length === 0 && (
          <div className="text-center py-20">
            <p className="text-black/40 text-sm">No strategies match your filters.</p>
            <button
              onClick={() => {
                setFiltersX1(new Set());
                setFiltersLoop(new Set());
                setFiltersApplies(new Set());
                setFiltersType(new Set());
              }}
              className="mt-3 text-black text-sm hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Show all / Collapse all toggle */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => {
              const allX2Keys = hierarchy.flatMap(({ x1, x2Groups }) =>
                x2Groups.map(({ x2 }) => `${x1}::${x2}`)
              );
              const allExpanded = allX2Keys.every((k) => expandedX2.has(k));
              if (allExpanded) {
                setExpandedX2(new Set());
              } else {
                setExpandedX2(new Set(allX2Keys));
              }
            }}
            className="text-xs text-black/50 hover:text-black cursor-pointer transition-colors"
          >
            {hierarchy.flatMap(({ x1, x2Groups }) =>
              x2Groups.map(({ x2 }) => `${x1}::${x2}`)
            ).every((k) => expandedX2.has(k))
              ? 'Collapse all'
              : 'Show all strategies'}
          </button>
        </div>

        <div className="space-y-3">
          {hierarchy.map(({ x1, count, allStrategies, x2Groups }) => {
            const isX1Open = expandedX1.has(x1);

            return (
              <div key={x1} className="rounded-xl overflow-hidden">
                {/* X1 Header */}
                <button
                  onClick={() => toggleX1(x1)}
                  className="w-full flex items-center gap-3 px-5 py-4 bg-white shadow-sm cursor-pointer hover:bg-white/90 transition-colors rounded-xl"
                >
                  <motion.svg
                    animate={{ rotate: isX1Open ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-4 h-4 text-black/40 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </motion.svg>

                  <span className="text-base font-bold text-black">{x1}</span>
                  <span className="text-xs text-black/40 font-normal">({count})</span>

                  {/* Lifecycle coverage bar */}
                  <div className="flex-1 max-w-xs ml-4 hidden sm:block">
                    <LifecycleCoverageBar strategies={allStrategies} />
                  </div>
                </button>

                {/* X1 expanded content */}
                <AnimatePresence>
                  {isX1Open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="py-2 pr-2 pl-2 sm:pl-4">
                          {x2Groups.map(({ x2, items, dominantPhase }, x2Idx) => {
                            const x2Key = `${x1}::${x2}`;
                            const isX2Open = expandedX2.has(x2Key);
                            const isLast = x2Idx === x2Groups.length - 1;

                            return (
                              <div key={x2Key} className="relative">
                                {/* Vertical connector line (from this dot to next dot) */}
                                {!isLast && (
                                  <div
                                    className="hidden sm:block absolute left-[15px] top-[22px] bottom-0 w-px"
                                    style={{ backgroundColor: PHASE_COLORS[dominantPhase] ?? '#555', opacity: 0.25 }}
                                  />
                                )}

                                {/* X2 Header */}
                                <button
                                  onClick={() => toggleX2(x2Key)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/50 cursor-pointer transition-colors relative z-10"
                                >
                                  {/* Phase dot — always visible, inline with header */}
                                  <span
                                    className="inline-block w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm"
                                    style={{ backgroundColor: PHASE_COLORS[dominantPhase] ?? '#555' }}
                                    title={PHASE_LABELS[dominantPhase] ?? dominantPhase}
                                  />
                                  <motion.svg
                                    animate={{ rotate: isX2Open ? 90 : 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="w-3 h-3 text-black/30 shrink-0"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path d="M9 5l7 7-7 7" />
                                  </motion.svg>
                                  <span className="text-sm font-semibold text-black/70">
                                    {formatStrategyName(x2)}
                                  </span>
                                  <span className="text-xs text-black/30">({items.length})</span>
                                  <span className="text-[10px] text-black/25 ml-auto hidden sm:inline">
                                    {PHASE_LABELS[dominantPhase]}
                                  </span>
                                </button>

                                {/* X3 strategy cards */}
                                <AnimatePresence>
                                  {isX2Open && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.15 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pl-8 pr-1 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {items.map((s) => (
                                          <StrategyCard
                                            key={s.slug}
                                            strategy={s}
                                            highlighted={highlightedSlugs.has(s.slug)}
                                            onClick={() => setSelected(s)}
                                          />
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Detail Panel Overlay */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSelected(null)}
            />
            <DetailPanel strategy={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
