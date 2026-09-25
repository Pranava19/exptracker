const app = require('../server/index');

module.exports = (req, res) => {
  if (!req.url || req.url === '/') {
    const urlParts = (req.url || '').split('?');
    const qs = urlParts[1] ? '?' + urlParts[1] : '';
    req.url = '/balance' + qs;
  }
  return app(req, res);
};
