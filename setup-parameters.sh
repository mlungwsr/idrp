#!/bin/bash

# Script to set up AWS Parameter Store parameters for IDRP application

# Set your AWS region
AWS_REGION="us-west-2"

# Set your AWS profile (optional)
AWS_PROFILE="798026328069_Admin"

# Set parameter values
COGNITO_USER_POOL_ID="us-west-2_cJ4l0XNGY"
COGNITO_CLIENT_ID="3b4q6ld6jns128uuj935tbplph"
S3_BUCKET_NAME="idrp-000001-dev"
DB_HOST="idrp-database-01.cdouco6u6b8u.us-west-2.rds.amazonaws.com"
DB_USER="idrp_app"
DB_NAME="idrp"

echo "Creating parameters in AWS Parameter Store..."

# Create parameters using AWS CLI
aws ssm put-parameter \
  --name "/idrp/COGNITO_USER_POOL_ID" \
  --value "$COGNITO_USER_POOL_ID" \
  --type "String" \
  --description "Cognito User Pool ID for IDRP" \
  --overwrite \
  --region $AWS_REGION \
  --profile $AWS_PROFILE

aws ssm put-parameter \
  --name "/idrp/COGNITO_CLIENT_ID" \
  --value "$COGNITO_CLIENT_ID" \
  --type "String" \
  --description "Cognito Client ID for IDRP" \
  --overwrite \
  --region $AWS_REGION \
  --profile $AWS_PROFILE

aws ssm put-parameter \
  --name "/idrp/S3_BUCKET_NAME" \
  --value "$S3_BUCKET_NAME" \
  --type "String" \
  --description "S3 Bucket Name for IDRP" \
  --overwrite \
  --region $AWS_REGION \
  --profile $AWS_PROFILE

aws ssm put-parameter \
  --name "/idrp/DB_HOST" \
  --value "$DB_HOST" \
  --type "String" \
  --description "Database Host for IDRP" \
  --overwrite \
  --region $AWS_REGION \
  --profile $AWS_PROFILE

aws ssm put-parameter \
  --name "/idrp/DB_USER" \
  --value "$DB_USER" \
  --type "String" \
  --description "Database User for IDRP" \
  --overwrite \
  --region $AWS_REGION \
  --profile $AWS_PROFILE

aws ssm put-parameter \
  --name "/idrp/DB_NAME" \
  --value "$DB_NAME" \
  --type "String" \
  --description "Database Name for IDRP" \
  --overwrite \
  --region $AWS_REGION \
  --profile $AWS_PROFILE

echo "Parameters created successfully!"

# Verify parameters
echo "Verifying parameters..."
aws ssm get-parameters-by-path \
  --path "/idrp/" \
  --recursive \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output table \
  --region $AWS_REGION \
  --profile $AWS_PROFILE

echo "Setup complete!"
