const express = require('express');
const router = express.Router();
const { getProjects, createProject, updateProject, deleteProject, getProjectsByUserController } = require('../controllers/projectController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

router.get('/', getProjects);
router.get('/user/:userId', getProjectsByUserController);
router.post('/', requireAdmin, createProject);
router.patch('/:id', requireAdmin, updateProject);
router.delete('/:id', requireAdmin, deleteProject);

module.exports = router;
