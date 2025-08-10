const { supabase } = require('../services/supabaseClient');

// Middleware to verify authentication
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user role from database
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData) {
      return res.status(401).json({ message: 'User role not found' });
    }

    req.user = { ...user, role: userData.role };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware to check if user can modify tasks (admin, creator, direct/group assignee)
const canModifyTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('[canModifyTask] Checking modify access for task:', id, 'user:', userId, 'role:', userRole);

    // Admin can modify any task
    if (userRole === 'admin') {
      console.log('[canModifyTask] Admin access granted');
      return next();
    }

    // Basic task check
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !task) {
      console.log('[canModifyTask] Task not found or error:', error);
      return res.status(404).json({ message: 'Task not found' });
    }

    // Creator can modify
    if (task.created_by && task.created_by === userId) {
      console.log('[canModifyTask] Access granted - user is creator');
      return next();
    }

    // Direct assignee?
    const { data: taskAssignments } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', id);
    const isDirectlyAssigned = (taskAssignments || []).some(a => a.user_id === userId);

    // Group assignee?
    const { data: groupAssignments } = await supabase
      .from('group_task_assignments')
      .select('group_id')
      .eq('task_id', id);
    let isGroupAssigned = false;
    if ((groupAssignments || []).length > 0) {
      const groupIds = groupAssignments.map(g => g.group_id);
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .in('group_id', groupIds);
      isGroupAssigned = (groupMembers || []).length > 0;
    }

    console.log('[canModifyTask] isDirectlyAssigned:', isDirectlyAssigned, 'isGroupAssigned:', isGroupAssigned);

    if (isDirectlyAssigned || isGroupAssigned) {
      console.log('[canModifyTask] Access granted - user is assigned');
      return next();
    }

    // If the task belongs to a project, allow users who can access the project to modify files
    if (task.project_id) {
      console.log('[canModifyTask] Task has project_id. Checking project access for project:', task.project_id);
      const { data: projAssignees } = await supabase
        .from('project_assignees')
        .select('user_id')
        .eq('project_id', task.project_id);
      const isDirectProjectAssignee = (projAssignees || []).some(a => a.user_id === userId);

      const { data: groupProjLinks } = await supabase
        .from('group_project_assignments')
        .select('group_id')
        .eq('project_id', task.project_id);
      const projectGroupIds = (groupProjLinks || []).map(x => x.group_id);
      let isProjectGroupMember = false;
      if (projectGroupIds.length > 0) {
        const { data: projectGroupMembers } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId)
          .in('group_id', projectGroupIds);
        isProjectGroupMember = (projectGroupMembers || []).length > 0;
      }
      console.log('[canModifyTask] isDirectProjectAssignee:', isDirectProjectAssignee, 'isProjectGroupMember:', isProjectGroupMember);
      if (isDirectProjectAssignee || isProjectGroupMember) {
        console.log('[canModifyTask] Access granted - user can modify via project membership');
        return next();
      }
    }

    return res.status(403).json({ message: 'Access denied: You can only modify tasks assigned to you' });
  } catch (error) {
    console.error('Task access check error:', error);
    res.status(500).json({ message: 'Failed to verify task access' });
  }
};

// Middleware to check if user can view tasks (admin, creator, task assignee, or project assignee)
const canViewTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('[canViewTask] Checking access for task:', id, 'user:', userId, 'role:', userRole);

    // Admin can view any task
    if (userRole === 'admin') {
      console.log('[canViewTask] Admin access granted');
      return next();
    }

    // For member/guest, check if they are assigned to the task
    // First, get the basic task info
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      console.log('[canViewTask] Task not found or error:', error);
      return res.status(404).json({ message: 'Task not found' });
    }

    console.log('[canViewTask] Basic task found:', { id: task.id, created_by: task.created_by });

    // Get task assignments separately
    console.log('[canViewTask] Querying task_assignees for task_id:', id);
    const { data: taskAssignments, error: assignError } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', id);

    console.log('[canViewTask] Querying group_task_assignments for task_id:', id);
    const { data: groupAssignments, error: groupError } = await supabase
      .from('group_task_assignments')
      .select('group_id')
      .eq('task_id', id);

    console.log('[canViewTask] Task assignments result:', { data: taskAssignments, error: assignError });
    console.log('[canViewTask] Group assignments result:', { data: groupAssignments, error: groupError });

    // Create the structure expected by the rest of the function
    task.task_assignments = taskAssignments || [];
    task.group_task_assignments = groupAssignments || [];

    console.log('[canViewTask] Task data:', {
      id: task.id,
      created_by: task.created_by,
      task_assignments: task.task_assignments,
      group_task_assignments: task.group_task_assignments
    });

    // Allow creator to view
    console.log('[canViewTask] Comparing creator:', { created_by: task.created_by, userId: userId, match: task.created_by === userId });
    if (task.created_by && task.created_by === userId) {
      console.log('[canViewTask] Access granted - user is creator');
      return next();
    }

    // Check if user is directly assigned
    const isDirectlyAssigned = task.task_assignments.some(assignment => {
      console.log('[canViewTask] Checking assignment:', { assignment_user_id: assignment.user_id, userId: userId, match: assignment.user_id === userId });
      return assignment.user_id === userId;
    });
    console.log('[canViewTask] Is directly assigned:', isDirectlyAssigned);
    
    // Check if user is assigned via group
    let isGroupAssigned = false;
    if (task.group_task_assignments.length > 0) {
      const groupIds = task.group_task_assignments.map(ga => ga.group_id);
      const { data: groupMembers, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .in('group_id', groupIds);
      
      isGroupAssigned = groupMembers && groupMembers.length > 0;
      console.log('[canViewTask] User groups in task groups:', groupMembers);
    }
    console.log('[canViewTask] Is group assigned:', isGroupAssigned);

    if (isDirectlyAssigned || isGroupAssigned) {
      console.log('[canViewTask] Access granted - user is assigned');
      return next();
    }

    // If the task belongs to a project, allow users who can access the project
    if (task.project_id) {
      console.log('[canViewTask] Task has project_id. Checking project access for project:', task.project_id);
      // Direct project assignee
      const { data: projAssignees, error: paErr } = await supabase
        .from('project_assignees')
        .select('user_id')
        .eq('project_id', task.project_id);
      const isDirectProjectAssignee = (projAssignees || []).some(a => a.user_id === userId);
      console.log('[canViewTask] isDirectProjectAssignee:', isDirectProjectAssignee, 'error:', paErr);

      // Via group assignment to project
      const { data: groupProjLinks, error: gplErr } = await supabase
        .from('group_project_assignments')
        .select('group_id')
        .eq('project_id', task.project_id);
      const projectGroupIds = (groupProjLinks || []).map(x => x.group_id);
      let isProjectGroupMember = false;
      if (projectGroupIds.length > 0) {
        const { data: projectGroupMembers } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId)
          .in('group_id', projectGroupIds);
        isProjectGroupMember = (projectGroupMembers || []).length > 0;
      }
      console.log('[canViewTask] isProjectGroupMember:', isProjectGroupMember, 'error:', gplErr);

      if (isDirectProjectAssignee || isProjectGroupMember) {
        console.log('[canViewTask] Access granted - user can access task via project assignment');
        return next();
      }
    }

    console.log('[canViewTask] Access denied - user not assigned');
    return res.status(403).json({ message: 'Access denied: You can only view tasks assigned to you' });
  } catch (error) {
    console.error('Task access check error:', error);
    res.status(500).json({ message: 'Failed to verify task access' });
  }
};

module.exports = {
  authenticateUser,
  requireAdmin,
  canModifyTask,
  canViewTask
};

// --- Project access middleware ---
async function canAccessProject(req, res, next) {
  try {
    const { id } = req.params; // project id
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'admin') return next();

    // direct assignee?
    const { data: direct, error: derr } = await supabase
      .from('project_assignees')
      .select('user_id')
      .eq('project_id', id);
    if (derr) return res.status(500).json({ message: derr.message });
    const isDirect = (direct || []).some(r => r.user_id === userId);
    if (isDirect) return next();

    // via groups?
    const { data: groupLinks, error: glerr } = await supabase
      .from('group_project_assignments')
      .select('group_id')
      .eq('project_id', id);
    if (glerr) return res.status(500).json({ message: glerr.message });
    const groupIds = (groupLinks || []).map(x => x.group_id);
    if (groupIds.length === 0) return res.status(403).json({ message: 'Access denied' });
    const { data: members, error: merr } = await supabase
      .from('group_members')
      .select('user_id')
      .in('group_id', groupIds);
    if (merr) return res.status(500).json({ message: merr.message });
    const isViaGroup = (members || []).some(m => m.user_id === userId);
    if (isViaGroup) return next();

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Project access check error:', error);
    res.status(500).json({ message: 'Failed to verify project access' });
  }
}

module.exports.canAccessProject = canAccessProject;