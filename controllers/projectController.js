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
  const { title, description, status, start, end, user_id, user_ids, files } = req.body;
  if (!title || !description || !status || !start || !end) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (new Date(end) < new Date(start)) {
    return res.status(400).json({ message: 'End date cannot be before start date.' });
  }
  try {
    const newProject = await addProject({ title, description, status, start, end, files: Array.isArray(files) ? files : [] }, user_ids || []);
    // Set creator synchronously so access checks work immediately
    try {
      if (req.user?.id) {
        await supabase.from('projects').update({ created_by: req.user.id }).eq('id', newProject.id);
      }
    } catch (_) {}
    // Do NOT send notifications here. Frontend will call /notify after post-create steps succeed.
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create project' });
  }
}

// Trigger notifications after project is fully set up
async function notifyProject(req, res) {
  try {
    const { id } = req.params;
    const { user_ids, name } = req.body || {};
    const itemName = name || 'Project';
    if (req.user?.role === 'admin') {
      await notifyAdminsOnCreation({ req, itemType: 'Project', itemId: id, itemName });
    }
    const assignees = Array.isArray(user_ids) ? user_ids : [];
    await notifyAssigneesOnAssignment({ req, itemType: 'Project', itemId: id, itemName, newAssigneeIds: assignees });
    res.json({ success: true });
  } catch (e) {
    console.error('[notifyProject] error', e);
    res.status(500).json({ message: e.message || 'Failed to send notifications' });
  }
}

module.exports.notifyProject = notifyProject;

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

module.exports = { getProjects, createProject, updateProject, deleteProject, getProjectsByUserController, notifyProject };

// --- Files Endpoints ---
async function getProjectFiles(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('projects').select('files').eq('id', id).single();
    if (error) return res.status(500).json({ message: error.message });

    const files = Array.isArray(data?.files) ? data.files : [];
    // Generate signed URLs for display/preview consistency
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        if (file?.path) {
          try {
            const { data: signed } = await supabase.storage
              .from('filesmanagment')
              .createSignedUrl(file.path, 60 * 60 * 24 * 7); // 7 days
            return { ...file, url: signed?.signedUrl || file.url || '' };
          } catch (_) {
            return file;
          }
        }
        return file;
      })
    );
    res.json(filesWithUrls);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch project files' });
  }
}

async function addProjectFiles(req, res) {
  try {
    const { id } = req.params;
    const projectId = isNaN(Number(id)) ? id : Number(id);
    const incoming = Array.isArray(req.body?.files) ? req.body.files : [];
    const { data: proj, error: ferr } = await supabase.from('projects').select('files').eq('id', projectId).single();
    if (ferr) return res.status(500).json({ message: ferr.message });
    const existing = Array.isArray(proj?.files) ? proj.files : [];
    // Merge by unique path
    const byPath = new Map((existing || []).map(f => [f.path, f]));
    for (const f of incoming) { if (f && f.path) byPath.set(f.path, f); }
    const updated = Array.from(byPath.values());
    const { data, error } = await supabase.from('projects').update({ files: updated }).eq('id', projectId).select('files').single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data.files || []);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to add project files' });
  }
}

async function deleteProjectFile(req, res) {
  try {
    const { id } = req.params;
    const projectId = isNaN(Number(id)) ? id : Number(id);
    const { path } = req.body || {};
    if (!path) return res.status(400).json({ message: 'path is required' });

    // Remove from storage first (best-effort)
    try {
      await supabase.storage.from('filesmanagment').remove([path]);
    } catch (_) {}

    // Remove from DB array
    const { data: proj, error: ferr } = await supabase.from('projects').select('files').eq('id', projectId).single();
    if (ferr) return res.status(500).json({ message: ferr.message });
    const existing = Array.isArray(proj?.files) ? proj.files : [];
    const updated = existing.filter(f => f?.path !== path);
    const { data, error } = await supabase.from('projects').update({ files: updated }).eq('id', projectId).select('files').single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data.files || []);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete project file' });
  }
}

module.exports.getProjectFiles = getProjectFiles;
module.exports.addProjectFiles = addProjectFiles;
module.exports.deleteProjectFile = deleteProjectFile;