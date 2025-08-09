const { supabase } = require('./supabaseClient');

// Build date filter inclusive for a date column
function applyBetweenDates(query, column, start, end) {
  return query.gte(column, start).lte(column, end);
}

// Aggregate helpers
function groupByDay(rows, dateField) {
  const byDay = new Map();
  for (const row of rows) {
    const d = new Date(row[dateField]);
    if (isNaN(d)) continue;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}

function groupByStatus(rows, statusField = 'status') {
  const counts = new Map();
  for (const row of rows) {
    const s = row[statusField] || 'unknown';
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

function toYmd(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

function deriveTaskStatus(row, todayYmd) {
  const norm = normalizeTaskStatus(row.status);
  if (norm === 'done') return 'done';
  const deadline = row.deadline ? toYmd(row.deadline) : null;
  if (deadline && todayYmd && deadline < todayYmd) return 'overdue';
  return norm;
}

 function generateMonthLabels(start, end) {
   const labels = [];
   const startDate = new Date(start + 'T00:00:00Z');
   const endDate = new Date(end + 'T00:00:00Z');
   // Normalize to first of month UTC
   startDate.setUTCDate(1);
   endDate.setUTCDate(1);
   for (let d = new Date(startDate); d <= endDate; d.setUTCMonth(d.getUTCMonth() + 1)) {
     const yyyy = d.getUTCFullYear();
     const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
     labels.push(`${yyyy}-${mm}`);
   }
   return labels;
 }

function normalizeProjectStatus(statusRaw) {
  const s = String(statusRaw || '').toLowerCase().trim();
  if (s === 'pending') return 'pending';
  if (s === 'in_progress' || s === 'in progress') return 'in_progress';
  if (s === 'done' || s === 'completed') return 'done';
  return 'unknown';
}

function normalizeTaskStatus(statusRaw) {
  const s = String(statusRaw || '').toLowerCase().trim();
  if (s === 'to do' || s === 'todo' || s === 'pending') return 'to do';
  if (s === 'in progress' || s === 'in_progress') return 'in progress';
  if (s === 'done' || s === 'completed') return 'done';
  if (s === 'overdue') return 'overdue';
  return 'other';
}

function buildTimeSeriesByStatus(rows, { dateField, start, end, statuses, normalize, derive, dateSelector }) {
   // Monthly aggregation: labels are YYYY-MM
   const labels = generateMonthLabels(start, end);
   const indexByMonth = new Map(labels.map((d, i) => [d, i]));
   const datasets = statuses.map((st) => ({ status: st, counts: Array(labels.length).fill(0) }));

   for (const row of rows) {
    const rawDate = dateSelector ? dateSelector(row) : row[dateField];
     const d = new Date(rawDate);
     if (isNaN(d)) continue;
     const yyyy = d.getUTCFullYear();
     const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
     const key = `${yyyy}-${mm}`;
     const idx = indexByMonth.get(key);
     if (idx === undefined) continue;
    const norm = derive ? derive(row) : normalize(row.status);
     const dataset = datasets.find(ds => ds.status === norm);
     if (dataset) {
       dataset.counts[idx] += 1;
     }
   }

   return { labels, datasets };
 }

async function getProjectReportData(start, end) {
  // Prefer project start date
  let query = supabase.from('projects').select('*');
  query = applyBetweenDates(query, 'start', start, end);
  const { data: projects, error } = await query;
  if (error) throw new Error(error.message);

  const timeSeries = groupByDay(projects || [], 'start');
  const byStatus = groupByStatus(projects || [], 'status');
  const timeSeriesByStatus = buildTimeSeriesByStatus(projects || [], {
    dateField: 'start',
    start,
    end,
    statuses: ['pending', 'in_progress', 'done'],
    normalize: normalizeProjectStatus,
  });
  return { timeSeries, byStatus, timeSeriesByStatus };
}

async function getTaskReportData(start, end) {
  // Use created_at if available
  let query = supabase.from('tasks').select('*');
  // Include tasks whose deadline OR created_at fall within range
  const orFilter = `and(deadline.gte.${start},deadline.lte.${end}),and(created_at.gte.${start},created_at.lte.${end})`;
  query = query.or(orFilter);
  const { data: fetched, error } = await query;
  if (error) throw new Error(error.message);
  const today = toYmd(new Date());
  // Post-filter: include if
  // 1) created_at within range (all statuses), OR
  // 2) derived status is overdue AND deadline within range
  const tasks = (fetched || []).filter(row => {
    const created = toYmd(row.created_at);
    const deadline = row.deadline ? toYmd(row.deadline) : null;
    const base = normalizeTaskStatus(row.status);
    const derived = base === 'done' ? 'done' : deriveTaskStatus(row, today);
    const inByCreated = created && created >= start && created <= end;
    const inByDeadlineOverdue = derived === 'overdue' && deadline && deadline >= start && deadline <= end;
    const inByDeadlineDone = base === 'done' && deadline && deadline >= start && deadline <= end;
    return inByCreated || inByDeadlineOverdue || inByDeadlineDone;
  });

  const timeSeries = groupByDay(tasks || [], 'created_at');
  // Derive overdue for byStatus
  const counts = new Map();
  for (const row of tasks || []) {
    // If a task is done, always count it as done, regardless of deadline
    const base = normalizeTaskStatus(row.status);
    const st = base === 'done' ? 'done' : deriveTaskStatus(row, today);
    counts.set(st, (counts.get(st) || 0) + 1);
  }
  const byStatus = Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  const timeSeriesByStatus = buildTimeSeriesByStatus(tasks || [], {
    dateField: 'created_at',
    start,
    end,
    statuses: ['to do', 'in progress', 'done', 'overdue'],
    normalize: normalizeTaskStatus,
    derive: (row) => {
      const base = normalizeTaskStatus(row.status);
      return base === 'done' ? 'done' : deriveTaskStatus(row, today);
    },
    // Bucket by creation month for all statuses
    dateSelector: (row) => row.created_at,
  });
  return { timeSeries, byStatus, timeSeriesByStatus };
}

module.exports = { getProjectReportData, getTaskReportData };


