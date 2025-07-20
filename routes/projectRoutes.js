const express = require('express');
const router = express.Router();
const { getProjects, createProject, updateProject, deleteProject, getProjectsByUserController } = require('../controllers/projectController');

router.get('/', getProjects);
router.get('/user/:userId', getProjectsByUserController);
router.post('/', createProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
