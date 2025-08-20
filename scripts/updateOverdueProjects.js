#!/usr/bin/env node

/**
 * Script de maintenance pour mettre à jour automatiquement le statut des projets en retard
 * Ce script peut être exécuté via cron ou manuellement
 */

const { updateOverdueProjects } = require('../services/projectService');

async function main() {
  try {
    console.log('🔄 Début de la mise à jour des projets en retard...');
    
    const updatedCount = await updateOverdueProjects();
    
    if (updatedCount > 0) {
      console.log(`✅ ${updatedCount} projet(s) mis à jour vers le statut "overdue"`);
    } else {
      console.log('✅ Aucun projet en retard à mettre à jour');
    }
    
    console.log('🎯 Mise à jour terminée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des projets en retard:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

module.exports = { main };
