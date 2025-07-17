const { getAllTasks, getTasksByProject: getTasksByProjectService, addTask, updateTask: updateTaskService, deleteTask: deleteTaskService } = require('../services/taskService');

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
    const tasks = await getTasksByProjectService(projectId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch project tasks' });
  }
}

async function createTask(req, res) {
  console.log('Reçu pour création de tâche :', req.body);
  const { title, status, deadline, priority, progress, project_id } = req.body;
  if (!title || !project_id) {
    console.log('Erreur : title ou project_id manquant');
    return res.status(400).json({ message: 'Title and project_id are required.' });
  }
  try {
    const newTask = await addTask({ 
      title, 
      status: status || 'à faire', 
      deadline, 
      priority: priority || 'moyenne', 
    
      project_id 
    });
    console.log('Tâche créée avec succès :', newTask);
    res.status(201).json(newTask);
  } catch (err) {
    console.error('Erreur lors de la création de la tâche :', err);
    res.status(500).json({ message: err.message || 'Failed to create task' });
  }
}

async function updateTask(req, res) {
  const { id } = req.params;
  try {
    const updated = await updateTaskService(id, req.body);
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

module.exports = { getTasks, getTasksByProject, createTask, updateTask, deleteTask }; 