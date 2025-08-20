#!/usr/bin/env node

/**
 * Test script to verify that reports include the overdue status
 */

const { getProjectReportData } = require('./services/reportService');

async function testOverdueReports() {
  try {
    console.log('🧪 Testing reports with overdue status...');
    
    // Start date: 30 days ago
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    console.log(`📅 Test period: ${startStr} → ${endStr}`);
    
    const reportData = await getProjectReportData(startStr, endStr);
    
    console.log('📊 Report data:');
    console.log('- TimeSeries:', reportData.timeSeries?.length || 0, 'entries');
    console.log('- ByStatus:', reportData.byStatus);
    console.log('- TimeSeriesByStatus:', reportData.timeSeriesByStatus);
    
    // Check if overdue status is present
    const hasOverdue = reportData.byStatus?.some(s => s.status === 'overdue');
    console.log(`🔴 Overdue status present: ${hasOverdue ? '✅ YES' : '❌ NO'}`);
    
    if (hasOverdue) {
      const overdueCount = reportData.byStatus.find(s => s.status === 'overdue')?.count || 0;
      console.log(`📈 Number of overdue projects: ${overdueCount}`);
    }
    
    console.log('🎯 Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Execute test if called directly
if (require.main === module) {
  testOverdueReports();
}

module.exports = { testOverdueReports };
