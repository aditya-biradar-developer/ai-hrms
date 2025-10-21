// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    // Flatten roles array (handles both authorize('admin') and authorize(['admin', 'hr']))
    const allowedRoles = roles.flat();
    
    console.log('🔐 Authorization check:', {
      userRole: req.user.role,
      allowedRoles: allowedRoles,
      hasAccess: allowedRoles.includes(req.user.role)
    });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = { authorize };