const express = require('express');
const router = express.Router();
const { getProjects, createProject, updateProject, deleteProject, getProjectsByUserController, getProjectFiles, addProjectFiles, deleteProjectFile, notifyProject } = require('../controllers/projectController');
const { authenticateUser, requireAdmin, canAccessProject } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

router.get('/', getProjects);
router.get('/user/:userId', getProjectsByUserController);
router.post('/', requireAdmin, createProject);
router.post('/:id/notify', requireAdmin, notifyProject);
router.patch('/:id', requireAdmin, updateProject);
router.delete('/:id', requireAdmin, deleteProject);

// Files
router.get('/:id/files', canAccessProject, getProjectFiles);
router.post('/:id/files', canAccessProject, addProjectFiles);
router.delete('/:id/files', canAccessProject, deleteProjectFile);

module.exports = router;
