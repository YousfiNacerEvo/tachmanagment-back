const { supabase } = require('./supabaseClient');

/**
 * Vérifie et met à jour le statut d'un projet basé sur sa date de fin
 * @param {Object} project - Le projet à vérifier
 * @returns {Object} - Le projet avec le statut mis à jour si nécessaire
 */
function checkAndUpdateProjectStatus(project) {
  if (!project || !project.end || project.status === 'done') {
    return project;
  }

  const endDate = new Date(project.end);
  const today = new Date();
  
  // Normaliser les dates pour la comparaison (seulement la partie date, pas l'heure)
  const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Si la date de fin est dans le passé et le projet n'est pas terminé, il est en retard
  if (endDateOnly < todayOnly) {
    return {
      ...project,
      status: 'overdue'
    };
  }

  // Si la date de fin est dans le futur et le projet était en retard, le remettre en cours
  if (endDateOnly >= todayOnly && project.status === 'overdue') {
    return {
      ...project,
      status: 'in_progress'
    };
  }

  return project;
}

/**
 * Vérifie et met à jour le statut d'une tâche basé sur sa date d'échéance
 * @param {Object} task - La tâche à vérifier
 * @returns {Object} - La tâche avec le statut mis à jour si nécessaire
 */
function checkAndUpdateTaskStatus(task) {
  if (!task || !task.deadline) {
    return task;
  }

  const deadline = new Date(task.deadline);
  const today = new Date();
  
  // Normaliser les dates pour la comparaison (seulement la partie date, pas l'heure)
  const deadlineOnly = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Normaliser le statut pour la comparaison
  const normalizedStatus = normalizeTaskStatus(task.status);
  const isClosed = normalizedStatus === 'done' || normalizedStatus === 'overdue';

  // Si la date d'échéance est dans le passé et la tâche n'est pas fermée, elle est en retard
  if (deadlineOnly < todayOnly && !isClosed) {
    return {
      ...task,
      status: 'overdue'
    };
  }

  // Si la date d'échéance est dans le futur et la tâche était en retard, la remettre en cours
  if (deadlineOnly >= todayOnly && task.status === 'overdue') {
    return {
      ...task,
      status: 'in_progress'
    };
  }

  return task;
}

/**
 * Normalise le statut d'une tâche pour la comparaison
 * @param {string} status - Le statut à normaliser
 * @returns {string} - Le statut normalisé
 */
function normalizeTaskStatus(status) {
  if (!status) return 'pending';
  
  const statusMap = {
    'à faire': 'pending',
    'en cours': 'in_progress',
    'terminé': 'done',
    'pending': 'pending',
    'in_progress': 'in_progress',
    'done': 'done',
    'overdue': 'overdue'
  };
  
  return statusMap[status] || status;
}

/**
 * Met à jour le statut d'un projet dans la base de données
 * @param {string} projectId - L'ID du projet
 * @param {string} newStatus - Le nouveau statut
 * @returns {Promise<Object>} - Le résultat de la mise à jour
 */
async function updateProjectStatusInDB(projectId, newStatus) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating project status in DB:', error);
    throw error;
  }
}

/**
 * Met à jour le statut d'une tâche dans la base de données
 * @param {string} taskId - L'ID de la tâche
 * @param {string} newStatus - Le nouveau statut
 * @returns {Promise<Object>} - Le résultat de la mise à jour
 */
async function updateTaskStatusInDB(taskId, newStatus) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating task status in DB:', error);
    throw error;
  }
}

module.exports = {
  checkAndUpdateProjectStatus,
  checkAndUpdateTaskStatus,
  normalizeTaskStatus,
  updateProjectStatusInDB,
  updateTaskStatusInDB
};
