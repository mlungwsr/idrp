#!/bin/bash

# Script to set up AWS Parameter Store parameters for IDRP application

# Get the current AWS region from instance metadata or use the provided region
AWS_REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "${AWS_REGION:-us-east-1}")
echo "Using AWS region: $AWS_REGION"

# Set parameter values
COGNITO_USER_POOL_ID="${COGNITO_USER_POOL_ID:-us-west-2_cJ4l0XNGY}"
COGNITO_CLIENT_ID="${COGNITO_CLIENT_ID:-3b4q6ld6jns128uuj935tbplph}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-idrp-000001-dev}"
DB_HOST="${DB_HOST:-idrp-database-01.cdouco6u6b8u.us-west-2.rds.amazonaws.com}"
DB_USER="${DB_USER:-idrp_app}"
DB_NAME="${DB_NAME:-idrp}"

echo "Creating parameters in AWS Parameter Store..."

# Create parameters using AWS CLI
aws ssm put-parameter \
  --name "/idrp/COGNITO_USER_POOL_ID" \
  --value "$COGNITO_USER_POOL_ID" \
  --type "String" \
  --description "Cognito User Pool ID for IDRP" \
  --overwrite \
  --region $AWS_REGION

aws ssm put-parameter \
  --name "/idrp/COGNITO_CLIENT_ID" \
  --value "$COGNITO_CLIENT_ID" \
  --type "String" \
  --description "Cognito Client ID for IDRP" \
  --overwrite \
  --region $AWS_REGION

aws ssm put-parameter \
  --name "/idrp/S3_BUCKET_NAME" \
  --value "$S3_BUCKET_NAME" \
  --type "String" \
  --description "S3 Bucket Name for IDRP" \
  --overwrite \
  --region $AWS_REGION

aws ssm put-parameter \
  --name "/idrp/DB_HOST" \
  --value "$DB_HOST" \
  --type "String" \
  --description "Database Host for IDRP" \
  --overwrite \
  --region $AWS_REGION

aws ssm put-parameter \
  --name "/idrp/DB_USER" \
  --value "$DB_USER" \
  --type "String" \
  --description "Database User for IDRP" \
  --overwrite \
  --region $AWS_REGION

aws ssm put-parameter \
  --name "/idrp/DB_NAME" \
  --value "$DB_NAME" \
  --type "String" \
  --description "Database Name for IDRP" \
  --overwrite \
  --region $AWS_REGION

echo "Parameters created successfully!"

# Verify parameters
echo "Verifying parameters..."
aws ssm get-parameters-by-path \
  --path "/idrp/" \
  --recursive \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output table \
  --region $AWS_REGION

echo "Setup complete!"
