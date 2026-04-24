const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAuth, requirePlannerOrAdmin } = require('../middleware/permissions');
const jobsController = require('../controllers/jobsController');

router.get('/', authenticateToken, requireAuth, jobsController.getJobs);
router.get('/:id', authenticateToken, requireAuth, jobsController.getJobById);

router.post('/', authenticateToken, requirePlannerOrAdmin, jobsController.createJob);
router.put('/:id', authenticateToken, requirePlannerOrAdmin, jobsController.updateJob);
router.delete('/:id', authenticateToken, requirePlannerOrAdmin, jobsController.deleteJob);

module.exports = router;