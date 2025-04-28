## Parameter Store Integration

This application uses AWS Parameter Store to securely store and retrieve configuration values. The following parameters are stored in Parameter Store:

- `/idrp/COGNITO_USER_POOL_ID` - Cognito User Pool ID
- `/idrp/COGNITO_CLIENT_ID` - Cognito Client ID
- `/idrp/S3_BUCKET_NAME` - S3 Bucket Name
- `/idrp/DB_HOST` - Database Host
- `/idrp/DB_USER` - Database User
- `/idrp/DB_NAME` - Database Name

### Setting up Parameter Store

1. Create the parameters in Parameter Store:
   ```bash
   aws ssm put-parameter --name "/idrp/COGNITO_USER_POOL_ID" --value "your-user-pool-id" --type "String"
   aws ssm put-parameter --name "/idrp/COGNITO_CLIENT_ID" --value "your-client-id" --type "String"
   aws ssm put-parameter --name "/idrp/S3_BUCKET_NAME" --value "your-bucket-name" --type "String"
   aws ssm put-parameter --name "/idrp/DB_HOST" --value "your-db-endpoint" --type "String"
   aws ssm put-parameter --name "/idrp/DB_USER" --value "idrp_app" --type "String"
   aws ssm put-parameter --name "/idrp/DB_NAME" --value "idrp" --type "String"
   ```

2. Add the necessary permissions to your IAM role:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ssm:GetParameter",
           "ssm:GetParameters",
           "ssm:GetParametersByPath"
         ],
         "Resource": [
           "arn:aws:ssm:your-region:your-account-id:parameter/idrp/*"
         ]
       }
     ]
   }
   ```

### Local Development with Parameter Store

For local development, you can still use Parameter Store by configuring your AWS profile:

1. Configure your AWS credentials:
   ```bash
   aws configure --profile IDRP-EC2-Role
   ```

2. Set the AWS_PROFILE environment variable:
   ```bash
   export AWS_PROFILE=IDRP-EC2-Role
   ```

3. Run the application:
   ```bash
   npm run dev
   ```

The application will automatically retrieve parameters from Parameter Store using the specified AWS profile.
