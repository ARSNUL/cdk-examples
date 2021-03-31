import * as cdk from '@aws-cdk/core';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as iam from '@aws-cdk/aws-iam';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as origins from '@aws-cdk/aws-cloudfront-origins';

export class EcsEcrIamCloudfrontEc2Elasticloadbalancingv2CloudfrontOriginsStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const INSTANCE_TYPE = 't3.small';
        const containerName: string = `container-${id}`;

        const vpc = new ec2.Vpc(
            this,
            `vpc`,
            {
                cidr: "10.107.0.0/16"
            }
        );

        const lbSecGroup = new ec2.SecurityGroup(
            this,
            `lb_sec_group`,
            {
                vpc,
                description: 'lb sec group',
            }
        );

        lbSecGroup.addIngressRule(
            ec2.Peer.anyIpv6(),
            ec2.Port.tcp(80),
        );

        lbSecGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
        );

        lbSecGroup.addIngressRule(
            ec2.Peer.anyIpv6(),
            ec2.Port.tcp(443),
        );

        lbSecGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
        );

        const loadbal = new elb.ApplicationLoadBalancer(
            this,
            `elb`,
            {
                vpc,
                internetFacing: true,
                securityGroup: lbSecGroup,
                http2Enabled: true,
                idleTimeout: cdk.Duration.seconds(60),
            }
        );

        const cluster = new ecs.Cluster(
            this,
            `cluster`,
            {
                containerInsights: true,
                vpc,
                clusterName: `cdk-examples`,
            }
        );

        const autoScalingGroup = cluster.addCapacity(
            `auto_scaling_group`,
            {
                instanceType: new ec2.InstanceType(INSTANCE_TYPE),
                machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
                desiredCapacity: 3,
                maxCapacity: 24,
                minCapacity: 3,
                keyName: 'cdk-examples',
                taskDrainTime: cdk.Duration.seconds(30),
            }
        );

        autoScalingGroup.scaleOnCpuUtilization(
            'KeepCpuHalfwayLoaded',
            {
                targetUtilizationPercent: 50
            }
        );

        const exec_role = new iam.Role(
            this,
            `exec_role`,
            {
                assumedBy: new iam.CompositePrincipal(
                    new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
                ),
            }
        );

        exec_role.addManagedPolicy(
            iam.ManagedPolicy.fromManagedPolicyArn(
                this,
                `task-exec-role-${id}`,
                'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
            )
        );

        const task_role = new iam.Role(
            this,
            `task_role`,
            {
                assumedBy: new iam.CompositePrincipal(
                    new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
                ),
            }
        );

        const repo = ecr.Repository.fromRepositoryName(
            this,
            `repository`,
            'cdk-examples'
        );

        const taskDefinition = new ecs.Ec2TaskDefinition(
            this,
            `taskdef`,
            {
                executionRole: exec_role,
                family: `${id}`,
                networkMode: ecs.NetworkMode.BRIDGE,
                taskRole: task_role,
            }
        );

        const container = taskDefinition.addContainer(
            containerName,
            {
                image: ecs.ContainerImage.fromEcrRepository(repo, 'dev'),
                memoryLimitMiB: 512,
            }
        );

        container.addPortMappings(
            {
                containerPort: 3000,
                hostPort: 3000,
            }
        );

        const deploymentController: ecs.DeploymentController = {
            type: ecs.DeploymentControllerType.ECS,
        };

        const ecsSecGroup = new ec2.SecurityGroup(
            this,
            `ecs_sec_gropu`,
            {
                vpc,
                description: 'ecs sec group',
            }
        );

        ecsSecGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(22),
        );

        ecsSecGroup.addIngressRule(
            lbSecGroup,
            ec2.Port.tcp(3000),
        );

        const ecsService = new ecs.Ec2Service(
            this,
            'ecs_service',
            {
                serviceName: `cdk-examples`,
                deploymentController,
                cluster,
                taskDefinition,
            }
        );

        const listener = loadbal.addListener(
            'listener',
            {
                port: 80,
            }
        );

        listener.addTargets(
            'ecs1',
            {
                protocol: elb.ApplicationProtocol.HTTP,
                port: 80,
                healthCheck: {
                    path: '/landing',
                    interval: cdk.Duration.seconds(5),
                    timeout: cdk.Duration.seconds(2),
                    healthyThresholdCount: 2,
                    unhealthyThresholdCount: 2,
                    protocol: elb.Protocol.HTTP,
                },
                targets: [
                    ecsService.loadBalancerTarget(
                        {
                            containerName,
                            containerPort: 3000,
                        }
                    )
                ]
            }
        );

        const origin = new origins.LoadBalancerV2Origin(
            loadbal,
            {
                connectionAttempts: 3,
                connectionTimeout: cdk.Duration.seconds(10),
                protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
                readTimeout: cdk.Duration.seconds(60),
            }
        );

        new cf.Distribution(
            this,
            `distribution`,
            {
                defaultBehavior: {
                    origin,
                    cachedMethods: cf.CachedMethods.CACHE_GET_HEAD,
                    allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
                    compress: true,
                    viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    // forwardQueryString: true,
                },
                defaultRootObject: 'index.html',
                httpVersion: cf.HttpVersion.HTTP2,
                priceClass: cf.PriceClass.PRICE_CLASS_ALL,
            }
        );
    }
}
