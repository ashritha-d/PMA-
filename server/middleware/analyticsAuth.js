// Scoped to /api/analytics only — a dedicated, non-expiring credential for
// reporting tools (Power BI scheduled refresh) rather than the 7-day admin
// JWT, which would silently break every week of a scheduled refresh cycle.
module.exports = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.ANALYTICS_API_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid analytics API key' });
  }
  next();
};
