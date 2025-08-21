## Pipeline Accelerator - GitLab + AWS CDK

This repository implements AWS DevOps Pipeline Accelerator (DPA) for GitLab CI/CD using AWS CDK instead of Serverless. It includes a minimal Short URL test project (DynamoDB table) and integrates `cdk-nag`.

### Repository structure
- `bin/pipeline-accelerator.ts`: CDK app entrypoint with `cdk-nag`
- `lib/pipeline-accelerator-stack.ts`: Minimal stack (DynamoDB table)
- `.gitlab-ci.yml`: Includes DPA CDK entrypoint

### Prerequisites
- GitLab Runners with Docker-in-Docker or suitable Docker executor
- AWS accounts for `dev` and optionally `int`
- GitLab OIDC to assume IAM roles in target AWS accounts

### Configure GitLab OIDC and IAM
1. In AWS target accounts, create an IAM OIDC provider for GitLab (`https://gitlab.com`), or use AWS IAM Identity Center if preferred.
2. Create a role `dpa-gitlab-access-role` with trust policy:
   - Trust: `gitlab.com` OIDC provider
   - Condition: `sub` matches your project or group (e.g., `project_path:your-group/your-repo:ref_type:branch:ref:main`)
   - Permissions: minimal CDK deploy permissions (CloudFormation, S3, IAM passrole as needed, target services)
3. Capture role ARNs for each environment.

### Configure variables
Update `.gitlab-ci.yml` variables:
- `AWS_REGION`
- `DEV_AWS_ACCOUNT`, `DEV_ARN_ROLE`, `DEV_DEPLOY`, `DEV_ENV`
- `INT_AWS_ACCOUNT`, `INT_ARN_ROLE`, `INT_DEPLOY`, `INT_ENV`
Replace `<GROUP_PATH>/<DPA_REPO_NAME>` in the include with your hosted DPA templates repository and pin `ref` to a tag.

### Local development
- Install deps: `npm install`
- Build: `npm run build`
- Test: `npm test`
- Synthesize: `npx cdk synth`
- Deploy: `npx cdk deploy`

### Notes
- We use CDK (not Serverless). If you need to toggle security checks, configure `cdk-nag` suppressions judiciously.

### Setup Guide
See `setup.md` for the complete, end-to-end setup and onboarding instructions.
* `npx cdk synth`   emits the synthesized CloudFormation template
