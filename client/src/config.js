// Amazon Cognito configuration
export const cognitoConfig = {
  region: 'us-west-2',
  userPoolId: 'us-west-2_cJ4l0XNGY',
  userPoolWebClientId: '3b4q6ld6jns128uuj935tbplph', // Updated to the new client ID without secret
};

// API configuration
export const apiConfig = {
  s3BucketName: 'idrp-000001-dev',
  apiBaseUrl: '/api'  // Changed from absolute URL to relative URL
};
