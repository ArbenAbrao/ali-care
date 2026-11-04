module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) {
    console.error('Request failed', { path: req.originalUrl, status, code: err.code || 'INTERNAL' });
    console.error(err);
  }
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message || 'Request failed',
  });
};