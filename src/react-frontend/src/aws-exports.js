const awsmobile = {
  aws_project_region: "us-east-2",

  // Auth (Cognito User Pools)
  aws_cognito_region: "us-east-2",
  aws_user_pools_id: "us-east-2_UrqGk5rBL",
  aws_user_pools_web_client_id: "769bqfavfoobr0unmgidvof0l6",

  // (Optional) Hosted UI / OAuth
//   oauth: {
//     domain: "your-domain.auth.us-east-2.amazoncognito.com",
//     scope: ["email", "openid", "profile"],
//     redirectSignIn: "https://yourapp.com/",
//     redirectSignOut: "https://yourapp.com/",
//     responseType: "code"
//   },

  // Identity pool for temporary AWS credentials
  aws_cognito_identity_pool_id: "us-east-us-east-2:715c3619-001e-4754-96e9-c16681aa683d",

  // S3 storage for user files
  aws_user_files_s3_bucket: "photo-sharee7fa5f1b25be4c63a81417becda5351236ced-main",
  aws_user_files_s3_bucket_region: "us-east-2",

  // AppSync API
  aws_appsync_graphqlEndpoint: "https://u6eoq2z7z5g7hmhd3zbkdr7cla.appsync-api.us-east-2.amazonaws.com/graphql",
  aws_appsync_region: "us-east-2",
  aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS"
};

export default awsmobile;
