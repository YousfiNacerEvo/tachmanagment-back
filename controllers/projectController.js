const { getAllProjects, getAllProjectsWithAssignees, addProject, updateProjectById, deleteProjectById, getProjectsByUser, getProjectAssignees } = require('../services/projectService');
const { notifyAdminsOnCreation, notifyAssigneesOnAssignment } = require('../services/notificationService');
const { supabase } = require('../services/supabaseClient');

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
    // Fire-and-forget notifications (no await to avoid slowing response, but catch errors)
    (async () => {
      try {
        // Best-effort set creator if column exists
        try {
          if (req.user?.id) {
            await supabase.from('projects').update({ created_by: req.user.id }).eq('id', newProject.id);
          }
        } catch (_) {}
        if (req.user?.role === 'admin') {
          await notifyAdminsOnCreation({ req, itemType: 'Project', itemId: newProject.id, itemName: newProject.title || newProject.name || 'Project' });
        }
        await notifyAssigneesOnAssignment({ req, itemType: 'Project', itemId: newProject.id, itemName: newProject.title || newProject.name || 'Project', newAssigneeIds: user_ids || [] });
      } catch (e) {
        console.error('[createProject] notification error', e);
      }
    })();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create project' });
  }
}

async function updateProject(req, res) {
  const { id } = req.params;
  const { user_ids, ...updates } = req.body;
  console.log(' SUIII[updateProject] user_ids reçus:', user_ids);
  try {
    // Fetch existing assignees to detect new assignments
    let previousAssignees = [];
    if (Array.isArray(user_ids)) {
      try {
        previousAssignees = await getProjectAssignees(id);
      } catch (_) {}
    }

    const updated = await updateProjectById(id, updates, user_ids);

    // Notify only users who are newly assigned
    if (Array.isArray(user_ids)) {
      const prevSet = new Set(previousAssignees || []);
      const newOnly = (user_ids || []).filter(uid => !prevSet.has(uid));
      if (newOnly.length > 0) {
        (async () => {
          try {
            await notifyAssigneesOnAssignment({ req, itemType: 'Project', itemId: id, itemName: updated?.title || updated?.name || 'Project', newAssigneeIds: newOnly });
          } catch (e) {
            console.error('[updateProject] notify error', e);
          }
        })();
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('SuiiiUpdate project error:', err); // Log the error object
    console.error('SUIIiRequest body:', req.body);    // Log the request body
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
