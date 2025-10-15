import util from 'util';
import gm from 'gm';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// ---------------------------------------------------------------------------
// Configure GraphicsMagick with ImageMagick support
// ---------------------------------------------------------------------------
const gmIM = gm.subClass({ imageMagick: true });

// ---------------------------------------------------------------------------
// Initialize S3 client (AWS SDK v3 automatically uses Lambda IAM credentials)
// ---------------------------------------------------------------------------
const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * Identify metadata for an image buffer using GraphicsMagick/ImageMagick.
 * Wrapped in a native Promise for clarity.
 */
const identifyAsync = (imageBuffer) =>
  new Promise((resolve, reject) => {
    gmIM(imageBuffer).identify((err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

/**
 * Lambda handler — reads an image from S3 and returns its metadata.
 */
export const handler = async (event) => {
  console.log('Reading input from event:\n', util.inspect(event, { depth: 5 }));

  const srcBucket = event.s3Bucket;
  const srcKey = decodeURIComponent(event.s3Key.replace(/\+/g, ' '));

  try {
    // Fetch image object from S3
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: srcBucket, Key: srcKey }));

    if (!Body) throw new ImageIdentifyError('Empty S3 object body.');

    // Convert stream to Buffer
    const imageBuffer = Buffer.from(await Body.transformToByteArray());
    if (!imageBuffer.length) throw new ImageIdentifyError('S3 object is zero-length.');

    // Extract metadata
    const metadata = await identifyAsync(imageBuffer);
    console.log('Identified metadata:\n', JSON.stringify(metadata, null, 2));

    return metadata;
  } catch (err) {
    console.error('Error identifying image metadata:', err);
    throw new ImageIdentifyError(err.message || String(err));
  }
};

/**
 * Custom error type for image identification failures.
 */
class ImageIdentifyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageIdentifyError';
  }
}
