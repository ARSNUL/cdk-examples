import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as EcsEcrIamCloudfrontEc2Elasticloadbalancingv2CloudfrontOrigins from '../lib/ecs-ecr-iam-cloudfront-ec2-elasticloadbalancingv2-cloudfront-origins-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new EcsEcrIamCloudfrontEc2Elasticloadbalancingv2CloudfrontOrigins.EcsEcrIamCloudfrontEc2Elasticloadbalancingv2CloudfrontOriginsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
