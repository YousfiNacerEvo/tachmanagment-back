const express = require('express');
const router = express.Router();
const { createUser, getUserById, getAllUsers, deleteUser, updateUserRole, getMyProfile } = require('../controllers/userController');
const { getMyGroupsController } = require('../controllers/groupController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

router.post('/', requireAdmin, createUser);
router.get('/all', requireAdmin, getAllUsers);
router.get('/me', getMyProfile); // Route pour l'utilisateur connecté
router.get('/:userId/my-groups', getMyGroupsController); // Route spécifique avec paramètre
router.get('/:id', requireAdmin, getUserById); // Route admin pour n'importe quel utilisateur
router.patch('/:id/role', requireAdmin, updateUserRole);
router.delete('/:id', requireAdmin, deleteUser);

module.exports = router; 