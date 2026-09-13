import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as location from 'aws-cdk-lib/aws-location';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface RepairGridApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  reportsTable: dynamodb.Table;
  missionsTable: dynamodb.Table;
  workersTable: dynamodb.Table;
  decisionsTable: dynamodb.Table;
  eventsTable: dynamodb.Table;
  evidenceBucket: s3.Bucket;
  placeIndex: location.CfnPlaceIndex;
  routeCalculator: location.CfnRouteCalculator;
}

export class RepairGridApiStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;
  public readonly apiHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: RepairGridApiStackProps) {
    super(scope, id, props);

    // API Dependencies Lambda Layer
    const apiLayer = new lambda.LayerVersion(this, 'RepairGridApiLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/layers/api-deps')),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'RepairGrid FastAPI and Pydantic dependencies',
    });

    // API Handler Lambda (Python 3.12)
    this.apiHandler = new lambda.Function(this, 'RepairGridApiHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'services.api.main.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/backend')),
      layers: [apiLayer],
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DYNAMODB_REPORTS_TABLE: props.reportsTable.tableName,
        DYNAMODB_MISSIONS_TABLE: props.missionsTable.tableName,
        DYNAMODB_WORKERS_TABLE: props.workersTable.tableName,
        DYNAMODB_DECISIONS_TABLE: props.decisionsTable.tableName,
        DYNAMODB_EVENTS_TABLE: props.eventsTable.tableName,
        S3_EVIDENCE_BUCKET: props.evidenceBucket.bucketName,
        LOCATION_PLACE_INDEX: props.placeIndex.indexName,
        LOCATION_ROUTE_CALCULATOR: props.routeCalculator.calculatorName,
        PRIMARY_MODEL: 'us.amazon.nova-2-lite-v1:0',
        AWS_REGION_NAME: this.region,
      },
    });

    // Grant DynamoDB permissions
    props.reportsTable.grantReadWriteData(this.apiHandler);
    props.missionsTable.grantReadWriteData(this.apiHandler);
    props.workersTable.grantReadWriteData(this.apiHandler);
    props.decisionsTable.grantReadWriteData(this.apiHandler);
    props.eventsTable.grantReadWriteData(this.apiHandler);

    // Grant S3 Presigned URL permissions
    props.evidenceBucket.grantReadWrite(this.apiHandler);

    // Grant Location permissions
    this.apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'geo:SearchPlaceIndexForPosition',
          'geo:SearchPlaceIndexForText',
          'geo:CalculateRoute',
        ],
        resources: ['*'],
      })
    );

    // Grant Bedrock Model invocation permissions (for Nova 2 Lite verification)
    this.apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
      })
    );

    // HTTP API Gateway
    this.httpApi = new apigwv2.HttpApi(this, 'RepairGridHttpApi', {
      apiName: 'repairgrid-http-api',
      corsPreflight: {
        allowHeaders: [
          'Authorization',
          'Content-Type',
          'x-role',
          'x-mock-role',
          'x-mock-user-id',
          'x-mock-email',
        ],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
    });

    const integration = new apigwv2_integrations.HttpLambdaIntegration('LambdaIntegration', this.apiHandler);

    // Route for all API endpoints
    this.httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PATCH,
      ],
      integration,
    });

    // Public route for health check and previews
    this.httpApi.addRoutes({
      path: '/public/{proxy+}',
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', { value: this.httpApi.apiEndpoint });
  }
}
