const app = require('../server/index');

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith('/profile') && !req.url.startsWith('/api/profile')) {
    const urlParts = (req.url || '').split('?');
    const qs = urlParts[1] ? '?' + urlParts[1] : '';
    const pathname = urlParts[0] === '/' ? '' : urlParts[0];
    req.url = '/profile' + pathname + qs;
  } else if (!req.url || req.url === '/') {
    req.url = '/profile';
  }
  return app(req, res);
};
