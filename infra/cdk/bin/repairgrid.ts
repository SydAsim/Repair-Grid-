#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RepairGridAuthStack } from '../lib/auth-stack';
import { RepairGridDataStack } from '../lib/data-stack';
import { RepairGridLocationStack } from '../lib/location-stack';
import { RepairGridApiStack } from '../lib/api-stack';
import { RepairGridRealtimeStack } from '../lib/realtime-stack';
import { RepairGridAgentStack } from '../lib/agent-stack';
import { RepairGridObservabilityStack } from '../lib/observability-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

// 1. Authentication (Cognito User Pool & Groups)
const authStack = new RepairGridAuthStack(app, 'RepairGridAuthStack', { env });

// 2. Data Persistence (DynamoDB 5 tables + S3 Evidence Private Bucket)
const dataStack = new RepairGridDataStack(app, 'RepairGridDataStack', { env });

// 3. Location (Maps, Places, Routes)
const locationStack = new RepairGridLocationStack(app, 'RepairGridLocationStack', { env });

// 4. API & Business Logic (HTTP API Gateway + Lambda)
const apiStack = new RepairGridApiStack(app, 'RepairGridApiStack', {
  env,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  reportsTable: dataStack.reportsTable,
  missionsTable: dataStack.missionsTable,
  workersTable: dataStack.workersTable,
  decisionsTable: dataStack.decisionsTable,
  eventsTable: dataStack.eventsTable,
  evidenceBucket: dataStack.evidenceBucket,
  placeIndex: locationStack.placeIndex,
  routeCalculator: locationStack.routeCalculator,
});

// 5. Realtime Communication (WebSocket API + Stream broadcaster)
const realtimeStack = new RepairGridRealtimeStack(app, 'RepairGridRealtimeStack', {
  env,
  missionsTable: dataStack.missionsTable,
  reportsTable: dataStack.reportsTable,
});

// 6. Strands Agent Runtime & AgentCore Gateway
const agentStack = new RepairGridAgentStack(app, 'RepairGridAgentStack', {
  env,
  reportsTable: dataStack.reportsTable,
  missionsTable: dataStack.missionsTable,
  workersTable: dataStack.workersTable,
  decisionsTable: dataStack.decisionsTable,
  eventsTable: dataStack.eventsTable,
  evidenceBucket: dataStack.evidenceBucket,
  webSocketApi: realtimeStack.webSocketApi,
});

// 7. Observability (CloudWatch, Dashboards, Budgets)
new RepairGridObservabilityStack(app, 'RepairGridObservabilityStack', {
  env,
  api: apiStack.httpApi,
  tables: [
    dataStack.reportsTable,
    dataStack.missionsTable,
    dataStack.workersTable,
    dataStack.decisionsTable,
    dataStack.eventsTable,
  ],
});

// Tag all resources per Hackathon rules
cdk.Tags.of(app).add('Project', 'RepairGrid');
cdk.Tags.of(app).add('Hackathon', 'AgentsForHumans');
cdk.Tags.of(app).add('Environment', 'demo');
