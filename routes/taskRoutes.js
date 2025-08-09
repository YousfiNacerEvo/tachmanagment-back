const express = require('express');
const router = express.Router();
const { getTasks, getStandaloneTasksController, getProjectTasksController, getUserTasksController, getAllUserTasksController, getTasksByProject, createTask, updateTask, deleteTask, getTasksByProjectAndUserController, getTasksByProjectWithAssigneesController } = require('../controllers/taskController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

router.get('/', getTasks);
router.get('/standalone', getStandaloneTasksController);
router.get('/project', getProjectTasksController);
router.get('/standalone/with-assignees', getStandaloneTasksController);
router.get('/project/with-assignees', getProjectTasksController);
router.get('/user/:userId', getUserTasksController);
router.get('/user/:userId/all', getAllUserTasksController);
router.get('/project/:projectId', getTasksByProject);
router.get('/project/:projectId/with-assignees', getTasksByProjectWithAssigneesController);
router.get('/project/:projectId/user/:userId', getTasksByProjectAndUserController);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router; 