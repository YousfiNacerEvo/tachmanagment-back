const { supabase } = require('./supabaseClient');

// --- Overdue status utilities ---
function normalizeStatusForOverdue(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'done' || s === 'completed') return 'done';
  if (s === 'overdue') return 'overdue';
  if (s === 'to do' || s === 'todo' || s === 'pending') return 'todo';
  if (s === 'in progress' || s === 'in_progress') return 'in_progress';
  return s || 'other';
}

function toYmd(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

async function applyOverdueStatus(tasks) {
  try {
    if (!Array.isArray(tasks) || tasks.length === 0) return tasks;
    const today = toYmd(new Date());
    const idsToOverdue = [];
    for (const t of tasks) {
      if (!t || !t.deadline) continue;
      const deadline = toYmd(t.deadline);
      if (!deadline) continue;
      const normalized = normalizeStatusForOverdue(t.status);
      const isClosed = normalized === 'done' || normalized === 'overdue';
      if (!isClosed && deadline < today) {
        idsToOverdue.push(t.id);
        // update in-memory immediately for consistent responses
        t.status = 'overdue';
      }
    }
    if (idsToOverdue.length > 0) {
      await supabase.from('tasks').update({ status: 'overdue' }).in('id', idsToOverdue);
    }
  } catch (err) {
    // Non-blocking: log and continue
    console.error('[applyOverdueStatus] failed to persist overdue updates:', err);
  }
  return tasks;
}

async function getAllTasks() {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  await applyOverdueStatus(data);
  return data;
}

// Utilitaire pour normaliser les assignations
function normalizeIds(arr, key) {
  if (!Array.isArray(arr)) return [];
  if (arr.length === 0) return [];
  if (typeof arr[0] === 'object' && arr[0] !== null && key in arr[0]) {
    return arr.map(obj => obj[key]);
  }
  return arr;
}

// Récupère tous les user_id membres d'une liste de groupes
async function getGroupMemberUserIds(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return [];
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id')
    .in('group_id', groupIds);
  if (error) throw new Error(error.message);
  return (data || []).map(row => row.user_id);
}

// Nouvelle fonction pour récupérer toutes les tâches avec leurs assignés
async function getAllTasksWithAssignees() {
  const { data: tasks, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  
  const tasksWithAssignees = await Promise.all(
    tasks.map(async (task) => {
      const [assignees, groups] = await Promise.all([
        getTaskAssignees(task.id),
        getTaskGroups(task.id)
      ]);
      const user_ids_raw = normalizeIds(assignees, 'user_id');
      const group_ids = normalizeIds(groups, 'group_id');
      // Filtrer les utilisateurs qui sont membres des groupes assignés
      const memberIds = await getGroupMemberUserIds(group_ids);
      const user_ids = (user_ids_raw || []).filter(uid => !memberIds.includes(uid));
      const result = { ...task, assignees: user_ids, user_ids, groups: group_ids, group_ids };
      console.log('[getAllTasksWithAssignees] task:', result);
      return result;
    })
  );
  return tasksWithAssignees;
}

// Nouvelle fonction pour récupérer les tâches indépendantes
async function getStandaloneTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .is('project_id', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  await applyOverdueStatus(data);
  return data;
}

// Nouvelle fonction pour récupérer les tâches indépendantes avec assignés
async function getStandaloneTasksWithAssignees() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .is('project_id', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  await applyOverdueStatus(tasks);
  
  const tasksWithAssignees = await Promise.all(
    tasks.map(async (task) => {
      const [assignees, groups] = await Promise.all([
        getTaskAssignees(task.id),
        getTaskGroups(task.id)
      ]);
      const user_ids_raw = normalizeIds(assignees, 'user_id');
      const group_ids = normalizeIds(groups, 'group_id');
      const memberIds = await getGroupMemberUserIds(group_ids);
      const user_ids = (user_ids_raw || []).filter(uid => !memberIds.includes(uid));
      const result = { ...task, assignees: user_ids, user_ids, groups: group_ids, group_ids };
      console.log('[getStandaloneTasksWithAssignees] task:', result);
      return result;
    })
  );
  return tasksWithAssignees;
}

// Nouvelle fonction pour récupérer les tâches de projet
async function getProjectTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .not('project_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  await applyOverdueStatus(data);
  return data;
}

// Nouvelle fonction pour récupérer les tâches de projet avec assignés
async function getProjectTasksWithAssignees() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .not('project_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  await applyOverdueStatus(tasks);
  
  const tasksWithAssignees = await Promise.all(
    tasks.map(async (task) => {
      const [assignees, groups] = await Promise.all([
        getTaskAssignees(task.id),
        getTaskGroups(task.id)
      ]);
      const user_ids_raw = normalizeIds(assignees, 'user_id');
      const group_ids = normalizeIds(groups, 'group_id');
      const memberIds = await getGroupMemberUserIds(group_ids);
      const user_ids = (user_ids_raw || []).filter(uid => !memberIds.includes(uid));
      const result = { ...task, assignees: user_ids, user_ids, groups: group_ids, group_ids };
      console.log('[getProjectTasksWithAssignees] task:', result);
      return result;
    })
  );
  return tasksWithAssignees;
}

async function getTasksByProject(projectId) {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  await applyOverdueStatus(data);
  return data;
}

async function getTaskAssignees(taskId) {
  console.log('getTaskAssignees called for taskId:', taskId);
  const { data, error } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', taskId);
  if (error) throw new Error(error.message);
  console.log('Found assignees for task', taskId, ':', data);
  return data.map(assignment => assignment.user_id);
}

async function getTaskGroups(taskId) {
  const { data, error } = await supabase
    .from('group_task_assignments')
    .select('group_id')
    .eq('task_id', taskId);
  if (error) throw new Error(error.message);
  return data.map(assignment => parseInt(assignment.group_id));
}

async function getTasksByProjectWithAssignees(projectId) {
  const { data: tasks, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  await applyOverdueStatus(tasks);
  
  const tasksWithAssignees = await Promise.all(
    tasks.map(async (task) => {
      const [assignees, groups] = await Promise.all([
        getTaskAssignees(task.id),
        getTaskGroups(task.id)
      ]);
      const user_ids_raw = normalizeIds(assignees, 'user_id');
      const group_ids = normalizeIds(groups, 'group_id');
      const memberIds = await getGroupMemberUserIds(group_ids);
      const user_ids = (user_ids_raw || []).filter(uid => !memberIds.includes(uid));
      const result = { ...task, assignees: user_ids, user_ids, groups: group_ids, group_ids };
      console.log('[getTasksByProjectWithAssignees] task:', result);
      return result;
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
  await applyOverdueStatus(allTasks);
  
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

// Nouvelle fonction pour récupérer les tâches assignées à un utilisateur (projets + indépendantes)
async function getTasksByUser(userId) {
  // Get all task assignments for this user
  const { data: userAssignments, error: assignmentsError } = await supabase
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', userId);
  
  if (assignmentsError) throw new Error(assignmentsError.message);
  
  if (userAssignments.length === 0) return [];
  
  // Get all assigned tasks (both project and standalone)
  const assignedTaskIds = userAssignments.map(assignment => assignment.task_id);
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('id', assignedTaskIds)
    .order('created_at', { ascending: false });
  
  if (tasksError) throw new Error(tasksError.message);
  await applyOverdueStatus(tasks);
  return tasks;
}

// Nouvelle fonction pour récupérer toutes les tâches de l'utilisateur (directes + via groupes)
async function getAllTasksByUser(userId) {
  console.log('getAllTasksByUser called with userId:', userId);
  try {
    // 1. Récupérer les tâches assignées directement à l'utilisateur
    const directTasks = await getTasksByUser(userId);
    console.log('directTasks:', directTasks);
    
    // 2. Récupérer les groupes de l'utilisateur
    const { data: userGroups, error: groupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
    
    console.log('userGroups query result:', { data: userGroups, error: groupsError });
    
    if (groupsError) throw new Error(groupsError.message);
    
    let groupTasks = [];
    if (userGroups.length > 0) {
      // 3. Récupérer les tâches assignées aux groupes de l'utilisateur
      const groupIds = userGroups.map(g => g.group_id);
      console.log('groupIds:', groupIds);
      
      const { data: groupTaskAssignments, error: groupTasksError } = await supabase
        .from('group_task_assignments')
        .select('task_id')
        .in('group_id', groupIds);
      
      console.log('groupTaskAssignments query result:', { data: groupTaskAssignments, error: groupTasksError });
      
      if (groupTasksError) throw new Error(groupTasksError.message);
      
      if (groupTaskAssignments.length > 0) {
        const groupTaskIds = groupTaskAssignments.map(a => a.task_id);
        console.log('groupTaskIds:', groupTaskIds);
        
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('id', groupTaskIds)
          .order('created_at', { ascending: false });
        
        console.log('group tasks query result:', { data: tasks, error: tasksError });
        
        if (tasksError) throw new Error(tasksError.message);
        groupTasks = tasks;
      }
    }
    
    // 4. Combiner et dédupliquer les tâches
    const allTasks = [...directTasks, ...groupTasks];
    console.log('allTasks before deduplication:', allTasks);
    
    const uniqueTasks = allTasks.filter((task, index, self) => 
      index === self.findIndex(t => t.id === task.id)
    );
    console.log('uniqueTasks after deduplication:', uniqueTasks);
    
    // 5. Ajouter les informations de projet pour chaque tâche
    const tasksWithProjects = await Promise.all(
      uniqueTasks.map(async (task) => {
        // Vérifier si cette tâche est assignée à des groupes
        const { data: groupAssignments, error: groupError } = await supabase
          .from('group_task_assignments')
          .select('group_id')
          .eq('task_id', task.id);
        
        const isGroupTask = groupAssignments && groupAssignments.length > 0;
        
        if (task.project_id) {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('name')
            .eq('id', task.project_id)
            .single();
          
          console.log('project query for task', task.id, ':', { data: project, error: projectError });
          
          if (!projectError && project) {
            return { ...task, project_name: project.name, is_group_task: isGroupTask };
          }
        }
        return { ...task, project_name: null, is_group_task: isGroupTask };
      })
    );
    
    await applyOverdueStatus(tasksWithProjects);
    console.log('final tasksWithProjects:', tasksWithProjects);
    return tasksWithProjects;
  } catch (error) {
    console.error('Error in getAllTasksByUser:', error);
    throw error;
  }
}

// Ajout d'une tâche avec assignations
async function addTask(task, user_ids = [], group_ids = []) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Ajout des assignations utilisateurs
  if (user_ids && user_ids.length > 0) {
    const { error: assignError } = await supabase
      .from('task_assignees')
      .insert(user_ids.map(user_id => ({ task_id: data.id, user_id })));
    if (assignError) throw new Error(assignError.message);
  }

  // Ajout des assignations groupes
  if (group_ids && group_ids.length > 0) {
    const { error: groupAssignError } = await supabase
      .from('group_task_assignments')
      .insert(group_ids.map(group_id => ({ task_id: data.id, group_id })));
    if (groupAssignError) throw new Error(groupAssignError.message);
  }

  return data;
}

// Mise à jour d'une tâche avec synchronisation des assignations
async function updateTask(id, updates, user_ids = [], group_ids = []) {
 
  // Nettoyer les données pour ne garder que les colonnes qui existent dans la table tasks
  // Remove non-column fields before updating DB
  const {
    user_ids: ignore1,
    group_ids: ignore2,
    assignees: ignore3,
    groups: ignore4,
    id: ignore5,
    files: ignore6, // file updates go through dedicated endpoints
    project_name: ignore7,
    is_group_task: ignore8,
    // progress: ignore9,
    ...taskData
  } = updates;
  console.log('[updateTask] updates (cleaned):', taskData);

  const { data, error } = await supabase
    .from('tasks')
    .update(taskData)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[updateTask] Supabase error:', error);
    throw new Error(error.message);
  }

  // Supprimer les anciennes assignations
  await supabase.from('task_assignees').delete().eq('task_id', id);
  await supabase.from('group_task_assignments').delete().eq('task_id', id);

  // Réinsérer les assignations utilisateurs
  if (user_ids && user_ids.length > 0) {
    const { error: assignError } = await supabase
      .from('task_assignees')
      .insert(user_ids.map(user_id => ({ task_id: id, user_id })));
    if (assignError) {
      console.error('[updateTask] assignError:', assignError);
      throw new Error(assignError.message);
    }
  }

  // Réinsérer les assignations groupes
  if (group_ids && group_ids.length > 0) {
    const { error: groupAssignError } = await supabase
      .from('group_task_assignments')
      .insert(group_ids.map(group_id => ({ task_id: id, group_id })));
    if (groupAssignError) {
      console.error('[updateTask] groupAssignError:', groupAssignError);
      throw new Error(groupAssignError.message);
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
  getAllTasksWithAssignees,
  getStandaloneTasks,
  getStandaloneTasksWithAssignees,
  getProjectTasks,
  getProjectTasksWithAssignees,
  getTasksByProject, 
  getTasksByProjectWithAssignees,
  getTaskAssignees,
  getTaskGroups,
  addTask, 
  updateTask, 
  deleteTask, 
  getTasksByProjectAndUser,
  getTasksByUser,
  getAllTasksByUser
}; 