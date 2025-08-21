#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { PipelineAcceleratorStack } from '../lib/pipeline-accelerator-stack';

const app = new cdk.App();

// Apply cdk-nag AWS Solutions checks across the app
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

new PipelineAcceleratorStack(app, 'PipelineAcceleratorStack', {
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});


