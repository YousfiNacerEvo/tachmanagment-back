const { supabase } = require('./supabaseClient');

// Group CRUD operations
async function createGroup(groupData) {
  const { data, error } = await supabase
    .from('groups')
    .insert([groupData])
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

async function getAllGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data;
}

async function getGroupById(groupId) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

async function updateGroup(groupId, updates) {
  const { data, error } = await supabase
    .from('groups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

async function deleteGroup(groupId) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);
  
  if (error) throw new Error(error.message);
  return { success: true };
}

// Group members operations
async function addMembersToGroup(groupId, userIds) {
  if (!userIds || userIds.length === 0) return [];
  
  const members = userIds.map(userId => ({
    group_id: groupId,
    user_id: userId
  }));
  
  const { data, error } = await supabase
    .from('group_members')
    .insert(members)
    .select('*');
  
  if (error) throw new Error(error.message);
  return data;
}

async function removeMembersFromGroup(groupId, userIds) {
  if (!userIds || userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .in('user_id', userIds)
    .select('*');
  
  if (error) throw new Error(error.message);
  return data;
}

async function getGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      user_id,
      joined_at,
      users:user_id (
        id,
        email,
        role
      )
    `)
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data.map(item => ({
    user_id: item.user_id,
    joined_at: item.joined_at,
    ...item.users
  }));
}

async function getGroupsByUser(userId) {
  console.log('getGroupsByUser called with userId:', userId);
  
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      joined_at,
      groups:group_id (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });
  
  console.log('getGroupsByUser query result:', { data, error });
  
  if (error) throw new Error(error.message);
  
  const mappedData = data.map(item => ({
    group_id: item.group_id,
    joined_at: item.joined_at,
    ...item.groups
  }));
  
  console.log('getGroupsByUser mapped result:', mappedData);
  
  return mappedData;
}

// Group assignment operations
async function assignGroupToProject(groupId, projectId) {
  // Vérifier seulement les conflits avec les utilisateurs directement assignés
  const conflicts = await checkGroupProjectConflicts(groupId, projectId);
  if (conflicts.length > 0) {
    throw new Error(`Cannot assign group because it contains users already directly assigned to this project: ${conflicts.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('group_project_assignments')
    .insert([{
      group_id: groupId,
      project_id: projectId
    }])
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

// Vérifier les conflits entre groupes et projets
async function checkGroupProjectConflicts(groupId, projectId) {
  try {
    // Récupérer les membres du groupe
    const groupMembers = await getGroupMembers(groupId);
    const memberIds = groupMembers.map(member => member.user_id);
    
    // Récupérer les utilisateurs déjà assignés au projet
    const { data: projectAssignees, error } = await supabase
      .from('project_assignees')
      .select('user_id')
      .eq('project_id', projectId);
    
    if (error) throw new Error(error.message);
    
    const assignedUserIds = projectAssignees.map(assignment => assignment.user_id);
    
    // Trouver les conflits - seulement avec les utilisateurs directement assignés
    const conflicts = memberIds.filter(memberId => assignedUserIds.includes(memberId));
    
    // Récupérer les emails des utilisateurs en conflit
    if (conflicts.length > 0) {
      const { data: conflictUsers, error: userError } = await supabase
        .from('users')
        .select('email')
        .in('id', conflicts);
      
      if (userError) throw new Error(userError.message);
      
      return conflictUsers.map(user => user.email);
    }
    
    return [];
  } catch (error) {
    console.error('Error checking group-project conflicts:', error);
    throw error;
  }
}

async function assignGroupToTask(groupId, taskId) {
  // Vérifier seulement les conflits avec les utilisateurs directement assignés
  const conflicts = await checkGroupTaskConflicts(groupId, taskId);
  if (conflicts.length > 0) {
    throw new Error(`Cannot assign group because it contains users already directly assigned to this task: ${conflicts.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('group_task_assignments')
    .insert([{
      group_id: groupId,
      task_id: taskId
    }])
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

// Vérifier les conflits entre groupes et tâches
async function checkGroupTaskConflicts(groupId, taskId) {
  try {
    // Récupérer les membres du groupe
    const groupMembers = await getGroupMembers(groupId);
    const memberIds = groupMembers.map(member => member.user_id);
    
    // Récupérer les utilisateurs déjà assignés à la tâche
    const { data: taskAssignees, error } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId);
    
    if (error) throw new Error(error.message);
    
    const assignedUserIds = taskAssignees.map(assignment => assignment.user_id);
    
    // Trouver les conflits - seulement avec les utilisateurs directement assignés
    const conflicts = memberIds.filter(memberId => assignedUserIds.includes(memberId));
    
    // Récupérer les emails des utilisateurs en conflit
    if (conflicts.length > 0) {
      const { data: conflictUsers, error: userError } = await supabase
        .from('users')
        .select('email')
        .in('id', conflicts);
      
      if (userError) throw new Error(userError.message);
      
      return conflictUsers.map(user => user.email);
    }
    
    return [];
  } catch (error) {
    console.error('Error checking group-task conflicts:', error);
    throw error;
  }
}

async function unassignGroupFromProject(groupId, projectId) {
  const { data, error } = await supabase
    .from('group_project_assignments')
    .delete()
    .eq('group_id', groupId)
    .eq('project_id', projectId)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

async function unassignGroupFromTask(groupId, taskId) {
  const { data, error } = await supabase
    .from('group_task_assignments')
    .delete()
    .eq('group_id', groupId)
    .eq('task_id', taskId)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

async function getGroupsByProject(projectId) {
  console.log('[getGroupsByProject] projectId:', projectId);
  console.log('[getGroupsByProject] projectId type:', typeof projectId);
  
  const { data, error } = await supabase
    .from('group_project_assignments')
    .select(`
      group_id,
      assigned_at,
      groups:group_id (
        id,
        name,
        description
      )
    `)
    .eq('project_id', projectId)
    .order('assigned_at', { ascending: true });
  
  console.log('[getGroupsByProject] query result:', { data, error });
  
  if (error) throw new Error(error.message);
  return data.map(item => ({
    group_id: item.group_id,
    assigned_at: item.assigned_at,
    ...item.groups
  }));
}

async function getGroupsByTask(taskId) {
  const { data, error } = await supabase
    .from('group_task_assignments')
    .select(`
      group_id,
      assigned_at,
      groups:group_id (
        id,
        name,
        description
      )
    `)
    .eq('task_id', taskId)
    .order('assigned_at', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data.map(item => ({
    group_id: item.group_id,
    assigned_at: item.assigned_at,
    ...item.groups
  }));
}

// Get groups with member count
async function getGroupsWithMemberCount() {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      member_count:group_members(count)
    `)
    .order('name', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data;
}

// Get group with full details (members, projects, tasks)
async function getGroupWithDetails(groupId) {
  const [group, members, projects, tasks] = await Promise.all([
    getGroupById(groupId),
    getGroupMembers(groupId),
    getGroupsByProject(groupId),
    getGroupsByTask(groupId)
  ]);
  
  return {
    ...group,
    members,
    projects,
    tasks
  };
}

// Retourne tous les groupes d'un utilisateur avec membres et tâches
async function getGroupsWithDetailsByUser(userId) {
  console.log('getGroupsWithDetailsByUser called with userId:', userId);
  try {
    // 1. Récupérer les groupes de l'utilisateur
    const groups = await getGroupsByUser(userId);
    console.log('Groups found:', groups);
    // 2. Pour chaque groupe, récupérer membres et tâches
    const detailedGroups = await Promise.all(groups.map(async (group) => {
      console.log('Processing group:', group);
      const members = await getGroupMembers(group.group_id);
      console.log('Members for group', group.group_id, ':', members);
      // Récupérer les tâches assignées à ce groupe
      const { data: tasks, error: taskError } = await supabase
        .from('group_task_assignments')
        .select(`
          task_id,
          tasks:task_id (
            id,
            title,
            description,
            status,
            priority,
            deadline
          )
        `)
        .eq('group_id', group.group_id);
      if (taskError) throw new Error(taskError.message);
      console.log('Tasks for group', group.group_id, ':', tasks);
      return {
        ...group,
        members: members.map(m => ({
          id: m.user_id,
          email: m.email,
          role: m.role
        })),
        tasks: (tasks || []).map(t => t.tasks)
      };
    }));
    console.log('Final detailed groups:', detailedGroups);
    return detailedGroups;
  } catch (error) {
    console.error('Error in getGroupsWithDetailsByUser:', error);
    throw error;
  }
}

module.exports = {
  // Group CRUD
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  
  // Group members
  addMembersToGroup,
  removeMembersFromGroup,
  getGroupMembers,
  getGroupsByUser,
  
  // Group assignments
  assignGroupToProject,
  assignGroupToTask,
  unassignGroupFromProject,
  unassignGroupFromTask,
  getGroupsByProject,
  getGroupsByTask,
  
  // Conflict checking
  checkGroupProjectConflicts,
  checkGroupTaskConflicts,
  
  // Utilities
  getGroupsWithMemberCount,
  getGroupWithDetails,
  getGroupsWithDetailsByUser
}; 