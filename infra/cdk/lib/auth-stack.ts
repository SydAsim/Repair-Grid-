import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class RepairGridAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'RepairGridUserPool', {
      userPoolName: 'repairgrid-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'RepairGridWebClient', {
      userPool: this.userPool,
      userPoolClientName: 'repairgrid-web-client',
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      generateSecret: false,
    });

    // 4 Canonical Cognito Groups
    const roles = ['resident', 'field_worker', 'operator', 'admin'];
    roles.forEach((role, index) => {
      new cognito.CfnUserPoolGroup(this, `Group${role}`, {
        userPoolId: this.userPool.userPoolId,
        groupName: role,
        description: `RepairGrid ${role} role`,
        precedence: (index + 1) * 10,
      });
    });

    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
  }
}
