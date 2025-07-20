const express = require('express');
const router = express.Router();
const { createUser, getUserById, getAllUsers } = require('../controllers/userController');

router.post('/', createUser);
router.get('/all', getAllUsers);
router.get('/:id', getUserById);

module.exports = router; 