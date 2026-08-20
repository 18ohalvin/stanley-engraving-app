import { verifyAuthSessionToken } from './db.js';

/**
 * Express middleware to enforce valid Staff Auth Session Token
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-staff-token'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required. Please log in with a valid staff account.' 
    });
  }

  const session = verifyAuthSessionToken(token);
  if (!session) {
    return res.status(401).json({ 
      error: 'Invalid or expired session token. Please log in again.' 
    });
  }

  req.staffSession = session;
  next();
}

/**
 * Express middleware to enforce Super Admin or Master Developer role
 */
export function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.staffSession && (req.staffSession.role === 'Super Admin' || req.staffSession.isDeveloper)) {
      return next();
    }
    return res.status(403).json({ 
      error: 'Access denied. Master Developer or Super Admin role required.' 
    });
  });
}
