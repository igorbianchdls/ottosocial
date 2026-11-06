#!/usr/bin/env bash
# Puts otto-sync on Google Cloud: a Cloud Run Job started every 15 minutes by Cloud Scheduler.
# Run once from this folder, logged in with gcloud as an owner of the project:
#   PROJECT=meu-projeto REGION=us-central1 ./deploy.sh
# The secrets are created empty the first time; add their values in Secret Manager (or with
# `gcloud secrets versions add NAME --data-file=-`) and run again.
set -euo pipefail
PROJECT=${PROJECT:?defina PROJECT}
REGION=${REGION:-us-central1}
BQ_LOCATION=${BQ_LOCATION:-US}
SUPABASE_URL=${SUPABASE_URL:-https://zetepnoysdjqfmgevvrt.supabase.co}
JOB=otto-sync
SA=otto-sync@${PROJECT}.iam.gserviceaccount.com

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com secretmanager.googleapis.com bigquery.googleapis.com \
  bigquerydatatransfer.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# The job's own account: runs BigQuery jobs and creates/writes the OttoSocial datasets, reads its secrets.
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || gcloud iam service-accounts create otto-sync --display-name "OttoSocial sync"
for role in roles/bigquery.jobUser roles/bigquery.dataEditor; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role "$role" --condition=None >/dev/null
done

for s in otto-supabase-secret otto-composio-key; do
  gcloud secrets describe "$s" >/dev/null 2>&1 || gcloud secrets create "$s" --replication-policy automatic
  gcloud secrets add-iam-policy-binding "$s" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
done

# Build from this folder and create/update the job.
gcloud run jobs deploy "$JOB" --source . --region "$REGION" --service-account "$SA" \
  --tasks 1 --max-retries 1 --task-timeout 3600 --memory 1Gi \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL,BQ_PROJECT=$PROJECT,BQ_LOCATION=$BQ_LOCATION" \
  --set-secrets "SUPABASE_SECRET_KEY=otto-supabase-secret:latest,COMPOSIO_API_KEY=otto-composio-key:latest"

# Every 15 minutes: picks the syncs that are due and the "rodar agora" requests.
SCHED_SA=otto-scheduler@${PROJECT}.iam.gserviceaccount.com
gcloud iam service-accounts describe "$SCHED_SA" >/dev/null 2>&1 || gcloud iam service-accounts create otto-scheduler --display-name "OttoSocial scheduler"
gcloud run jobs add-iam-policy-binding "$JOB" --region "$REGION" --member "serviceAccount:$SCHED_SA" --role roles/run.invoker >/dev/null
URI="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/jobs/$JOB:run"
if gcloud scheduler jobs describe otto-sync-15min --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http otto-sync-15min --location "$REGION" --schedule "*/15 * * * *" --uri "$URI" --http-method POST --oauth-service-account-email "$SCHED_SA"
else
  gcloud scheduler jobs create http otto-sync-15min --location "$REGION" --schedule "*/15 * * * *" --uri "$URI" --http-method POST --oauth-service-account-email "$SCHED_SA"
fi
echo "Pronto: job $JOB em $REGION, disparado a cada 15 minutos."
