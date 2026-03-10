import { loadConfig, type Config } from "../config.js";
import { createStorageProviderFromConfig } from "./provider-registry.js";
import { createStorageService } from "./service.js";
import type { StorageService } from "./types.js";

let cachedStorageService: StorageService | null = null;
let cachedSignature: string | null = null;

function signatureForConfig(config: Config): string {
  return JSON.stringify({
    provider: config.storageProvider,
    localDisk: config.storageLocalDiskBaseDir,
    s3Bucket: config.storageS3Bucket,
    s3Region: config.storageS3Region,
    s3Endpoint: config.storageS3Endpoint,
    s3Prefix: config.storageS3Prefix,
    s3ForcePathStyle: config.storageS3ForcePathStyle,
    s3AccessKeyId: config.storageS3AccessKeyId ? "configured" : "",
    s3SecretAccessKey: config.storageS3SecretAccessKey ? "configured" : "",
    s3SessionToken: config.storageS3SessionToken ? "configured" : "",
  });
}

export function createStorageServiceFromConfig(config: Config): StorageService {
  return createStorageService(createStorageProviderFromConfig(config));
}

export function createDynamicStorageService(): StorageService {
  return {
    get provider() {
      return getStorageService().provider;
    },
    putFile(input) {
      return getStorageService().putFile(input);
    },
    getObject(companyId, objectKey) {
      return getStorageService().getObject(companyId, objectKey);
    },
    headObject(companyId, objectKey) {
      return getStorageService().headObject(companyId, objectKey);
    },
    deleteObject(companyId, objectKey) {
      return getStorageService().deleteObject(companyId, objectKey);
    },
  };
}

export function getStorageService(): StorageService {
  const config = loadConfig();
  const signature = signatureForConfig(config);
  if (!cachedStorageService || cachedSignature !== signature) {
    cachedStorageService = createStorageServiceFromConfig(config);
    cachedSignature = signature;
  }
  return cachedStorageService;
}

export type { StorageService, PutFileResult } from "./types.js";
