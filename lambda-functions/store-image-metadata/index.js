import util from 'util';
import { AppSyncClient, AUTH_TYPE } from '@aws-appsync/client';
import gql from 'graphql-tag';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
const { GRAPHQL_API_ENDPOINT, AWS_REGION } = process.env;

// ---------------------------------------------------------------------------
// Initialize AppSync client (v3, Node 18 compatible)
// ---------------------------------------------------------------------------
const client = new AppSyncClient({
  url: GRAPHQL_API_ENDPOINT,
  region: AWS_REGION,
  auth: {
    type: AUTH_TYPE.AWS_IAM,
    credentials: defaultProvider() // automatically uses Lambda’s IAM role
  },
  disableOffline: true
});

// ---------------------------------------------------------------------------
// GraphQL mutation
// ---------------------------------------------------------------------------
const UPDATE_PHOTO = gql`
  mutation UpdatePhoto($input: UpdatePhotoInput!, $condition: ModelPhotoConditionInput) {
    updatePhoto(input: $input, condition: $condition) {
      id
      albumId
      uploadTime
      bucket
      fullsize {
        key
        width
        height
      }
      thumbnail {
        key
        width
        height
      }
      format
      exifMake
      exitModel
      objectDetected
      SfnExecutionArn
      ProcessingStatus
      geoLocation {
        Latitude {
          D
          M
          S
          Direction
        }
        Longtitude {
          D
          M
          S
          Direction
        }
      }
      owner
    }
  }
`;

// ---------------------------------------------------------------------------
// Lambda handler
// ---------------------------------------------------------------------------
export const handler = async (event) => {
  console.log('Received event:\n', util.inspect(event, { depth: 3 }));

  const id = event.objectID;
  const extractedMetadata = event.extractedMetadata || {};

  const fullsize = {
    key: event.s3Key,
    width: extractedMetadata?.dimensions?.width,
    height: extractedMetadata?.dimensions?.height
  };

  const updateInput = {
    id,
    fullsize,
    format: extractedMetadata.format,
    exifMake: extractedMetadata.exifMake || null,
    exitModel: extractedMetadata.exifModel || null,
    ProcessingStatus: 'SUCCEEDED'
  };

  // Thumbnail information
  const thumbnailInfo = event.parallelResults?.[1];
  if (thumbnailInfo) {
    updateInput.thumbnail = {
      key: thumbnailInfo.s3key,
      width: Math.round(thumbnailInfo.width),
      height: Math.round(thumbnailInfo.height)
    };
  }

  // Object detection labels
  const labels = event.parallelResults?.[0];
  if (labels && Array.isArray(labels)) {
    updateInput.objectDetected = labels.map((l) => l.Name);
  }

  // Geo-location
  if (extractedMetadata.geo) {
    updateInput.geoLocation = {
      Latitude: extractedMetadata.geo.latitude,
      Longtitude: extractedMetadata.geo.longitude
    };
  }

  console.log('Final update payload:\n', JSON.stringify(updateInput, null, 2));

  try {
    await client.mutate({
      mutation: UPDATE_PHOTO,
      variables: { input: updateInput },
      fetchPolicy: 'no-cache'
    });

    console.log(`Photo ${id} metadata updated successfully.`);
    return { Status: 'Success' };
  } catch (error) {
    console.error('Error updating photo metadata:', error);
    throw error;
  }
};
