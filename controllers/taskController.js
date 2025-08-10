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
  const { title, status, deadline, priority, project_id, user_ids, group_ids, description, files } = req.body;
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
      project_id,
      created_by: req.user?.id || null,
      files: Array.isArray(files) ? files : []
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
    console.error('[updateTask] error details:', { err, body: req.body });
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

// --- Files Endpoints ---
async function getTaskFiles(req, res) {
  try {
    const { id } = req.params;
    console.log('[getTaskFiles] Request for task:', id, 'by user:', req.user?.id, 'role:', req.user?.role);
    const { data, error } = await supabase.from('tasks').select('files').eq('id', id).single();
    if (error) {
      console.log('[getTaskFiles] Database error:', error);
      return res.status(500).json({ message: error.message });
    }
    console.log('[getTaskFiles] Raw files from DB:', data?.files);
    
    const files = data?.files || [];
    
    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        if (file.path) {
          try {
            const { data: signedData } = await supabase.storage
              .from('filesmanagment')
              .createSignedUrl(file.path, 60 * 60 * 24 * 7); // 7 days
            
            return {
              ...file,
              url: signedData?.signedUrl || file.url || ''
            };
          } catch (e) {
            console.log('[getTaskFiles] Error creating signed URL for', file.path, ':', e);
            return file;
          }
        }
        return file;
      })
    );
    
    console.log('[getTaskFiles] Files with URLs:', filesWithUrls);
    res.json(filesWithUrls);
  } catch (err) {
    console.error('[getTaskFiles] Unexpected error:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch task files' });
  }
}

async function addTaskFiles(req, res) {
  try {
    const { id } = req.params;
    const incoming = Array.isArray(req.body?.files) ? req.body.files : [];
    console.log('[addTaskFiles] Incoming files for task', id, 'count:', incoming.length);
    const { data: task, error: ferr } = await supabase.from('tasks').select('files').eq('id', id).single();
    if (ferr) return res.status(500).json({ message: ferr.message });
    const existing = Array.isArray(task?.files) ? task.files : [];
    console.log('[addTaskFiles] Existing files count:', existing.length);
    // Merge by unique path
    const byPath = new Map((existing || []).map(f => [f.path, f]));
    for (const f of incoming) {
      if (f && f.path) byPath.set(f.path, f);
    }
    const updated = Array.from(byPath.values());
    const { data, error } = await supabase.from('tasks').update({ files: updated }).eq('id', id).select('files').single();
    if (error) return res.status(500).json({ message: error.message });
    console.log('[addTaskFiles] Updated files count:', (data?.files || []).length);
    res.json(data.files || []);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to add task files' });
  }
}

async function deleteTaskFile(req, res) {
  try {
    const { id } = req.params;
    const { path } = req.body || {};
    if (!path) return res.status(400).json({ message: 'path is required' });

    // Remove from storage first (best-effort)
    try {
      await supabase.storage.from('filesmanagment').remove([path]);
    } catch (_) {}

    // Remove from DB array
    const { data: task, error: ferr } = await supabase.from('tasks').select('files').eq('id', id).single();
    if (ferr) return res.status(500).json({ message: ferr.message });
    const existing = Array.isArray(task?.files) ? task.files : [];
    const updated = existing.filter(f => f?.path !== path);
    const { data, error } = await supabase.from('tasks').update({ files: updated }).eq('id', id).select('files').single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data.files || []);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete task file' });
  }
}

module.exports.getTaskFiles = getTaskFiles;
module.exports.addTaskFiles = addTaskFiles;
module.exports.deleteTaskFile = deleteTaskFile;