import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface RepairGridAgentStackProps extends cdk.StackProps {
  reportsTable: dynamodb.Table;
  missionsTable: dynamodb.Table;
  workersTable: dynamodb.Table;
  decisionsTable: dynamodb.Table;
  eventsTable: dynamodb.Table;
  evidenceBucket: s3.Bucket;
  webSocketApi: apigwv2.CfnApi;
}

export class RepairGridAgentStack extends cdk.Stack {
  public readonly agentRunner: lambda.Function;

  constructor(scope: Construct, id: string, props: RepairGridAgentStackProps) {
    super(scope, id, props);

    // Agent Dependencies Lambda Layer
    const agentLayer = new lambda.LayerVersion(this, 'RepairGridAgentLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/layers/api-deps')),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'RepairGrid Agent dependencies (Pydantic, etc.)',
    });

    // Strands Agent Runtime Lambda
    this.agentRunner = new lambda.Function(this, 'StrandsAgentRunner', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'agents.runtime.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/backend')),
      layers: [agentLayer],
      memorySize: 1024,
      timeout: cdk.Duration.minutes(3),
      environment: {
        PRIMARY_MODEL: 'us.amazon.nova-2-lite-v1:0',
        BEDROCK_REGION: this.region,
        DYNAMODB_REPORTS_TABLE: props.reportsTable.tableName,
        DYNAMODB_MISSIONS_TABLE: props.missionsTable.tableName,
        DYNAMODB_WORKERS_TABLE: props.workersTable.tableName,
        DYNAMODB_DECISIONS_TABLE: props.decisionsTable.tableName,
        DYNAMODB_EVENTS_TABLE: props.eventsTable.tableName,
        S3_EVIDENCE_BUCKET: props.evidenceBucket.bucketName,
      },
    });

    // Bedrock Nova 2 Lite Invoke Permissions
    this.agentRunner.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/*`,
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
        ],
      })
    );

    // Grant DynamoDB Table Access
    props.reportsTable.grantReadWriteData(this.agentRunner);
    props.missionsTable.grantReadWriteData(this.agentRunner);
    props.workersTable.grantReadWriteData(this.agentRunner);
    props.decisionsTable.grantReadWriteData(this.agentRunner);
    props.eventsTable.grantReadWriteData(this.agentRunner);

    // Grant S3 Evidence Bucket Access
    props.evidenceBucket.grantRead(this.agentRunner);

    new cdk.CfnOutput(this, 'AgentRunnerArn', { value: this.agentRunner.functionArn });
  }
}
