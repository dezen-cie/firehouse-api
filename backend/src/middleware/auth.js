const jwt = require('jsonwebtoken');

/**
 * Middleware d'authentification JWT.
 * - Si `required` est true : renvoie 401 en absence de token ou token invalide.
 * - Si `required` est false : laisse passer en attachant `req.user = null` si non authentifié.
 */
function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = req.cookies?.accessToken || bearerToken;

    if (!token) {
      if (required) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      req.user = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

/**
 * Middleware d'autorisation par rôle.
 * Vérifie que l'utilisateur authentifié possède l'un des rôles requis.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

module.exports = { auth, requireRole };
