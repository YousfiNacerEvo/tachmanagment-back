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

// Middleware to check if user can modify tasks (admin or task assignee)
const canModifyTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin can modify any task
    if (userRole === 'admin') {
      return next();
    }

    // For member/guest, check if they are assigned to the task
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(user_id),
        group_task_assignments(
          group_id,
          groups(
            group_members(user_id)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is directly assigned
    const isDirectlyAssigned = task.task_assignments.some(assignment => assignment.user_id === userId);
    
    // Check if user is assigned via group
    const isGroupAssigned = task.group_task_assignments.some(groupAssignment => 
      groupAssignment.groups.group_members.some(member => member.user_id === userId)
    );

    if (isDirectlyAssigned || isGroupAssigned) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: You can only modify tasks assigned to you' });
  } catch (error) {
    console.error('Task access check error:', error);
    res.status(500).json({ message: 'Failed to verify task access' });
  }
};

// Middleware to check if user can view tasks (admin or task assignee)
const canViewTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin can view any task
    if (userRole === 'admin') {
      return next();
    }

    // For member/guest, check if they are assigned to the task
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(user_id),
        group_task_assignments(
          group_id,
          groups(
            group_members(user_id)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is directly assigned
    const isDirectlyAssigned = task.task_assignments.some(assignment => assignment.user_id === userId);
    
    // Check if user is assigned via group
    const isGroupAssigned = task.group_task_assignments.some(groupAssignment => 
      groupAssignment.groups.group_members.some(member => member.user_id === userId)
    );

    if (isDirectlyAssigned || isGroupAssigned) {
      return next();
    }

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
