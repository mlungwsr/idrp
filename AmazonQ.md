# Amazon Q Troubleshooting Notes

## JWT Authentication Issue Fix

The application was experiencing an error when running with `node server.js` directly:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "url" argument must be of type string. Received function jwksUri
```

This was followed by a second error:

```
JwksError: Bad Request
```

### Root Cause

1. The first error occurred because the `jwksUri` parameter in the JWT configuration was being passed as an async function instead of a string.
2. The second error occurred because the Cognito User Pool ID and other parameters weren't properly loaded before the JWT middleware was initialized.

### Solution

1. Created a function `createJwtMiddleware()` that initializes the JWT middleware after all parameters are loaded from Parameter Store.
2. Modified the initialization flow to ensure parameters are loaded before JWT middleware is created.
3. Added error handling and logging to help diagnose issues with the JWT configuration.
4. Made the `conditionalJwt` middleware more robust by checking if the JWT middleware is properly initialized.

### Key Changes

1. Delayed JWT middleware initialization until after parameters are loaded
2. Added detailed logging of JWT configuration parameters
3. Added error handling for missing Cognito parameters
4. Made the authentication middleware more resilient to configuration issues

### Testing

To test the application:

1. Ensure AWS credentials are properly configured:
   ```bash
   aws configure --profile IDRP-EC2-Role
   export AWS_PROFILE=IDRP-EC2-Role
   ```

2. Run the application with:
   ```bash
   node server.js
   ```

The application should now properly load parameters from AWS Parameter Store and initialize the JWT middleware correctly.
