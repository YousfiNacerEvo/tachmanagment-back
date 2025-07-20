const express = require('express');
const router = express.Router();
const { getTasks, getTasksByProject, createTask, updateTask, deleteTask, getTasksByProjectAndUserController } = require('../controllers/taskController');

router.get('/', getTasks);
router.get('/project/:projectId', getTasksByProject);
router.get('/project/:projectId/user/:userId', getTasksByProjectAndUserController);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router; 