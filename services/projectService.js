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
    // Remove all previous assignees
    await supabase.from('project_assignees').delete().eq('project_id', id);
    // Insert new assignees (UUID only)
    if (user_ids.length > 0) {
      const validUserIds = user_ids.filter(isUUID);
      console.log('[updateProjectById] Filtered validUserIds:', validUserIds);
      const assignees = validUserIds.map(user_id => ({ project_id: id, user_id }));
      console.log('[updateProjectById] Assignees to insert:', assignees);
      const { data: assigneeData, error: assigneeError } = await supabase.from('project_assignees').insert(assignees);
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