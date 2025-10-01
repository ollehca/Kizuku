const StorageAdapter = require('./storage-adapter');

/**
 * Cloud storage adapter (S3-compatible)
 * Future implementation for business/cloud users
 *
 * NOT IMPLEMENTED YET - Stub for future development
 */
class CloudStorageAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);

    this.bucket = config.bucket;
    this.region = config.region;
    this.endpoint = config.endpoint;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;

    if (!this.bucket) {
      throw new Error('CloudStorageAdapter requires bucket configuration');
    }
  }

  async initialize() {
    throw new Error(
      'CloudStorageAdapter not yet implemented. ' +
        'Use LocalStorageAdapter for private licenses. ' +
        'Cloud storage will be available in future releases.'
    );
  }

  async saveFile(_file) {
    throw new Error('CloudStorageAdapter not yet implemented');
  }

  async loadFile(_fileId) {
    throw new Error('CloudStorageAdapter not yet implemented');
  }

  async deleteFile(_fileId) {
    throw new Error('CloudStorageAdapter not yet implemented');
  }

  async fileExists(_fileId) {
    throw new Error('CloudStorageAdapter not yet implemented');
  }

  async getMetadata(_fileId) {
    throw new Error('CloudStorageAdapter not yet implemented');
  }

  async listFiles(_options = {}) {
    throw new Error('CloudStorageAdapter not yet implemented');
  }

  async getStats() {
    throw new Error('CloudStorageAdapter not yet implemented');
  }

  async cleanup(_options) {
    throw new Error('CloudStorageAdapter not yet implemented');
  }
}

module.exports = CloudStorageAdapter;

/**
 * FUTURE IMPLEMENTATION NOTES:
 *
 * When implementing cloud storage (Week 10+), use AWS SDK v3:
 *
 * const { S3Client, PutObjectCommand, GetObjectCommand, ... } = require('@aws-sdk/client-s3');
 *
 * Example saveFile implementation:
 *
 * async saveFile(file) {
 *   const client = new S3Client({
 *     region: this.region,
 *     endpoint: this.endpoint,
 *     credentials: {
 *       accessKeyId: this.accessKeyId,
 *       secretAccessKey: this.secretAccessKey
 *     }
 *   });
 *
 *   const command = new PutObjectCommand({
 *     Bucket: this.bucket,
 *     Key: file.id,
 *     Body: file.content,
 *     ContentType: file.mimeType,
 *     Metadata: file.metadata
 *   });
 *
 *   await client.send(command);
 *
 *   return {
 *     success: true,
 *     url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${file.id}`,
 *     size: file.content.length
 *   };
 * }
 */
