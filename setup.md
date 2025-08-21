## End-to-End Setup: AWS DevOps Pipeline Accelerator on GitLab CI with AWS CDK

This guide configures a DPRA-aligned, multi-account Continuous Delivery pipeline using the AWS DevOps Pipeline Accelerator (DPA) with GitLab CI/CD and AWS CDK.

Audience: Platform/DevOps engineers with admin access to GitLab and target AWS accounts.

---

### 0) Prerequisites
- Local: Node.js 18+, AWS CLI, CDK v2 (`npm i -g aws-cdk`), Git.
- GitLab: Project for your app (e.g., Short URL Service) and a working shared runner (Docker executor recommended).
- AWS: One or more target accounts (dev required, int/prod optional). Permission to create IAM roles, OIDC provider (if needed), and CDK bootstrap resources.

---

### 1) Mirror the DPA templates into your GitLab org
1. Create a repository for shared pipeline templates, e.g. `devops/pipeline-accelerator`.
2. From `aws-samples/aws-devops-pipeline-accelerator`, copy the `gitlab-ci/` folder into your new repo. Commit and tag a release (e.g. `v1.0.0`).
3. Ensure the application projects have read access to this templates repo.

Notes:
- Pin your application pipelines to a tag (not `main`) for reproducibility.
- You can customize the included jobs or images in your fork over time.

---

### 2) Prepare the application repository
This repository already contains:
- A CDK TypeScript app with `cdk-nag` enabled at the app level.
- Minimal stack: DynamoDB table (for Short URL Service scaffolding).
- `.gitlab-ci.yml` with a DPA CDK entrypoint include and environment placeholders.

Validate locally:
```bash
npm ci
npm run build
npm test
npx cdk synth
```

---

### 3) Configure `.gitlab-ci.yml` to include your DPA templates
Edit `.gitlab-ci.yml` to reference your internal DPA repo and set env variables:
```yaml
include:
  - project: '<GROUP_PATH>/pipeline-accelerator'
    ref: v1.0.0  # pin to your tag
    file: 'gitlab-ci/entrypoints/gitlab/cdk-infrastructure.yml'

variables:
  AWS_REGION: 'us-east-1'

  # Dev
  DEV_AWS_ACCOUNT: '111111111111'
  DEV_ARN_ROLE: 'arn:aws:iam::111111111111:role/dpa-gitlab-access-role'
  DEV_DEPLOY: 'true'
  DEV_ENV: 'dev'

  # Integration (optional)
  INT_AWS_ACCOUNT: '222222222222'
  INT_ARN_ROLE: 'arn:aws:iam::222222222222:role/dpa-gitlab-access-role'
  INT_DEPLOY: 'false'
  INT_ENV: 'int'
```

Tips:
- Keep `*_DEPLOY` to `false` until the target account is ready.
- You can also define these as GitLab CI/CD Variables (recommended) instead of committing to code.

---

### 4) Configure GitLab OIDC and IAM roles in each AWS account

Create (or verify) an IAM OIDC provider for `gitlab.com` in each target account.

Then create an IAM role the pipeline will assume, e.g. `dpa-gitlab-access-role`.

Example trust policy (replace account IDs, group/repo, and refs):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/gitlab.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": { "gitlab.com:aud": "https://gitlab.com" },
        "StringLike": {
          "gitlab.com:sub": [
            "project_path:your-group/your-repo:ref_type:branch:ref:main",
            "project_path:your-group/your-repo:ref_type:tag:ref:v*"
          ]
        }
      }
    }
  ]
}
```

Permissions policy for the role:
- Start with a broad policy (e.g., `PowerUserAccess`) to validate pipeline, then tighten to least privilege.
- Least-privilege (indicative) should include: CloudFormation (create/update stacks), S3 (read/write to CDK bootstrap and asset buckets), ECR (if you publish containers), IAM PassRole (only if your stacks create roles that must be passed), and service permissions required by your stacks (e.g., DynamoDB, Lambda, API Gateway).

---

### 5) CDK bootstrap each target account/region
Run once with human credentials that have admin rights:
```bash
npx cdk bootstrap aws://111111111111/us-east-1
# repeat for other accounts/regions
```

Optionally specify execution policy (adjust as needed):
```bash
npx cdk bootstrap aws://111111111111/us-east-1 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess
```

---

### 6) Set GitLab CI/CD Variables (recommended)
In GitLab: Project (or Group) → Settings → CI/CD → Variables:
- `AWS_REGION`
- `DEV_AWS_ACCOUNT`, `DEV_ARN_ROLE`, `DEV_DEPLOY`, `DEV_ENV`
- `INT_AWS_ACCOUNT`, `INT_ARN_ROLE`, `INT_DEPLOY`, `INT_ENV` (as needed)
- For production later: `PROD_*` equivalents

Mark variables as Protected/Masked appropriately. Scope to environments if desired.

---

### 7) Ensure GitLab Runners can execute the pipeline
- Use a Docker executor with outbound internet access to pull images used by the DPA templates.
- If you mirror images internally, adjust the template include or set image registry variables accordingly.

---

### 8) First pipeline run (dev)
1. Commit updates to `.gitlab-ci.yml` and push to `main`.
2. Pipeline stages will run: init → build → security/quality → synth → deploy (dev) → verify.
3. Confirm stack creation in the dev account’s CloudFormation console.

Artifacts and promotion:
- The same synthesized artifacts should be promoted to higher environments for parity.
- Enable `INT_DEPLOY` (and later `PROD_DEPLOY`) when you’re ready.

---

### 9) Add integration/prod with approvals
- Add variables for int/prod accounts and role ARNs.
- Configure manual approval gates as desired in your DPA templates or GitLab environment protections.

Prod variables example:
```yaml
variables:
  PROD_AWS_ACCOUNT: '333333333333'
  PROD_ARN_ROLE: 'arn:aws:iam::333333333333:role/dpa-gitlab-access-role'
  PROD_DEPLOY: 'false'  # set to true when ready
  PROD_ENV: 'prod'
```

---

### 10) Security and quality
- `cdk-nag`: Enforced via app aspects. Add targeted suppressions only with justification.
- Add/enable `cfn-lint`, `cfn-nag`, `Checkov`, `KICS`, and unit tests per your policy.
- Restrict IAM permissions for the deployment role to the minimal set necessary.

---

### 11) Local developer workflow
```bash
npm ci
npm run build
npm test
npx cdk synth
# Optional: npx cdk deploy (only to a sandbox/dev account if allowed)
```

---

### 12) Troubleshooting
- OIDC errors: Verify trust policy `gitlab.com:sub` matches your project path and ref type.
- CDK bootstrap missing: Run `cdk bootstrap` in each target account/region.
- Access denied to S3/ECR/IAM: Expand role permissions or the bootstrap execution policy appropriately.
- Stuck on approvals: Check GitLab protected environments and manual job configuration.

---

### Appendix A: Minimal starting policy (illustrative)
Start broad, then tighten. Example (not least-privileged):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": [
        "cloudformation:*",
        "s3:*",
        "ecr:*",
        "iam:PassRole",
        "logs:*",
        "ssm:GetParameter",
        "kms:Decrypt",
        "dynamodb:*"
      ], "Resource": "*" }
  ]
}
```
Replace with least-privilege for the services used by your stacks.

---

### Appendix B: Example `cdk.json` and app entry
This repo configures the CDK app in `cdk.json` and applies `cdk-nag` aspects in `bin/pipeline-accelerator.ts`.


