import util from 'util';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

// Initialize Rekognition client (uses Lambda IAM role automatically)
const client = new RekognitionClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler.
 * Detects labels in an image stored in S3.
 */
export const handler = async (event) => {
  console.log(`Detecting labels for S3 object:\n`, util.inspect(event, { depth: 3 }));

  const srcBucket = event.s3Bucket;
  const srcKey = decodeURIComponent(event.s3Key.replace(/\+/g, ' '));

  // Allow override via environment variables if desired
  const MaxLabels = parseInt(process.env.MAX_LABELS || '10', 10);
  const MinConfidence = parseFloat(process.env.MIN_CONFIDENCE || '60');

  const params = {
    Image: { S3Object: { Bucket: srcBucket, Name: srcKey } },
    MaxLabels,
    MinConfidence
  };

  try {
    const result = await client.send(new DetectLabelsCommand(params));
    const labels = result.Labels || [];
    console.log(`Detected ${labels.length} label(s) for ${srcKey}`);
    return {
      bucket: srcBucket,
      key: srcKey,
      labels
    };
  } catch (error) {
    console.error('Error detecting labels:', error);
    throw error;
  }
};
