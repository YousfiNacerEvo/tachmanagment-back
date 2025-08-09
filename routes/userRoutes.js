const express = require('express');
const router = express.Router();
const { createUser, getUserById, getAllUsers, deleteUser } = require('../controllers/userController');
const { getMyGroupsController } = require('../controllers/groupController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

router.post('/', createUser);
router.get('/all', getAllUsers);
router.get('/:id', getUserById);
router.delete('/:id', deleteUser);
router.get('/:userId/my-groups', getMyGroupsController);

module.exports = router; 