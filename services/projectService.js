const { supabase } = require('./supabaseClient');

async function getAllProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('start', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function addProject(project) {
  const { data, error } = await supabase.from('projects').insert([project]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateProjectById(id, updates) {
  const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteProjectById(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

module.exports = { getAllProjects, addProject, updateProjectById, deleteProjectById }; 