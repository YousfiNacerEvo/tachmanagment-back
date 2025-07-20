const { supabase } = require('./supabaseClient');

async function getAllTasks() {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getTasksByProject(projectId) {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getTaskAssignees(taskId) {
  const { data, error } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', taskId);
  if (error) throw new Error(error.message);
  return data.map(assignment => assignment.user_id);
}

async function getTasksByProjectWithAssignees(projectId) {
  const { data: tasks, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  
  // Get assignees for each task
  const tasksWithAssignees = await Promise.all(
    tasks.map(async (task) => {
      const assignees = await getTaskAssignees(task.id);
      return { ...task, assignees };
    })
  );
  
  return tasksWithAssignees;
}

async function getTasksByProjectAndUser(projectId, userId) {
  // First get all tasks for the project
  const { data: allTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (tasksError) throw new Error(tasksError.message);
  
  // Then get all task assignments for this user
  const { data: userAssignments, error: assignmentsError } = await supabase
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', userId);
  
  if (assignmentsError) throw new Error(assignmentsError.message);
  
  // Filter tasks to only include those assigned to the user
  const assignedTaskIds = userAssignments.map(assignment => assignment.task_id);
  const userTasks = allTasks.filter(task => assignedTaskIds.includes(task.id));
  
  return userTasks;
}

async function addTask(task, user_ids = []) {
  const { user_ids: ignore, ...taskData } = task;
  const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();
  if (error) throw new Error(error.message);
  // Insert assignees
  if (data && user_ids && user_ids.length > 0) {
    const assignees = user_ids.map(user_id => ({ task_id: data.id, user_id }));
    const { error: assigneeError } = await supabase.from('task_assignees').insert(assignees);
    if (assigneeError) throw new Error(assigneeError.message);
  }
  return data;
}

async function updateTask(id, updates, user_ids) {
  const { user_ids: ignore, ...taskData } = updates;
  const { data, error } = await supabase.from('tasks').update(taskData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  // Update assignees if provided
  if (user_ids) {
    // Remove all previous assignees
    await supabase.from('task_assignees').delete().eq('task_id', id);
    // Insert new assignees
    if (user_ids.length > 0) {
      const assignees = user_ids.map(user_id => ({ task_id: id, user_id }));
      const { error: assigneeError } = await supabase.from('task_assignees').insert(assignees);
      if (assigneeError) throw new Error(assigneeError.message);
    }
  }
  return data;
}

async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

module.exports = { 
  getAllTasks, 
  getTasksByProject, 
  getTasksByProjectWithAssignees,
  getTaskAssignees,
  addTask, 
  updateTask, 
  deleteTask, 
  getTasksByProjectAndUser 
}; 