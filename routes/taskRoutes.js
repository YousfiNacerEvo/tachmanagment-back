const express = require('express');
const router = express.Router();
const { getTasks, getTasksByProject, createTask, updateTask, deleteTask } = require('../controllers/taskController');

router.get('/', getTasks);
router.get('/project/:projectId', getTasksByProject);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router; 