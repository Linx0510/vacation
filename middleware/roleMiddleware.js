module.exports = (allowedRoles) => {
  return (req, res, next) => {
    const role = req.session?.role || req.session?.userRole;
    if (req.session && req.session.userId && allowedRoles.includes(role)) {
      return next();
    }
    res.status(403).render('pages/index', { error: 'Доступ запрещен: недостаточно прав' });
  };
};
