function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorised' });
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorised' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

function requirePlannerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorised' });
  }

  if (req.user.role !== 'planner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorised' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requirePlannerOrAdmin,
  requireAdmin,
};