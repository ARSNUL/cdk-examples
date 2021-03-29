import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lamb from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';

export class ApigatewayLambdaStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const iam_role = new iam.Role(
            this,
            `role`,
            {
                assumedBy: new iam.CompositePrincipal(
                    new iam.ServicePrincipal('lambda.amazonaws.com'),
                ),
            }
        );

        const backend = new lamb.Function(
            this,
            `backend`,
            {
                runtime: lamb.Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: lamb.Code.fromAsset('lambda-handler'),
                role: iam_role,
            }
        );

        new iam.Policy(
            this,
            `policy`,
            {
                roles: [iam_role],
                statements: [
                    new iam.PolicyStatement(
                        {
                            resources: [backend.logGroup.logGroupArn],
                            actions: [
                                'logs:CreateLogStream',
                                'logs:PutLogEvents',
                                'logs:CreateLogGroup',
                            ],
                            effect: iam.Effect.ALLOW,
                        }
                    ),
                ]
            }
        );

        const api = new agw.LambdaRestApi(
            this,
            'apigateway',
            {
                handler: backend,
                proxy: false,
            }
        );

        api.root.addMethod('ANY');

        const nouns = api.root.addResource('nouns');
        nouns.addMethod('GET');
        nouns.addMethod('POST');

        const noun = nouns.addResource('{noun_id}');
        noun.addMethod('GET');
        noun.addMethod('DELETE');
    }
}
