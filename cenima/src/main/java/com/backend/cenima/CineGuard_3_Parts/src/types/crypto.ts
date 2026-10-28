export type AlgorithmType = 'RS256' | 'ES256' | 'EdDSA' | 'ML-DSA-44';

export interface AlgorithmInfo {
  id: AlgorithmType;
  name: string;
  category: 'Traditional' | 'Post-Quantum (PQC)';
  standard: string;
  securityLevel: string;
  keySize: string;
  signatureSizeBytes: number;
  estimatedJwtSizeBytes: number;
  qrDensityLevel: 'Rất thoáng' | 'Thoáng' | 'Cực thoáng' | 'Rất dày (High Density)';
  color: string;
  description: string;
}

export interface TicketPayload {
  ticketId: string;
  bookingId: string;
  movieId: string;
  movieTitle: string;
  theater: string;
  auditorium: string;
  showtime: string;
  seatCode: string;
  customerName: string;
  customerEmail: string;
  priceVnd: number;
  issuedAt: number;
  expiresAt: number;
}

export interface BenchmarkConfig {
  warmupIterations: number;
  measurementIterations: number;
  forks: number;
  threads: number;
  selectedAlgorithms: AlgorithmType[];
}

export interface BenchmarkResult {
  algorithm: AlgorithmType;
  keyGenTimeMs: number;
  signingTimeUs: number;
  signingStdDevUs: number;
  verifyTimeUs: number;
  verifyStdDevUs: number;
  throughputOpsSec: number;
  signatureSizeBytes: number;
  jwtLengthChars: number;
  memoryAllocBytes: number;
  sampleJwtToken: string;
}

export interface SecurityTestCase {
  id: string;
  name: string;
  category: 'Integrity' | 'Freshness' | 'Key Validation' | 'Algorithm Confusion' | 'Replay & Concurrency';
  description: string;
  attackVector: string;
  expectedResult: 'REJECTED' | 'PREVENTED';
  targetClass: string;
}

export interface SecurityTestExecution {
  testId: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs: number;
  details: string;
  exceptionThrown?: string;
  timestamp: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  requirement: string;
  jmhMechanism: string;
  verificationTip: string;
  isCrucial: boolean;
  status: 'PASSED' | 'RECOMMENDED' | 'PENDING';
}

export interface JavaSourceFile {
  path: string;
  name: string;
  category: 'benchmark' | 'security' | 'shared_contract' | 'build_config';
  author: 'Trang' | 'Thảo' | 'Hương' | 'Ngọc' | 'Build Setup';
  description: string;
  content: string;
}
