# GCP Infrastructure (Cloud Run Baseline)

This Terraform baseline provisions:

- Cloud SQL PostgreSQL instance + database
- Memorystore Redis instance
- Cloud Storage bucket for attachment objects
- Cloud KMS key ring/key for raw content envelope key management
- Cloud Run services for API and worker
- Cloud Scheduler job for stale-detection trigger

## Usage

```bash
cd infra/gcp/envs/dev
terraform init
terraform plan -var="project_id=your-project" -var="region=us-central1"
terraform apply -var="project_id=your-project" -var="region=us-central1"
```
