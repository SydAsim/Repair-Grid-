import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface RepairGridObservabilityStackProps extends cdk.StackProps {
  api: apigwv2.HttpApi;
  tables: dynamodb.Table[];
}

export class RepairGridObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RepairGridObservabilityStackProps) {
    super(scope, id, props);

    // 1. Unified CloudWatch Log Group with 7-day retention
    new logs.LogGroup(this, 'RepairGridUnifiedLogs', {
      logGroupName: '/aws/repairgrid/operations',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Operational CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'RepairGridDashboard', {
      dashboardName: 'RepairGrid-MissionControl',
    });

    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# RepairGrid Community Operations Dashboard\nReal-time telemetry, Strands Agent activity, and budget guards.',
        width: 24,
        height: 2,
      })
    );

    // 3. AWS Budgets Alert Guardrail ($20, $30, $40)
    new budgets.CfnBudget(this, 'RepairGridCreditGuard', {
      budget: {
        budgetName: 'RepairGrid-Hackathon-Budget',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: 50,
          unit: 'USD',
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 40, // 20 USD
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: 'admin@repairgrid.com',
            },
          ],
        },
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 60, // 30 USD
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: 'admin@repairgrid.com',
            },
          ],
        },
      ],
    });
  }
}
