const app = require('../server/index');

module.exports = (req, res) => {
  if (req.query && req.query.slug) {
    const slug = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug;
    const urlParts = (req.url || '').split('?');
    const searchParams = new URLSearchParams(urlParts[1] || '');
    searchParams.delete('slug');
    const qs = searchParams.toString();
    req.url = '/' + slug + (qs ? '?' + qs : '');
  }
  return app(req, res);
};
