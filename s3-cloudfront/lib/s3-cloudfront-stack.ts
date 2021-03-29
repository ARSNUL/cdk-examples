import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as cf from '@aws-cdk/aws-cloudfront';

export class S3CloudfrontStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(
            this,
            `bucket`,
            {
                bucketName: `${Date.now()}-cdk-examples`,
                publicReadAccess: false,
            }
        );

        const origin_access_identity = new cf.OriginAccessIdentity(
            this,
            `access-identity`,
            {
                comment: `${id}-cf-access`,
            }
        );

        bucket.grantRead(origin_access_identity);

        const source_config: cf.SourceConfiguration = {
            s3OriginSource: {
                s3BucketSource: bucket,
                originAccessIdentity: origin_access_identity,
            },
            behaviors: [
                {
                    cachedMethods: cf.CloudFrontAllowedCachedMethods.GET_HEAD,
                    allowedMethods: cf.CloudFrontAllowedMethods.GET_HEAD,
                    isDefaultBehavior: true,
                    compress: true,
                }
            ]
        };

        new cf.CloudFrontWebDistribution(
            this,
            `distribution`,
            {
                originConfigs: [
                    source_config,
                ],
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                defaultRootObject: 'index.html',
                httpVersion: cf.HttpVersion.HTTP2,
                priceClass: cf.PriceClass.PRICE_CLASS_ALL,
            }
        );

    }
}
