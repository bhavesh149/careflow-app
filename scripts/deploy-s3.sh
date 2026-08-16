#!/usr/bin/env bash
# Build the SPA against the AWS ALB and publish it to a public S3 website bucket.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AWS_PROFILE="${AWS_PROFILE:-careflow}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)"
BUCKET="${CAREFLOW_WEB_BUCKET:-careflow-web-${ACCOUNT_ID}}"
API_URL="${VITE_API_BASE_URL:-http://carefl-alb16-n1msowftsytk-1345249308.ap-south-1.elb.amazonaws.com}"

echo "Account  $ACCOUNT_ID"
echo "Profile  $AWS_PROFILE"
echo "Region   $AWS_REGION"
echo "Bucket   $BUCKET"
echo "API      $API_URL"

if ! aws s3api head-bucket --bucket "$BUCKET" --profile "$AWS_PROFILE" 2>/dev/null; then
  echo "Creating bucket…"
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION" \
    --profile "$AWS_PROFILE"
fi

aws s3api delete-public-access-block --bucket "$BUCKET" --profile "$AWS_PROFILE"

POLICY="$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/*"
    }
  ]
}
EOF
)"
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$POLICY" --profile "$AWS_PROFILE"

aws s3 website "s3://${BUCKET}" \
  --index-document index.html \
  --error-document index.html \
  --profile "$AWS_PROFILE"

echo "Building SPA…"
VITE_API_BASE_URL="$API_URL" npm run build

echo "Uploading…"
aws s3 sync dist/ "s3://${BUCKET}/" \
  --delete \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.txt" \
  --exclude "*.json"

aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

SITE="http://${BUCKET}.s3-website.${AWS_REGION}.amazonaws.com"
echo
echo "Site:  $SITE"
echo "API:   $API_URL"
echo
echo "Allow this origin on the API (then redeploy the ECS stack if it is not already there):"
echo "  CORS_ORIGINS must include $SITE"
echo "  cdk.json corsOrigins, then:  cd backend && AWS_PROFILE=$AWS_PROFILE make aws-deploy"
