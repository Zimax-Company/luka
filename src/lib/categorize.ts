// Lightweight, dependency-free category suggester: a per-account multinomial
// Naïve Bayes classifier over note tokens + an amount-magnitude feature, with a
// deterministic "merchant memory" fast path. Trains in-memory from the account's
// own entries — no ML infra, explainable, and cheap enough to call per keystroke.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'for', 'and', 'on', 'at', 'in', 'my', 'me',
  'is', 'was', 'with', 'from', 'by', 'this', 'that', 'it', 'i', 'we', 'our',
  'paid', 'payment', 'pay', 'via', 'ref', 'transfer', 'trf',
]);

export interface TrainEntry {
  note: string | null;
  categoryId: string;
  categoryName: string;
  categoryType: 'INCOME' | 'EXPENSE';
  amount: number;
}

export interface Suggestion {
  categoryId: string;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  confidence: number; // 0..1
}

export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t))
    .slice(0, 24);
}

// Order-of-magnitude bucket, treated as a feature token so "rent-sized" amounts
// nudge toward rent-like categories.
function amountToken(amount: number): string {
  const a = Math.abs(amount) || 0;
  if (a < 1) return 'amt:0';
  return `amt:e${Math.floor(Math.log10(a))}`;
}

function featuresOf(note: string | null, amount: number): string[] {
  return [...tokenize(note), amountToken(amount)];
}

interface CatInfo { name: string; type: 'INCOME' | 'EXPENSE'; count: number }

export interface CategoryModel {
  cats: Map<string, CatInfo>;
  tokenCounts: Map<string, Map<string, number>>; // categoryId -> token -> count
  tokenTotals: Map<string, number>; // categoryId -> total feature occurrences
  vocab: Set<string>;
  total: number;
}

export function buildModel(entries: TrainEntry[]): CategoryModel {
  const cats = new Map<string, CatInfo>();
  const tokenCounts = new Map<string, Map<string, number>>();
  const tokenTotals = new Map<string, number>();
  const vocab = new Set<string>();

  for (const e of entries) {
    if (!e.categoryId) continue;
    const info = cats.get(e.categoryId) ?? { name: e.categoryName, type: e.categoryType, count: 0 };
    info.count += 1;
    cats.set(e.categoryId, info);

    let tc = tokenCounts.get(e.categoryId);
    if (!tc) {
      tc = new Map();
      tokenCounts.set(e.categoryId, tc);
    }
    let tot = tokenTotals.get(e.categoryId) ?? 0;
    for (const f of featuresOf(e.note, Number(e.amount) || 0)) {
      tc.set(f, (tc.get(f) ?? 0) + 1);
      tot += 1;
      vocab.add(f);
    }
    tokenTotals.set(e.categoryId, tot);
  }

  // Seed each category with its OWN name tokens. Many entries have sparse or
  // empty notes, so this lets a typed word that matches a category name (e.g.
  // "fuel" → Fuel) win even without prior note history for that word.
  const SEED_WEIGHT = 6;
  for (const [categoryId, info] of cats) {
    let tc = tokenCounts.get(categoryId);
    if (!tc) {
      tc = new Map();
      tokenCounts.set(categoryId, tc);
    }
    let tot = tokenTotals.get(categoryId) ?? 0;
    for (const f of tokenize(info.name)) {
      tc.set(f, (tc.get(f) ?? 0) + SEED_WEIGHT);
      tot += SEED_WEIGHT;
      vocab.add(f);
    }
    tokenTotals.set(categoryId, tot);
  }

  return { cats, tokenCounts, tokenTotals, vocab, total: entries.length };
}

// Rank categories for a would-be entry. `type` restricts to income/expense.
export function suggestCategories(
  model: CategoryModel,
  input: { note: string | null; amount: number; type?: 'INCOME' | 'EXPENSE' },
  topN = 3,
): Suggestion[] {
  if (model.total === 0) return [];
  const features = featuresOf(input.note, input.amount);
  const V = Math.max(1, model.vocab.size);
  const alpha = 0.5;

  const candidates = [...model.cats.entries()].filter(
    ([, info]) => !input.type || info.type === input.type,
  );
  if (candidates.length === 0) return [];

  const scored = candidates.map(([categoryId, info]) => {
    const tc = model.tokenCounts.get(categoryId)!;
    const tot = model.tokenTotals.get(categoryId) ?? 0;
    // log prior
    let logp = Math.log((info.count + 1) / (model.total + model.cats.size));
    // log likelihoods (Laplace-smoothed)
    for (const f of features) {
      logp += Math.log(((tc.get(f) ?? 0) + alpha) / (tot + alpha * V));
    }
    return { categoryId, info, logp };
  });

  // Softmax over log-scores → confidences.
  const maxLog = Math.max(...scored.map(s => s.logp));
  let denom = 0;
  for (const s of scored) denom += Math.exp(s.logp - maxLog);

  return scored
    .map(s => ({
      categoryId: s.categoryId,
      categoryName: s.info.name,
      type: s.info.type,
      confidence: Math.exp(s.logp - maxLog) / denom,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
}
