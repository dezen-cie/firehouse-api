const { User, RefreshToken } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');

/**
 * Génère un jeton d'accès JWT pour un utilisateur.
 */
function signAccess(user) {
  return jwt.sign(
    { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' }
  );
}

/**
 * Génère un jeton de rafraîchissement JWT pour un utilisateur.
 */
function signRefresh(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_TTL || '30d' }
  );
}

/**
 * Authentifie un utilisateur et retourne les jetons d'accès / rafraîchissement.
 */
exports.login = async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const { email, password } = schema.parse(req.body);

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) {
      return res.status(400).json({ error: 'Email ou mot de passe invalide' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
      return res.status(400).json({ error: 'Email ou mot de passe invalide' });
    }

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await RefreshToken.create({ userId: user.id, tokenHash });

    res.cookie('accessToken', accessToken, { httpOnly: false, sameSite: 'lax' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax' });

    return res.json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        grade: user.grade,
        avatarUrl: user.avatarUrl,
        visibleInList: user.visibleInList,
      },
    });
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Format email/mot de passe invalide' });
    }
    return res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
};

/**
 * Renouvelle le jeton d'accès à partir d'un jeton de rafraîchissement valide.
 */
exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const found = await RefreshToken.findOne({
    where: { tokenHash: hash, revokedAt: null },
  });

  if (!found) {
    return res.status(401).json({ error: 'Invalid refresh' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(payload.id);
    const accessToken = signAccess(user);

    res.cookie('accessToken', accessToken, { httpOnly: false, sameSite: 'lax' });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Révoque le jeton de rafraîchissement actif et supprime les cookies d'authentification.
 */
exports.logout = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { tokenHash: hash } }
    );
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  return res.json({ ok: true });
};
