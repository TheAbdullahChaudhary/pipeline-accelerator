import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PipelineAcceleratorStack } from '../lib/pipeline-accelerator-stack';

test('DynamoDB Table Created', () => {
  const app = new cdk.App();
  const stack = new PipelineAcceleratorStack(app, 'TestStack');
  const template = Template.fromStack(stack);
  template.hasResource('AWS::DynamoDB::Table', {});
});


