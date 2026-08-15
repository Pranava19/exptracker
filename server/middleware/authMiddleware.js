const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers['authorization']?.startsWith('Bearer ')) {
    token = req.headers['authorization'].split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};