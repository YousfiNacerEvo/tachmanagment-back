const { getAllProjects, getAllProjectsWithAssignees, addProject, updateProjectById, deleteProjectById, getProjectsByUser } = require('../services/projectService');

async function getProjects(req, res) {
  try {
    const projects = await getAllProjectsWithAssignees();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch projects' });
  }
}

async function createProject(req, res) {
  const { title, description, status, start, end, user_id, user_ids } = req.body;
  if (!title || !description || !status || !start || !end) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (new Date(end) < new Date(start)) {
    return res.status(400).json({ message: 'End date cannot be before start date.' });
  }
  if (!user_ids || user_ids.length === 0) {
    return res.status(400).json({ message: 'At least one user must be assigned to the project.' });
  }
  try {
    const newProject = await addProject({ title, description, status, start, end }, user_ids || []);
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create project' });
  }
}

async function updateProject(req, res) {
  const { id } = req.params;
  const { user_ids, ...updates } = req.body;
  try {
    const updated = await updateProjectById(id, updates, user_ids);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update project' });
  }
}

async function deleteProject(req, res) {
  const { id } = req.params;
  try {
    await deleteProjectById(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete project' });
  }
}

// GET /api/projects/user/:userId
async function getProjectsByUserController(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User id is required.' });
    const projects = await getProjectsByUser(userId);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch user projects' });
  }
}

module.exports = { getProjects, createProject, updateProject, deleteProject, getProjectsByUserController };
