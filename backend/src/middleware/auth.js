import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeaderToken = req.headers.authorization?.split(' ')[1];
  const downloadQueryToken = req.path.includes('/download')
    ? req.query?.downloadToken
    : null;
  const token = authHeaderToken || downloadQueryToken;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
    } catch (error) {
      console.log('Token inválido, continuando sin autenticación');
    }
  }

  next();
};
