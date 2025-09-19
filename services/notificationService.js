const cron = require('node-cron');
const { supabase } = require('./supabaseClient');
const { sendEmail } = require('./emailService');
const { adminCreationTemplate, reminderTemplate, assignmentTemplate } = require('./emailTemplates');

// Helper: fetch admin emails
async function getAdminEmails() {
  const { data, error } = await supabase.from('users').select('email').eq('role', 'admin');
  if (error) throw new Error(error.message);
  return (data || []).map(u => u.email).filter(Boolean);
}

// Helper: fetch user emails by ids
async function getUserEmailsByIds(userIds) {
  if (!userIds || userIds.length === 0) return [];
  const { data, error } = await supabase.from('users').select('id, email').in('id', userIds);
  if (error) throw new Error(error.message);
  const map = new Map((data || []).map(u => [u.id, u.email]));
  return userIds.map(id => map.get(id)).filter(Boolean);
}

// Helper: get human creator identity from req.user
function getCreatorNameFromReq(req) {
  const email = req?.user?.email || 'Unknown';
  const name = req?.user?.user_metadata?.full_name || req?.user?.user_metadata?.name || email;
  return { name, email };
}

// URLs
function frontendBase() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function projectLink(projectId) {
  // Requirement: link should open ProjectDrawer only (projects list with drawer)
  return `${frontendBase()}/dashboard/projects?projectId=${encodeURIComponent(projectId)}`;
}

function taskLink(taskId) {
  // Use hash so My Work can parse it even without query
  return `${frontendBase()}/dashboard/my-work#taskId=${encodeURIComponent(taskId)}`;
}

// Public API: call on creation events
async function notifyAdminsOnCreation({ req, itemType, itemId, itemName }) {
  const { name: creatorName } = getCreatorNameFromReq(req);
  const admins = await getAdminEmails();
  if (admins.length === 0) return;
  const href = itemType === 'Project' ? projectLink(itemId) : taskLink(itemId);
  const { subject, html } = adminCreationTemplate({ creatorName, itemType, itemName, href });
  await sendEmail({ to: admins, subject, html });
}

// Public API: call on assignment events (new assignees)
async function notifyAssigneesOnAssignment({ req, itemType, itemId, itemName, newAssigneeIds }) {
  if (!newAssigneeIds || newAssigneeIds.length === 0) return;
  const { name: creatorName } = getCreatorNameFromReq(req);
  const emails = await getUserEmailsByIds(newAssigneeIds);
  if (emails.length === 0) return;
  const href = itemType === 'Project' ? projectLink(itemId) : taskLink(itemId);
  const { subject, html } = assignmentTemplate({ creatorName, itemType, itemName, href });
  await sendEmail({ to: emails, subject, html });
}

// Scheduler: daily reminders at 09:00 server time
function initializeNotificationScheduler() {
  // Every day at 09:00
  cron.schedule('0 9 * * *', async () => {
    try {
      await runDailyReminders();
    } catch (err) {
      console.error('[notificationScheduler] run failed', err);
    }
  });
}

async function runDailyReminders() {
  const today = new Date();
  const yyyyMmDd = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
  const threeDaysFromNow = yyyyMmDd(addDays(today, 3));
  const todayYmd = yyyyMmDd(today);

  // Tasks: reminder at T-3 and T (deadline stored on tasks.deadline)
  const { data: tasks3, error: t3err } = await supabase
    .from('tasks')
    .select('id, title, deadline, project_id, created_by')
    .eq('deadline', threeDaysFromNow);
  if (t3err) throw new Error(t3err.message);

  const { data: tasksToday, error: tderr } = await supabase
    .from('tasks')
    .select('id, title, deadline, project_id, created_by')
    .eq('deadline', todayYmd);
  if (tderr) throw new Error(tderr.message);

  await Promise.all([
    ...tasks3.map(t => sendTaskReminder(t, 3)),
    ...tasksToday.map(t => sendTaskReminder(t, 0)),
  ]);

  // Projects: if you store project end date as deadline
  const { data: projects3, error: p3err } = await supabase
    .from('projects')
    .select('id, title, end, created_by')
    .eq('end', threeDaysFromNow);
  if (p3err) throw new Error(p3err.message);

  const { data: projectsToday, error: pderr } = await supabase
    .from('projects')
    .select('id, title, end, created_by')
    .eq('end', todayYmd);
  if (pderr) throw new Error(pderr.message);

  await Promise.all([
    ...projects3.map(p => sendProjectReminder(p, 3)),
    ...projectsToday.map(p => sendProjectReminder(p, 0)),
  ]);
}

async function sendTaskReminder(task, days) {
  const { id, title, created_by } = task;
  // Determine assignees (direct and groups → flattened to users)
  const { data: direct, error: derr } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', id);
  if (derr) throw new Error(derr.message);
  const directIds = (direct || []).map(r => r.user_id);

  const { data: groupAssignments, error: gerr } = await supabase
    .from('group_task_assignments')
    .select('group_id')
    .eq('task_id', id);
  if (gerr) throw new Error(gerr.message);
  const groupIds = (groupAssignments || []).map(r => r.group_id);

  let memberIds = [];
  if (groupIds.length > 0) {
    const { data: members, error: merr } = await supabase
      .from('group_members')
      .select('user_id')
      .in('group_id', groupIds);
    if (merr) throw new Error(merr.message);
    memberIds = (members || []).map(m => m.user_id);
  }
  const allUserIds = [...new Set([...directIds, ...memberIds])];
  if (allUserIds.length === 0) return;

  // Fetch creator email
  const { data: creator, error: cerr } = await supabase
    .from('users')
    .select('email')
    .eq('id', created_by)
    .single();
  const creatorEmail = cerr ? 'unknown' : (creator?.email || 'unknown');

  const emails = await getUserEmailsByIds(allUserIds);
  if (emails.length === 0) return;

  const href = taskLink(id);
  const { subject, html } = reminderTemplate({ creatorEmail, itemType: 'Task', itemName: title || `Task #${id}`, href, days });
  await sendEmail({ to: emails, subject, html });
}

async function sendProjectReminder(project, days) {
  const { id, title, created_by } = project;
  const { data: assignees, error } = await supabase
    .from('project_assignees')
    .select('user_id')
    .eq('project_id', id);
  if (error) throw new Error(error.message);
  const userIds = (assignees || []).map(a => a.user_id);
  if (userIds.length === 0) return;

  const { data: creator, error: cerr } = await supabase
    .from('users')
    .select('email')
    .eq('id', created_by)
    .single();
  const creatorEmail = cerr ? 'unknown' : (creator?.email || 'unknown');

  const emails = await getUserEmailsByIds(userIds);
  if (emails.length === 0) return;

  const href = projectLink(id);
  const { subject, html } = reminderTemplate({ creatorEmail, itemType: 'Project', itemName: title || `Project #${id}`, href, days });
  await sendEmail({ to: emails, subject, html });
}

module.exports = {
  initializeNotificationScheduler,
  notifyAdminsOnCreation,
  notifyAssigneesOnAssignment,
};


