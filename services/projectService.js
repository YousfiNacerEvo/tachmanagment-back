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

async function updateProjectById(id, updates, user_ids) {
  const { user_ids: ignore, ...projectData } = updates;
  const { data, error } = await supabase.from('projects').update(projectData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  
  // Update assignees if provided
  if (user_ids !== undefined) {
    // Remove all previous assignees
    await supabase.from('project_assignees').delete().eq('project_id', id);
    // Insert new assignees
    if (user_ids.length > 0) {
      const assignees = user_ids.map(user_id => ({ project_id: id, user_id }));
      const { error: assigneeError } = await supabase.from('project_assignees').insert(assignees);
      if (assigneeError) throw new Error(assigneeError.message);
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
  // Get projects where user is assigned
  const { data: assignedProjects, error: assignedError } = await supabase
    .from('project_assignees')
    .select('project_id')
    .eq('user_id', userId);
  
  if (assignedError) throw new Error(assignedError.message);
  
  if (assignedProjects.length > 0) {
    const assignedProjectIds = assignedProjects.map(assignment => assignment.project_id);
    const { data: projectDetails, error: detailsError } = await supabase
      .from('projects')
      .select('*')
      .in('id', assignedProjectIds)
      .order('start', { ascending: true });
    
    if (detailsError) throw new Error(detailsError.message);
    
    return projectDetails;
  }
  
  return [];
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