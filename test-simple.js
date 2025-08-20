#!/usr/bin/env node

/**
 * Simple test script to verify the deriveProjectStatus function
 */

// Mock project data for testing
const mockProjects = [
  {
    id: 1,
    title: "Project 1",
    status: "pending",
    end: "2024-01-01" // Past date - should be overdue
  },
  {
    id: 2,
    title: "Project 2", 
    status: "in_progress",
    end: "2024-12-31" // Future date - should not be overdue
  },
  {
    id: 3,
    title: "Project 3",
    status: "done",
    end: "2024-01-01" // Past date but done - should remain done
  }
];

// Mock deriveProjectStatus function
function deriveProjectStatus(project, today) {
  if (project.status === 'done') return 'done';
  
  // Check if the project is overdue
  if (project.end) {
    const endDate = new Date(project.end);
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    if (endDate < todayDate) return 'overdue';
  }
  
  return project.status;
}

// Test the function
function testDeriveProjectStatus() {
  const today = "2024-01-15"; // Current date for testing
  
  console.log('🧪 Testing deriveProjectStatus function...');
  console.log(`📅 Today: ${today}`);
  console.log('');
  
  mockProjects.forEach(project => {
    const realStatus = deriveProjectStatus(project, today);
    console.log(`📋 Project: ${project.title}`);
    console.log(`   - Stored status: ${project.status}`);
    console.log(`   - End date: ${project.end}`);
    console.log(`   - Real status: ${realStatus}`);
    console.log('');
  });
  
  console.log('✅ Test completed!');
}

// Run the test
testDeriveProjectStatus();
