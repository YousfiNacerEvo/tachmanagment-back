const { supabase } = require('./supabaseClient');

async function getAllProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('start', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function addProject(project, user_ids = []) {
  const { user_id, user_ids: ignore, ...projectData } = project;
  const { data, error } = await supabase.from('projects').insert([projectData]).select().single();
  if (error) throw new Error(error.message);
  
  // Insert assignees if provided
  if (data && user_ids && user_ids.length > 0) {
    const assignees = user_ids.map(user_id => ({ project_id: data.id, user_id }));
    const { error: assigneeError } = await supabase.from('project_assignees').insert(assignees);
    if (assigneeError) throw new Error(assigneeError.message);
  }
  
  return data;
}

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function updateProjectById(id, updates, user_ids) {
  console.log('[updateProjectById] id:', id);
  console.log('[updateProjectById] updates (raw):', updates);
  console.log('[updateProjectById] user_ids reçus:', user_ids);
  // Ignore user_ids AND group_ids AND id
  const { user_ids: ignore1, group_ids: ignore2, id: ignore3, ...projectData } = updates;
  console.log('[updateProjectById] projectData to update:', projectData);
  const { data, error } = await supabase.from('projects').update(projectData).eq('id', id).select().single();
  console.log('[updateProjectById] update result:', { data, error });
  if (error) {
    console.error('[updateProjectById] Error updating project:', error);
    throw new Error(error.message);
  }

  // Update assignees if provided
  if (user_ids !== undefined) {
    console.log('[updateProjectById] Incoming user_ids:', user_ids);
    const validUniqueUserIds = Array.from(new Set((user_ids || []).filter(isUUID)));
    console.log('[updateProjectById] Filtered unique valid user IDs:', validUniqueUserIds);

    // Read existing assignees
    const { data: existingRows, error: readErr } = await supabase
      .from('project_assignees')
      .select('user_id')
      .eq('project_id', id);
    if (readErr) {
      console.error('[updateProjectById] Error reading existing assignees:', readErr);
      throw new Error(readErr.message);
    }
    const existingIds = (existingRows || []).map(r => r.user_id);
    const existingSet = new Set(existingIds);

    // Compute diff
    const toDelete = existingIds.filter(uid => !validUniqueUserIds.includes(uid));
    const toInsert = validUniqueUserIds.filter(uid => !existingSet.has(uid));
    console.log('[updateProjectById] toDelete:', toDelete, 'toInsert:', toInsert);

    // Delete removed assignees
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('project_assignees')
        .delete()
        .eq('project_id', id)
        .in('user_id', toDelete);
      if (delErr) {
        console.error('[updateProjectById] Error deleting removed assignees:', delErr);
        throw new Error(delErr.message);
      }
    }

    // Insert new assignees (ignore duplicates by only inserting diffs)
    if (toInsert.length > 0) {
      const assignees = toInsert.map(user_id => ({ project_id: id, user_id }));
      const { data: assigneeData, error: assigneeError } = await supabase
        .from('project_assignees')
        .insert(assignees);
      console.log('[updateProjectById] assignee insert result:', { assigneeData, assigneeError });
      if (assigneeError) {
        console.error('[updateProjectById] Error inserting assignees:', assigneeError);
        throw new Error(assigneeError.message);
      }
    }
  }

  return data;
}

async function deleteProjectById(id) {
  // Collect related tasks and files first
  let taskRows = [];
  let projectRow = null;
  try {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, files')
      .eq('project_id', id);
    taskRows = Array.isArray(tasks) ? tasks : [];
  } catch (_) {}

  try {
    const { data: proj } = await supabase
      .from('projects')
      .select('files')
      .eq('id', id)
      .single();
    projectRow = proj || null;
  } catch (_) {}

  // Best-effort: remove storage files for project and its tasks
  try {
    const pathsToRemove = [];
    const projectFiles = Array.isArray(projectRow?.files) ? projectRow.files : [];
    for (const f of projectFiles) {
      if (f && f.path) pathsToRemove.push(f.path);
    }
    for (const t of taskRows) {
      const taskFiles = Array.isArray(t?.files) ? t.files : [];
      for (const f of taskFiles) {
        if (f && f.path) pathsToRemove.push(f.path);
      }
    }
    if (pathsToRemove.length > 0) {
      await supabase.storage.from('filesmanagment').remove(pathsToRemove);
    }
  } catch (_) {}

  // Delete task-related relations and tasks
  const taskIds = taskRows.map(t => t.id).filter(Boolean);
  try {
    if (taskIds.length > 0) {
      await supabase.from('task_assignees').delete().in('task_id', taskIds);
      await supabase.from('group_task_assignments').delete().in('task_id', taskIds);
    }
  } catch (_) {}
  try {
    await supabase.from('tasks').delete().eq('project_id', id);
  } catch (e) {
    throw new Error(e.message);
  }

  // Delete project-related relations
  try { await supabase.from('project_assignees').delete().eq('project_id', id); } catch (_) {}
  try { await supabase.from('group_project_assignments').delete().eq('project_id', id); } catch (_) {}

  // Finally delete the project
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

async function getProjectsByUser(userId) {
  console.log('getProjectsByUser called with userId:', userId);
  
  // Version de test : récupérer tous les projets
  const { data: allProjects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('start', { ascending: true });
  
  console.log('allProjects query result:', { data: allProjects, error: projectsError });
  
  if (projectsError) throw new Error(projectsError.message);
  
  return allProjects || [];
}

async function getProjectAssignees(projectId) {
  const { data, error } = await supabase
    .from('project_assignees')
    .select('user_id')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return data.map(assignment => assignment.user_id);
}

async function getAllProjectsWithAssignees() {
  const { data: projects, error } = await supabase.from('projects').select('*').order('start', { ascending: true });
  if (error) throw new Error(error.message);
  
  // Get assignees for each project
  const projectsWithAssignees = await Promise.all(
    projects.map(async (project) => {
      const assignees = await getProjectAssignees(project.id);
      return { ...project, assignees };
    })
  );
  
  return projectsWithAssignees;
}

module.exports = { 
  getAllProjects, 
  getAllProjectsWithAssignees,
  addProject, 
  updateProjectById, 
  deleteProjectById, 
  getProjectsByUser,
  getProjectAssignees
}; 