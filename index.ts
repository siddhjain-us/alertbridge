// AlertBridge Entry Point
// This file starts all the agents in the correct order for local development

import { startDashboard } from './src/dashboard/index';
import { startPoller } from './src/poller/index';
import { startMatcher } from './src/matcher/index';
import { startRewriter } from './src/rewriter/index';
import { startDispatcher } from './src/dispatcher/index';
import { startRegistration } from './src/registration/index';

// Load environment variables
import 'dotenv/config';

// Start all agents
async function startAllAgents() {
  console.log('[alertbridge] Starting AlertBridge system...');

  try {
    // Start the dashboard (Express server) first
    const dashboard = startDashboard();

    // Start other agents
    startPoller();
    startMatcher();
    startRewriter();
    startDispatcher();
    startRegistration();

    console.log('[alertbridge] All agents started successfully!');
    console.log('[alertbridge] Dashboard available at: http://localhost:3000');
    console.log('[alertbridge] Press Ctrl+C to stop all agents');

  } catch (error) {
    console.error('[alertbridge] Failed to start agents:', error);
    process.exit(1);
  }
}

// Start the system
startAllAgents();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[alertbridge] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[alertbridge] Received SIGTERM, shutting down...');
  process.exit(0);
});