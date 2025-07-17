const { getAllProjects, addProject, updateProjectById, deleteProjectById } = require('../services/projectService');

async function getProjects(req, res) {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch projects' });
  }
}

async function createProject(req, res) {
  const { title, description, status, start, end } = req.body;
  if (!title || !description || !status || !start || !end) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (new Date(end) < new Date(start)) {
    return res.status(400).json({ message: 'End date cannot be before start date.' });
  }
  try {
    const newProject = await addProject({ title, description, status, start, end });
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create project' });
  }
}

async function updateProject(req, res) {
  const { id } = req.params;
  try {
    const updated = await updateProjectById(id, req.body);
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

module.exports = { getProjects, createProject, updateProject, deleteProject };
