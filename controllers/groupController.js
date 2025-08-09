const {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMembersToGroup,
  removeMembersFromGroup,
  getGroupMembers,
  getGroupsByUser,
  assignGroupToProject,
  assignGroupToTask,
  unassignGroupFromProject,
  unassignGroupFromTask,
  getGroupsByProject,
  getGroupsByTask,
  getGroupsWithMemberCount,
  getGroupWithDetails,
  getGroupsWithDetailsByUser
} = require('../services/groupService');

// GET /api/groups
async function getAllGroupsController(req, res) {
  try {
    const groups = await getAllGroups();
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch groups' });
  }
}

// GET /api/groups/with-members
async function getGroupsWithMembersController(req, res) {
  try {
    const groups = await getGroupsWithMemberCount();
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch groups' });
  }
}

// GET /api/groups/:id
async function getGroupByIdController(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    const group = await getGroupById(parseInt(id));
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch group' });
  }
}

// GET /api/groups/:id/details
async function getGroupDetailsController(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    const group = await getGroupWithDetails(parseInt(id));
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch group details' });
  }
}

// POST /api/groups
async function createGroupController(req, res) {
  try {
    const { name, description, created_by } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Group name is required.' });
    }
    
    const groupData = {
      name: name.trim(),
      description: description?.trim() || '',
      created_by
    };
    
    const newGroup = await createGroup(groupData);
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create group' });
  }
}

// PUT /api/groups/:id
async function updateGroupController(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    if (!name) {
      return res.status(400).json({ message: 'Group name is required.' });
    }
    
    const updates = {
      name: name.trim(),
      description: description?.trim() || ''
    };
    
    const updatedGroup = await updateGroup(parseInt(id), updates);
    res.status(200).json(updatedGroup);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update group' });
  }
}

// DELETE /api/groups/:id
async function deleteGroupController(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    await deleteGroup(parseInt(id));
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete group' });
  }
}

// GET /api/groups/:id/members
async function getGroupMembersController(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    const members = await getGroupMembers(parseInt(id));
    res.status(200).json(members);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch group members' });
  }
}

// POST /api/groups/:id/members
async function addMembersToGroupController(req, res) {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required.' });
    }
    
    const members = await addMembersToGroup(parseInt(id), user_ids);
    res.status(201).json(members);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to add members to group' });
  }
}

// DELETE /api/groups/:id/members
async function removeMembersFromGroupController(req, res) {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required.' });
    }
    
    const removedMembers = await removeMembersFromGroup(parseInt(id), user_ids);
    res.status(200).json(removedMembers);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to remove members from group' });
  }
}

// GET /api/users/:userId/groups
async function getGroupsByUserController(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }
    
    const groups = await getGroupsByUser(userId);
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch user groups' });
  }
}

// POST /api/groups/:id/assign-project
async function assignGroupToProjectController(req, res) {
  try {
    const { id } = req.params;
    const { project_id } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    if (!project_id) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }
    
    const assignment = await assignGroupToProject(parseInt(id), project_id);
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to assign group to project' });
  }
}

// POST /api/groups/:id/assign-task
async function assignGroupToTaskController(req, res) {
  try {
    const { id } = req.params;
    const { task_id } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    if (!task_id) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }
    
    const assignment = await assignGroupToTask(parseInt(id), task_id);
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to assign group to task' });
  }
}

// DELETE /api/groups/:id/unassign-project
async function unassignGroupFromProjectController(req, res) {
  try {
    const { id } = req.params;
    const { project_id } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    if (!project_id) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }
    
    const unassignment = await unassignGroupFromProject(parseInt(id), project_id);
    res.status(200).json(unassignment);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to unassign group from project' });
  }
}

// DELETE /api/groups/:id/unassign-task
async function unassignGroupFromTaskController(req, res) {
  try {
    const { id } = req.params;
    const { task_id } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    if (!task_id) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }
    
    const unassignment = await unassignGroupFromTask(parseInt(id), task_id);
    res.status(200).json(unassignment);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to unassign group from task' });
  }
}

// GET /api/projects/:projectId/groups
async function getGroupsByProjectController(req, res) {
  try {
    const { projectId } = req.params;
    
    console.log('[getGroupsByProjectController] projectId:', projectId);
    console.log('[getGroupsByProjectController] projectId type:', typeof projectId);
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }
    
    const groups = await getGroupsByProject(projectId); // Remove parseInt() - projectId is a UUID
    res.status(200).json(groups);
  } catch (err) {
    console.error('[getGroupsByProjectController] error:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch project groups' });
  }
}

// GET /api/tasks/:taskId/groups
async function getGroupsByTaskController(req, res) {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }
    
    const groups = await getGroupsByTask(taskId);
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch task groups' });
  }
}

// GET /api/users/:userId/my-groups
async function getMyGroupsController(req, res) {
  try {
    // Si tu utilises l'auth, tu peux remplacer par req.user.id
    const userId = req.params.userId || req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }
    const groups = await getGroupsWithDetailsByUser(userId);
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch user groups' });
  }
}

module.exports = {
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
}; 