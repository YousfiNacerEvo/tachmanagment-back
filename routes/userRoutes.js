const express = require('express');
const router = express.Router();
const { createUser, getUserById, getAllUsers, deleteUser, updateUserRole } = require('../controllers/userController');
const { getMyGroupsController } = require('../controllers/groupController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

router.post('/', requireAdmin, createUser);
router.get('/all', requireAdmin, getAllUsers);
router.get('/:id', requireAdmin, getUserById);
router.patch('/:id/role', requireAdmin, updateUserRole);
router.delete('/:id', requireAdmin, deleteUser);
router.get('/:userId/my-groups', getMyGroupsController);

module.exports = router; 