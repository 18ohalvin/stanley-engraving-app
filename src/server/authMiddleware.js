import { verifyAuthSessionToken } from './db.js';

/**
 * Express middleware to enforce valid Staff Auth Session Token
 */
export async function requireAuth(req, res, next) {
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

  const session = await verifyAuthSessionToken(token);
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
export async function requireSuperAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.staffSession && (req.staffSession.role === 'Super Admin' || req.staffSession.isDeveloper)) {
      return next();
    }
    return res.status(403).json({ 
      error: 'Access denied. Master Developer or Super Admin role required.' 
    });
  });
}

/**
 * Express middleware to enforce strict multi-tenant store access control
 */
export async function requireStoreAccess(req, res, next) {
  await requireAuth(req, res, () => {
    const session = req.staffSession;
    if (!session) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Super Admin & Master Developer accounts have network-wide access
    if (session.isDeveloper || session.role === 'Super Admin' || session.storeId === '*' || session.storeId === 'HQ Central') {
      return next();
    }

    const requestedStoreId = req.params.storeId || req.params.store_id || req.params.storeCode || req.query.storeId || req.query.store;

    if (!requestedStoreId) {
      return next();
    }

    const sessionStore = (session.storeId || '').trim().toLowerCase();
    const targetStore = String(requestedStoreId).trim().toLowerCase();

    if (sessionStore !== targetStore) {
      return res.status(403).json({
        error: `Access denied: Staff assigned to store "${session.storeId}" cannot access store "${requestedStoreId}".`
      });
    }

    next();
  });
}
