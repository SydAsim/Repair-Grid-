import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface RepairGridRealtimeStackProps extends cdk.StackProps {
  missionsTable: dynamodb.Table;
  reportsTable: dynamodb.Table;
}

export class RepairGridRealtimeStack extends cdk.Stack {
  public readonly webSocketApi: apigwv2.CfnApi;
  public readonly connectionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: RepairGridRealtimeStackProps) {
    super(scope, id, props);

    // Active WebSocket Connections Table
    this.connectionsTable = new dynamodb.Table(this, 'RepairGridConnections', {
      tableName: 'RepairGridConnections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // WebSocket API
    this.webSocketApi = new apigwv2.CfnApi(this, 'WebSocketApi', {
      name: 'repairgrid-realtime-ws',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    });

    // WebSocket Connection Manager Lambda
    const wsHandler = new lambda.Function(this, 'WsConnectionHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.handle_ws',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../services/realtime')),
      environment: {
        CONNECTIONS_TABLE: this.connectionsTable.tableName,
      },
    });
    this.connectionsTable.grantReadWriteData(wsHandler);

    // Broadcaster Lambda triggered by DynamoDB Streams
    const broadcaster = new lambda.Function(this, 'WsBroadcaster', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'broadcaster.handle_stream',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../services/realtime')),
      environment: {
        CONNECTIONS_TABLE: this.connectionsTable.tableName,
        WS_ENDPOINT: `https://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/demo`,
      },
    });
    this.connectionsTable.grantReadData(broadcaster);
    broadcaster.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/*`],
      })
    );

    // Attach DynamoDB Streams trigger
    broadcaster.addEventSource(
      new lambda_event_sources.DynamoEventSource(props.missionsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 5,
        retryAttempts: 2,
      })
    );

    new cdk.CfnOutput(this, 'WebSocketEndpoint', {
      value: `wss://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/demo`,
    });
  }
}
