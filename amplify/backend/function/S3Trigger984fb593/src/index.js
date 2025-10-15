/* Amplify Params - DO NOT EDIT
	API_PHOTOSHARE_GRAPHQLAPIENDPOINTOUTPUT
	API_PHOTOSHARE_GRAPHQLAPIIDOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { AppSyncClient, AUTH_TYPE } from '@aws-appsync/client';
import gql from 'graphql-tag';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

// Environment variables
const {
  STATE_MACHINE_ARN,
  API_PHOTOSHARE_GRAPHQLAPIENDPOINTOUTPUT,
  REGION
} = process.env;

// Initialize AppSync client
const client = new AppSyncClient({
  url: API_PHOTOSHARE_GRAPHQLAPIENDPOINTOUTPUT,
  region: REGION,
  auth: {
    type: AUTH_TYPE.AWS_IAM,
    credentials: defaultProvider()
  },
  disableOffline: true
});

// GraphQL mutations
const UPDATE_PHOTO_MUTATION = gql`
  mutation UpdatePhoto($input: UpdatePhotoInput!, $condition: ModelPhotoConditionInput) {
    updatePhoto(input: $input, condition: $condition) {
      id
      albumId
      owner
      uploadTime
      bucket
      SfnExecutionArn
      ProcessingStatus
    }
  }
`;

const START_WORKFLOW_MUTATION = gql`
  mutation StartSfnExecution($input: StartSfnExecutionInput!) {
    startSfnExecution(input: $input) {
      executionArn
      startDate
    }
  }
`;

// Start a Step Functions execution
async function startSfnExecution(bucketName, key, id) {
  const sfnInput = { s3Bucket: bucketName, s3Key: key, objectID: id };
  const startWorkflowInput = {
    input: JSON.stringify(sfnInput),
    stateMachineArn: STATE_MACHINE_ARN
  };

  const { data } = await client.mutate({
    mutation: START_WORKFLOW_MUTATION,
    variables: { input: startWorkflowInput },
    fetchPolicy: 'no-cache'
  });

  return data.startSfnExecution.executionArn;
}

// Process each S3 record
async function processRecord(record) {
  const bucketName = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const id = key.split('/').pop().split('.')[0];

  console.log(`Processing record for key: ${key}`);

  if (!key.includes('upload')) {
    console.log('Not an upload key, skipping.');
    return;
  }

  const SfnExecutionArn = await startSfnExecution(bucketName, key, id);
  console.log(`Step Function started: ${SfnExecutionArn}`);

  const item = {
    id,
    SfnExecutionArn,
    ProcessingStatus: 'RUNNING'
  };

  const result = await client.mutate({
    mutation: UPDATE_PHOTO_MUTATION,
    variables: { input: item },
    fetchPolicy: 'no-cache'
  });

  console.log(`Photo ${id} marked RUNNING in AppSync.`);
  return result;
}

// Lambda handler
export const handler = async (event) => {
  console.log(`Received S3 event with ${event.Records.length} record(s).`);

  try {
    for (const record of event.Records) {
      await processRecord(record);
    }
    return { status: 'Photo Processed' };
  } catch (error) {
    console.error('Error processing event:', error);
    throw error;
  }
};
