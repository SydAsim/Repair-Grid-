import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class RepairGridDataStack extends cdk.Stack {
  public readonly reportsTable: dynamodb.Table;
  public readonly missionsTable: dynamodb.Table;
  public readonly workersTable: dynamodb.Table;
  public readonly decisionsTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly evidenceBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. RepairGridReports Table
    this.reportsTable = new dynamodb.Table(this, 'RepairGridReports', {
      tableName: 'RepairGridReports',
      partitionKey: { name: 'reportId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.reportsTable.addGlobalSecondaryIndex({
      indexName: 'ReporterReportsIndex',
      partitionKey: { name: 'reporterId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });
    this.reportsTable.addGlobalSecondaryIndex({
      indexName: 'OrgStatusIndex',
      partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });
    this.reportsTable.addGlobalSecondaryIndex({
      indexName: 'GeohashIndex',
      partitionKey: { name: 'geohash', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // 2. RepairGridMissions Table
    this.missionsTable = new dynamodb.Table(this, 'RepairGridMissions', {
      tableName: 'RepairGridMissions',
      partitionKey: { name: 'missionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.missionsTable.addGlobalSecondaryIndex({
      indexName: 'MissionStatusPriorityIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'priority', type: dynamodb.AttributeType.NUMBER },
    });
    this.missionsTable.addGlobalSecondaryIndex({
      indexName: 'WorkerMissionStatusIndex',
      partitionKey: { name: 'assignedWorkerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });
    this.missionsTable.addGlobalSecondaryIndex({
      indexName: 'OrgMissionUpdatedIndex',
      partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });

    // 3. RepairGridWorkers Table
    this.workersTable = new dynamodb.Table(this, 'RepairGridWorkers', {
      tableName: 'RepairGridWorkers',
      partitionKey: { name: 'workerId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.workersTable.addGlobalSecondaryIndex({
      indexName: 'DeptAvailabilityIndex',
      partitionKey: { name: 'department', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'availability', type: dynamodb.AttributeType.STRING },
    });
    this.workersTable.addGlobalSecondaryIndex({
      indexName: 'UserWorkerIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    // 4. RepairGridDecisions Table
    this.decisionsTable = new dynamodb.Table(this, 'RepairGridDecisions', {
      tableName: 'RepairGridDecisions',
      partitionKey: { name: 'decisionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.decisionsTable.addGlobalSecondaryIndex({
      indexName: 'DecisionStatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });
    this.decisionsTable.addGlobalSecondaryIndex({
      indexName: 'MissionDecisionIndex',
      partitionKey: { name: 'missionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // 5. RepairGridEvents Table (Timeline & Audit)
    this.eventsTable = new dynamodb.Table(this, 'RepairGridEvents', {
      tableName: 'RepairGridEvents',
      partitionKey: { name: 'missionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp#eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 6. Private S3 Evidence Bucket
    this.evidenceBucket = new s3.Bucket(this, 'RepairGridEvidenceBucket', {
      bucketName: `repairgrid-evidence-${this.account || 'demo'}-${this.region || 'us-east-1'}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new cdk.CfnOutput(this, 'EvidenceBucketName', { value: this.evidenceBucket.bucketName });
  }
}
