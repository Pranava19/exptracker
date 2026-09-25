const app = require('../../server/index');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.includes('/balance')) {
    const urlParts = (req.url || '').split('?');
    const qs = urlParts[1] ? '?' + urlParts[1] : '';
    req.url = '/profile/balance' + qs;
  }
  return app(req, res);
};
