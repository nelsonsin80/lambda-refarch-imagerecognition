/* Amplify Params - DO NOT EDIT
You can access the following resource attributes as environment variables from your Lambda function
var environment = process.env.ENV
var region = process.env.REGION
var apiPhotoalbumsGraphQLAPIIdOutput = process.env.API_PHOTOALBUMS_GRAPHQLAPIIDOUTPUT
var apiPhotoalbumsGraphQLAPIEndpointOutput = process.env.API_PHOTOALBUMS_GRAPHQLAPIENDPOINTOUTPUT
Amplify Params - DO NOT EDIT */

import { S3Client, GetObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { fromIni, fromEnv } from '@aws-sdk/credential-providers';
const AWSAppSyncClient = require('aws-appsync').default;
const AUTH_TYPE = require('aws-appsync').AUTH_TYPE;
import gql from 'graphql-tag';
import Sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
const {
  REGION,
  API_PHOTOALBUMS_GRAPHQLAPIENDPOINTOUTPUT,
  THUMBNAIL_WIDTH = '80',
  THUMBNAIL_HEIGHT = '80'
} = process.env;

const THUMB_WIDTH = parseInt(THUMBNAIL_WIDTH, 10);
const THUMB_HEIGHT = parseInt(THUMBNAIL_HEIGHT, 10);

// ---------------------------------------------------------------------------
// AWS clients
// ---------------------------------------------------------------------------
const s3 = new S3Client({ region: REGION });
const client = new AppSyncClient({
  url: API_PHOTOALBUMS_GRAPHQLAPIENDPOINTOUTPUT,
  region: REGION,
  auth: {
    type: AUTH_TYPE.AWS_IAM,
    credentials: fromEnv() || fromIni()
  },
  disableOffline: true
});

// ---------------------------------------------------------------------------
// GraphQL mutation
// ---------------------------------------------------------------------------
const CREATE_PHOTO = gql`
  mutation CreatePhoto($input: CreatePhotoInput!, $condition: ModelPhotoConditionInput) {
    createPhoto(input: $input, condition: $condition) {
      id
      albumId
      owner
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
      album {
        id
        name
        owner
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
function thumbnailKey(prefix, filename) {
  return `${prefix}/resized/${filename}`;
}

function fullsizeKey(prefix, filename) {
  return `${prefix}/fullsize/${filename}`;
}

async function makeThumbnail(photoBuffer) {
  return Sharp(photoBuffer).resize(THUMB_WIDTH, THUMB_HEIGHT).toBuffer();
}

async function resize(photoBuffer, bucketName, key) {
  const prefix = key.substring(0, key.indexOf('/upload/'));
  const filename = key.substring(key.lastIndexOf('/') + 1);
  const metadata = await Sharp(photoBuffer).metadata();

  const thumbnail = await makeThumbnail(photoBuffer);

  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: thumbnailKey(prefix, filename),
      Body: thumbnail
    })),
    s3.send(new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${key}`,
      Key: fullsizeKey(prefix, filename)
    }))
  ]);

  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));

  return {
    photoId: filename,
    thumbnail: {
      key: thumbnailKey(prefix, filename),
      width: THUMB_WIDTH,
      height: THUMB_HEIGHT
    },
    fullsize: {
      key: fullsizeKey(prefix, filename),
      width: metadata.width,
      height: metadata.height
    }
  };
}

async function storePhotoInfo(item) {
  console.log('Storing photo item:', JSON.stringify(item, null, 2));

  const result = await client.mutate({
    mutation: CREATE_PHOTO,
    variables: { input: item },
    fetchPolicy: 'no-cache'
  });

  console.log('GraphQL result:', JSON.stringify(result, null, 2));
  return result;
}

// ---------------------------------------------------------------------------
// Main record processor
// ---------------------------------------------------------------------------
async function processRecord(record) {
  const bucketName = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  console.log('Processing record:', JSON.stringify(record, null, 2));

  if (record.eventName !== 'ObjectCreated:Put') {
    console.log('Not a new upload, skipping.');
    return;
  }

  if (!key.includes('upload/')) {
    console.log('Does not look like a user upload, skipping.');
    return;
  }

  const { Body, Metadata } = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  const photoBuffer = await Body.transformToByteArray();

  const sizes = await resize(photoBuffer, bucketName, key);
  const id = uuidv4();

  const item = {
    id,
    owner: Metadata.owner,
    albumId: Metadata.albumid,
    bucket: bucketName,
    thumbnail: sizes.thumbnail,
    fullsize: sizes.fullsize
  };

  await storePhotoInfo(item);
}

// ---------------------------------------------------------------------------
// Lambda handler
// ---------------------------------------------------------------------------
export const handler = async (event) => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  try {
    for (const record of event.Records) {
      await processRecord(record);
    }
    return { status: 'Photo Processed' };
  } catch (error) {
    console.error('Error processing photo:', error);
    throw error;
  }
};
