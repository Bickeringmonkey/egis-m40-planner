const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAuth, requirePlannerOrAdmin } = require('../middleware/permissions');
const closuresController = require('../controllers/closuresController');

router.get('/', authenticateToken, requireAuth, closuresController.getClosures);
router.get('/:id', authenticateToken, requireAuth, closuresController.getClosureById);

router.post('/', authenticateToken, requirePlannerOrAdmin, closuresController.createClosure);
router.put('/:id', authenticateToken, requirePlannerOrAdmin, closuresController.updateClosure);
router.delete('/:id', authenticateToken, requirePlannerOrAdmin, closuresController.deleteClosure);

module.exports = router;