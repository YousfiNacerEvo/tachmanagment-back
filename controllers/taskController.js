const { getAllTasks, getTasksByProject: getTasksByProjectService, getTasksByProjectWithAssignees, addTask, updateTask: updateTaskService, deleteTask: deleteTaskService, getTasksByProjectAndUser } = require('../services/taskService');

async function getTasks(req, res) {
  try {
    const tasks = await getAllTasks();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch tasks' });
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

async function createTask(req, res) {
  console.log('Reçu pour création de tâche :', req.body);
  const { title, status, deadline, priority, project_id, user_ids } = req.body;
  if (!title || !project_id) {
    console.log('Erreur : title ou project_id manquant');
    return res.status(400).json({ message: 'Title and project_id are required.' });
  }
  try {
    const newTask = await addTask({ title, status: status || 'à faire', deadline, priority: priority || 'moyenne', project_id }, user_ids);
    console.log('Tâche créée avec succès :', newTask);
    res.status(201).json(newTask);
  } catch (err) {
    console.error('Erreur lors de la création de la tâche :', err);
    res.status(500).json({ message: err.message || 'Failed to create task' });
  }
}

async function updateTask(req, res) {
  const { id } = req.params;
  const { user_ids, ...updates } = req.body;
  try {
    const updated = await updateTaskService(id, updates, user_ids);
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

// GET /api/tasks/project/:projectId/user/:userId
async function getTasksByProjectAndUserController(req, res) {
  const { projectId, userId } = req.params;
  try {
    if (!projectId || !userId) return res.status(400).json({ message: 'Project id and user id are required.' });
    const tasks = await getTasksByProjectAndUser(projectId, userId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch project tasks for user' });
  }
}

module.exports = { getTasks, getTasksByProject, createTask, updateTask, deleteTask, getTasksByProjectAndUserController }; 