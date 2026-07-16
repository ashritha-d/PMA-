// Escapes regex metacharacters in user-supplied search input before it's
// interpolated into a MongoDB $regex filter. Without this, a pathological
// pattern (e.g. nested quantifiers) submitted as a search/city query param
// can cause catastrophic backtracking (ReDoS) during the scan.
function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
