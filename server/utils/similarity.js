// Jaccard similarity over lowercased word sets — cheap, deterministic,
// no dependency. Good enough for "is this title basically the same
// listing" without needing a language model for what's a string-matching
// problem, not a language-understanding one.
function titleSimilarity(a, b) {
  const tokenize = (s) => new Set((s || '').toLowerCase().match(/[a-z0-9]+/g) || []);
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

module.exports = { titleSimilarity };
