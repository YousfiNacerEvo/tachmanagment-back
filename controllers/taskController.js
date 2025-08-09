const { getAllTasks, getTasksByProject: getTasksByProjectService, getTasksByProjectWithAssignees, addTask, updateTask: updateTaskService, deleteTask: deleteTaskService, getTasksByProjectAndUser, getStandaloneTasks, getStandaloneTasksWithAssignees, getProjectTasks, getProjectTasksWithAssignees, getTasksByUser, getAllTasksByUser, getTaskAssignees } = require('../services/taskService');
const { notifyAdminsOnCreation, notifyAssigneesOnAssignment } = require('../services/notificationService');
const { supabase } = require('../services/supabaseClient');

async function getTasks(req, res) {
  try {
    const tasks = await getAllTasks();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch tasks' });
  }
}

// Nouvelle route pour récupérer les tâches indépendantes
async function getStandaloneTasksController(req, res) {
  try {
    const tasks = await getStandaloneTasksWithAssignees();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch standalone tasks' });
  }
}

// Nouvelle route pour récupérer les tâches de projet
async function getProjectTasksController(req, res) {
  try {
    const tasks = await getProjectTasksWithAssignees();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch project tasks' });
  }
}

// Nouvelle route pour récupérer les tâches d'un utilisateur
async function getUserTasksController(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User id is required.' });
    const tasks = await getTasksByUser(userId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch user tasks' });
  }
}

// Nouvelle route pour récupérer toutes les tâches de l'utilisateur (directes + via groupes)
async function getAllUserTasksController(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User id is required.' });
    const tasks = await getAllTasksByUser(userId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch all user tasks' });
  }
}

async function getTasksByProject(req, res) {
  const { projectId } = req.params;
  try {
    const tasks = await getTasksByProjectWithAssignees(projectId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch project tasks' });
  }
}

async function getTasksByProjectWithAssigneesController(req, res) {
  const { projectId } = req.params;
  try {
    const tasks = await getTasksByProjectWithAssignees(projectId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch project tasks with assignees' });
  }
}

async function createTask(req, res) {
  console.log('Reçu pour création de tâche :', req.body);
  const { title, status, deadline, priority, project_id, user_ids, group_ids, description } = req.body;
  if (!title) {
    console.log('Erreur : title manquant');
    return res.status(400).json({ message: 'Title is required.' });
  }
  
  // Pour les tâches indépendantes, description est obligatoire
  if (!project_id && !description) {
    return res.status(400).json({ message: 'Description is required for standalone tasks.' });
  }
  
  try {
    const newTask = await addTask({ 
      title, 
      description: description || '', 
      status: status || 'to do', 
      deadline, 
      priority: priority || 'medium', 
      project_id 
    }, user_ids || [], group_ids || []);
    console.log('Tâche créée avec succès :', newTask);
    // Notifications
    (async () => {
      try {
        // Best-effort set creator if column exists
        try {
          if (req.user?.id) {
            await supabase.from('tasks').update({ created_by: req.user.id }).eq('id', newTask.id);
          }
        } catch (_) {}
        if (req.user?.role === 'admin') {
          await notifyAdminsOnCreation({ req, itemType: 'Task', itemId: newTask.id, itemName: newTask.title || 'Task' });
        }
        await notifyAssigneesOnAssignment({ req, itemType: 'Task', itemId: newTask.id, itemName: newTask.title || 'Task', newAssigneeIds: user_ids || [] });
      } catch (e) {
        console.error('[createTask] notification error', e);
      }
    })();
    res.status(201).json(newTask);
  } catch (err) {
    console.error('Erreur lors de la création de la tâche :', err);
    res.status(500).json({ message: err.message || 'Failed to create task' });
  }
}

async function updateTask(req, res) {
  const { id } = req.params;
  const { user_ids, group_ids, ...updates } = req.body;
  try {
    // Detect new direct assignees only (groups produce separate notifications would require more logic)
    let previousAssignees = [];
    if (Array.isArray(user_ids)) {
      try {
        previousAssignees = await getTaskAssignees(id);
      } catch (_) {}
    }
    const updated = await updateTaskService(id, updates, user_ids || [], group_ids || []);
    if (Array.isArray(user_ids)) {
      const prevSet = new Set(previousAssignees || []);
      const newOnly = (user_ids || []).filter(uid => !prevSet.has(uid));
      if (newOnly.length > 0) {
        (async () => {
          try {
            await notifyAssigneesOnAssignment({ req, itemType: 'Task', itemId: id, itemName: updated?.title || 'Task', newAssigneeIds: newOnly });
          } catch (e) {
            console.error('[updateTask] notify error', e);
          }
        })();
      }
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update task' });
  }
}

async function deleteTask(req, res) {
  const { id } = req.params;
  try {
    await deleteTaskService(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete task' });
  }
}

async function getTasksByProjectAndUserController(req, res) {
  const { projectId, userId } = req.params;
  try {
    const tasks = await getTasksByProjectAndUser(projectId, userId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch user project tasks' });
  }
}

module.exports = { 
  getTasks, 
  getStandaloneTasksController,
  getProjectTasksController,
  getUserTasksController,
  getAllUserTasksController,
  getTasksByProject, 
  getTasksByProjectWithAssigneesController,
  createTask, 
  updateTask, 
  deleteTask, 
  getTasksByProjectAndUserController 
}; 