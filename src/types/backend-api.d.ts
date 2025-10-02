/**
 * Backend API Type Definitions
 * Provides TypeScript types for the Kizu backend services accessible from renderer
 */

/**
 * License Types
 */
export type LicenseType = 'private' | 'business';

/**
 * Configuration
 */
export interface AppConfig {
  mode: 'local' | 'cloud';
  licenseType: LicenseType;
  paths: {
    userData: string;
    database: string;
    assets: string;
    logs: string;
    temp: string;
  };
  app: {
    name: string;
    version: string;
    platform: string;
    arch: string;
  };
  database: DatabaseConfig;
  storage: StorageConfig;
  auth: AuthConfig;
  features: FeatureFlags;
}

export interface DatabaseConfig {
  type: 'embedded-postgres' | 'cloud-postgres';
  port?: number;
  host?: string;
  connectionString?: string;
}

export interface StorageConfig {
  type: 'local' | 'cloud-s3';
  basePath?: string;
  bucket?: string;
  region?: string;
}

export interface AuthConfig {
  type: 'local' | 'cloud';
  autoLogin: boolean;
  apiUrl?: string;
}

export interface FeatureFlags {
  collaboration: boolean;
  teams: boolean;
  cloudSync: boolean;
  versionHistory: boolean;
  versionHistoryDuration: number;
  versionHistoryInterval: number;
}

/**
 * Authentication
 */
export interface AuthCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserData {
  username: string;
  fullName: string;
  email: string;
  password?: string;
}

export interface User {
  username: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  reason?: string;
  licenseType?: LicenseType;
  user?: User;
}

export interface AuthState {
  authenticated: boolean;
  reason?: string;
  licenseType?: LicenseType;
  user?: User;
  nextScreen?: string;
}

export interface CreateAccountResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Storage
 */
export type StorageCategory = 'images' | 'fonts' | 'media' | 'data';

export interface FileMetadata {
  name: string;
  size: number;
  category: StorageCategory;
  createdAt: string;
}

/**
 * System Status
 */
export interface ServiceStatus {
  initialized: boolean;
  config: boolean;
  auth: boolean;
  storage: boolean;
}

/**
 * Backend API Interface
 */
export interface BackendAPI {
  config: {
    get(): Promise<AppConfig>;
    getValue(key: string): Promise<any>;
    isFeatureEnabled(featureName: string): Promise<boolean>;
  };

  auth: {
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    getState(): Promise<AuthState>;
    logout(): Promise<boolean>;
    createAccount(userData: UserData): Promise<CreateAccountResult>;
    hasAccount(): Promise<boolean>;
  };

  storage: {
    storeFile(category: StorageCategory, fileName: string, data: string): Promise<void>;
    retrieveFile(category: StorageCategory, fileName: string): Promise<string>;
    listFiles(category: StorageCategory): Promise<FileMetadata[]>;
    deleteFile(category: StorageCategory, fileName: string): Promise<void>;
  };

  system: {
    getStatus(): Promise<ServiceStatus>;
    isInitialized(): Promise<boolean>;
  };
}

/**
 * Electron API exposed to renderer via contextBridge
 */
declare global {
  interface Window {
    electronAPI: {
      // Existing APIs...
      getAppVersion(): Promise<string>;
      showSaveDialog(options: any): Promise<any>;
      showOpenDialog(options: any): Promise<any>;
      writeFile(filePath: string, data: string): Promise<{ success: boolean; error?: string }>;
      readFile(filePath: string): Promise<{ success: boolean; data?: string; error?: string }>;

      // Backend Services API
      backend: BackendAPI;

      // Other existing APIs...
      platform: string;
      isDesktop: boolean;
      clipboard: {
        writeText(text: string): Promise<{ success: boolean }>;
        readText(): Promise<{ success: boolean; data?: string }>;
        writeHTML(html: string): Promise<{ success: boolean }>;
        readHTML(): Promise<{ success: boolean; data?: string }>;
        writeImage(image: string): Promise<{ success: boolean }>;
        readImage(): Promise<{ success: boolean; data?: string }>;
        clear(): Promise<{ success: boolean }>;
        hasText(): Promise<{ success: boolean; data?: boolean }>;
        hasImage(): Promise<{ success: boolean; data?: boolean }>;
      };
    };
  }
}

export {};
