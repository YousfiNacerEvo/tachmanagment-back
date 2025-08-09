const { getProjectReportData, getTaskReportData } = require('../services/reportService');

function parseDateRange(query) {
  const { start, end } = query;
  if (!start || !end) {
    return { error: 'Missing start or end query parameter (expected YYYY-MM-DD).' };
  }
  // Basic validation: YYYY-MM-DD
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(start) || !isoRegex.test(end)) {
    return { error: 'Invalid date format. Use YYYY-MM-DD.' };
  }
  return { start, end };
}

async function getProjectsReport(req, res) {
  const range = parseDateRange(req.query);
  if (range.error) return res.status(400).json({ message: range.error });
  try {
    const data = await getProjectReportData(range.start, range.end);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to build projects report' });
  }
}

async function getTasksReport(req, res) {
  const range = parseDateRange(req.query);
  if (range.error) return res.status(400).json({ message: range.error });
  try {
    const data = await getTaskReportData(range.start, range.end);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to build tasks report' });
  }
}

module.exports = { getProjectsReport, getTasksReport };


