import { Storage, Bucket } from "@google-cloud/storage";
import path from "path";
import fs from "fs";

export class CloudStorageService {
  private storage: Storage;
  private bucket: Bucket;

  constructor() {
    const bucketName = process.env.GCS_BUCKET_NAME || "";
    if (!bucketName) {
      throw new Error("[CloudStorageService] Missing GCS_BUCKET_NAME in environment variables.");
    }

    const keyPath = path.join(process.cwd(), "gcp-service-account.json");
    this.storage = fs.existsSync(keyPath) 
      ? new Storage({ keyFilename: keyPath })
      : new Storage();
      
    this.bucket = this.storage.bucket(bucketName);
  }

  /**
   * Uploads a file buffer to Google Cloud Storage
   * @param buffer The file buffer to upload
   * @param fileName The destination file name
   * @param contentType The MIME type of the file (e.g., 'image/jpeg', 'image/png')
   * @returns The public URL of the uploaded file
   */
  async uploadFile(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    try {
      const file = this.bucket.file(fileName);
      await file.save(buffer, {
        metadata: {
          contentType: contentType,
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
      });

      console.log(`[CloudStorageService] Successfully uploaded ${fileName} to GCS bucket ${this.bucket.name}`);

      return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
    } catch (error: any) {
      console.error(`❌ [CloudStorageService] Error:`, error.message);
      throw error; 
    }
  }
}

export const cloudStorageService = new CloudStorageService();
