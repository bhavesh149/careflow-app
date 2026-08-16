# Deploy the SPA to S3

The production API is the HTTP ALB:

`http://carefl-alb16-n1msowftsytk-1345249308.ap-south-1.elb.amazonaws.com`

Vite inlines `VITE_API_BASE_URL` at **build** time. Copy `.env.example` to `.env.production` and set that URL (no trailing slash). `.env.production` is gitignored.

S3 website hosting is HTTP, which matches the HTTP ALB. Do **not** put this SPA on HTTPS CloudFront until the API has TLS — the browser would block mixed content.

## 1. One-time: AWS CLI

Same profile as the backend:

```bash
export AWS_PROFILE=careflow
aws sts get-caller-identity
```

## 2. Build + upload

From this repo:

```bash
cp .env.example .env.production
# set VITE_API_BASE_URL to the ALB origin
export AWS_PROFILE=careflow
chmod +x scripts/deploy-s3.sh
./scripts/deploy-s3.sh
```

Or by hand:

```bash
export AWS_PROFILE=careflow
export AWS_REGION=ap-south-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="careflow-web-${ACCOUNT}"

# Bucket (once)
aws s3api create-bucket --bucket "$BUCKET" --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"
aws s3api delete-public-access-block --bucket "$BUCKET"
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{\"Sid\":\"PublicReadGetObject\",\"Effect\":\"Allow\",\"Principal\":\"*\",
    \"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${BUCKET}/*\"}]
}"
aws s3 website "s3://${BUCKET}" --index-document index.html --error-document index.html

# Build against the ALB, then sync
npm run build
aws s3 sync dist/ "s3://${BUCKET}/" --delete
```

`--error-document index.html` is required so React Router paths (`/book`, `/login`) do not 404.

Site URL:

`http://careflow-web-853184314326.s3-website.ap-south-1.amazonaws.com`

## 3. Allow the SPA origin on the API

The browser will call the ALB from the S3 origin. `CORS_ORIGINS` on ECS must list the exact S3 website URL (no trailing slash). That origin is set in the API repo’s `infra/cdk.json`.

## 4. Sessions

S3 and the ALB are **different sites**. The httpOnly refresh cookie is `SameSite=Lax`, so it is not sent from the SPA to the ALB. Login still works (access token in memory). After 15 minutes the user signs in again. `SameSite=None; Secure` needs HTTPS on both sides.

## 5. Tear down the bucket later

```bash
export AWS_PROFILE=careflow
aws s3 rb "s3://careflow-web-853184314326" --force
```
