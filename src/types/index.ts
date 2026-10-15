export type ProtectionMode = 'strict' | 'balanced' | 'permissive';

export type SafetyGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export type MatrixAction = 'block' | 'noop' | 'allow';

export type NoiseIntensity = 'minimal' | 'low' | 'medium' | 'high';

export interface FilterListInfo {
  id: string;
  name: string;
  category: string;
  count: number;
  enabled: boolean;
  lastUpdated: string;
}

export interface DynamicMatrixRules {
  firstPartyScripts: MatrixAction;
  thirdPartyScripts: MatrixAction;
  firstPartyFrames: MatrixAction;
  thirdPartyFrames: MatrixAction;
  inlineScripts: MatrixAction;
  images: MatrixAction;
  webSockets: MatrixAction;
}

export interface CanvasBlockerSettings {
  canvasMode: 'fake' | 'block' | 'allow';
  canvasNoiseLevel: NoiseIntensity;
  ignoreFrequentColors: boolean;
  fakeAlphaChannel: boolean;
  
  webglMode: 'fake' | 'block' | 'allow';
  webglMaskVendor: boolean;
  webglMaskRenderer: boolean;
  webglPerturbPixels: boolean;
  
  audioMode: 'fake' | 'block' | 'allow';
  audioNoiseLevel: NoiseIntensity;
  
  domRectShield: boolean;
  textMetricsShield: boolean;
  navigatorHardwareShield: boolean;
  screenResolutionShield: boolean;
  windowNameShield: boolean;
  historyLengthShield: boolean;
}

export interface UBlockSettings {
  matrix: DynamicMatrixRules;
  cosmeticFiltering: boolean;
  blockCookieBanners: boolean;
  blockPopups: boolean;
  blockMedia: boolean;
  strictBlocking: boolean;
  filterLists: FilterListInfo[];
  customFilters: string[];
}

export interface AiDefenseSettings {
  aiScraperShield: boolean;
  gpcHeader: boolean;
  antiAiHeaders: boolean;
  metaTrainingLock: boolean;
  xGrokTrainingLock: boolean;
  googleGeminiLock: boolean;
  linkedInTrainingLock: boolean;
}

export interface PrivacySettings {
  masterShield: boolean;
  mode: ProtectionMode;
  
  // Legacy quick toggles (kept for compatibility)
  canvasShield: boolean;
  audioShield: boolean;
  webglShield: boolean;
  fontShield: boolean;
  aiScraperShield: boolean;
  elementZapperEnabled: boolean;
  whitelistedDomains: string[];
  customRules: string[];
  
  // Detailed uBlock & CanvasBlocker modules
  canvasBlocker: CanvasBlockerSettings;
  uBlock: UBlockSettings;
  aiDefense: AiDefenseSettings;
}

export interface NetworkLogEntry {
  id: string;
  timestamp: number;
  url: string;
  domain: string;
  type: string;
  action: 'BLOCKED' | 'ALLOWED' | 'MODIFIED';
  ruleSource: string;
}

export interface DomainTrackerStat {
  domain: string;
  blockedCount: number;
  allowedCount: number;
  category?: string;
}

export interface TabThreatStats {
  tabId: number;
  domain: string;
  url: string;
  trackersBlocked: number;
  canvasFaked: number;
  audioFaked: number;
  webglFaked: number;
  aiBeaconsBlocked: number;
  safetyScore: SafetyGrade;
  threatEvents: ThreatEvent[];
  networkLogs: NetworkLogEntry[];
  connectedDomains: DomainTrackerStat[];
}

export interface ThreatEvent {
  id: string;
  timestamp: number;
  type: 'canvas' | 'audio' | 'webgl' | 'tracker' | 'ai_crawler' | 'zapper' | 'domrect';
  source: string;
  description: string;
}

export interface GlobalPrivacyStats {
  totalTrackersBlocked: number;
  totalFingerprintsScrambled: number;
  totalAiScrapersBlocked: number;
  totalElementsZapped: number;
  activeSince: number;
}

export type BrokerCategory =
  | 'People Search'
  | 'AdTech / Aggregator'
  | 'Financial & Risk'
  | 'AI Training Dataset';

export type OptOutStatus = 'Pending' | 'Dispatched' | 'In Review' | 'Removed';

export interface BrokerEntry {
  id: string;
  name: string;
  category: BrokerCategory;
  optOutUrl: string;
  contactEmail: string;
  jurisdiction: 'GDPR' | 'CCPA' | 'GLOBAL';
  status: OptOutStatus;
  lastUpdated?: string;
  verificationHash?: string;
}

export interface UserProfile {
  fullName: string;
  primaryEmail: string;
  secondaryEmails: string[];
  phone: string;
  cityState: string;
  country: string;
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedVault {
  iv: string; // Base64
  salt: string; // Base64
  ciphertext: string; // Base64
  updatedAt: number;
}
