const express = require('express');
const router = express.Router();
const {
  getAllGroupsController,
  getGroupsWithMembersController,
  getGroupByIdController,
  getGroupDetailsController,
  createGroupController,
  updateGroupController,
  deleteGroupController,
  getGroupMembersController,
  addMembersToGroupController,
  removeMembersFromGroupController,
  getGroupsByUserController,
  assignGroupToProjectController,
  assignGroupToTaskController,
  unassignGroupFromProjectController,
  unassignGroupFromTaskController,
  getGroupsByProjectController,
  getGroupsByTaskController,
  getMyGroupsController
} = require('../controllers/groupController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Group CRUD routes
router.get('/', getAllGroupsController);
router.get('/with-members', getGroupsWithMembersController);
router.get('/:id', getGroupByIdController);
router.get('/:id/details', getGroupDetailsController);
router.post('/', createGroupController);
router.put('/:id', updateGroupController);
router.delete('/:id', deleteGroupController);

// Group members routes
router.get('/:id/members', getGroupMembersController);
router.post('/:id/members', addMembersToGroupController);
router.delete('/:id/members', removeMembersFromGroupController);

// Group assignment routes
router.post('/:id/assign-project', assignGroupToProjectController);
router.post('/:id/assign-task', assignGroupToTaskController);
router.delete('/:id/unassign-project', unassignGroupFromProjectController);
router.delete('/:id/unassign-task', unassignGroupFromTaskController);

// User groups routes
router.get('/user/:userId', getGroupsByUserController);
router.get('/user/:userId/with-details', getMyGroupsController);

// Project and task groups routes
router.get('/project/:projectId', getGroupsByProjectController);
router.get('/task/:taskId', getGroupsByTaskController);

module.exports = router; 