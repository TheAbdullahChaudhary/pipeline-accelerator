import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';

export class PipelineAcceleratorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const shortUrlTable = new Table(this, 'ShortUrlTable', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: TableEncryption.AWS_MANAGED,
    });

    shortUrlTable.addGlobalSecondaryIndex({
      indexName: 'sk-index',
      partitionKey: { name: 'sk', type: AttributeType.STRING },
    });
  }
}


