const { User, RefreshToken } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');

const isProd = process.env.NODE_ENV === 'production';
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function normalizeAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('/uploads/')) {
    return `${BASE_URL}${avatarUrl}`;
  }
  return avatarUrl;
}

const accessCookieOptions = {
  httpOnly: false,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
};

const refreshCookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
};

function signAccess(user){
  return jwt.sign(
    { id:user.id, role:user.role, firstName:user.firstName, lastName:user.lastName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' }
  );
}

function signRefresh(user){
  return jwt.sign(
    { id:user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_TTL || '30d' }
  );
}

exports.login = async (req,res)=>{
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
  const { email, password } = schema.parse(req.body);

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if(!user) return res.status(400).json({error:'Email ou mot de passe invalide'});

  const ok = await bcrypt.compare(password, user.passwordHash||'');
  if(!ok) return res.status(400).json({error:'Email ou mot de passe invalide'});

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await RefreshToken.create({ userId: user.id, tokenHash });

  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  res.json({
  accessToken,
  user: {
    id: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    grade: user.grade,
    avatarUrl: normalizeAvatar(user.avatarUrl),
    visibleInList: user.visibleInList,
  },
});

};

exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const found = await RefreshToken.findOne({
    where: { tokenHash: hash, revokedAt: null }
  });

  if (!found) {
    return res.status(401).json({ error: 'Invalid refresh' });
  }

  // On ne re-vérifie pas le refresh token via jwt.verify :
  // on fait confiance à l'entrée en base.
  const user = await User.findByPk(found.userId);
  if (!user) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  const accessToken = signAccess(user);
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.json({ accessToken });

};


exports.logout = async (req,res)=>{
  const token = req.cookies?.refreshToken;
  if(token){
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: hash } });
  }
  res.clearCookie('accessToken', accessCookieOptions);
  res.clearCookie('refreshToken', refreshCookieOptions);
  res.json({ ok:true });
};
