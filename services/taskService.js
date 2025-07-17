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

async function addTask(task) {
  const { data, error } = await supabase.from('tasks').insert([task]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateTask(id, updates) {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

module.exports = { getAllTasks, getTasksByProject, addTask, updateTask, deleteTask }; 