export type QuickRangeKey = "HARI_INI" | "KEMARIN" | "1_MINGGU" | "1_BULAN" | "SEMESTER";

export interface QuickRangeInfo {
  startDate: string;
  endDate: string;
  label: string;
  badgeText: string;
  displayDate: string;
  daysCount: number;
}

export interface InspectionFindingItem {
  id?: string;
  activityName: string;
  qualityResult?: string;
  qualityLabel?: string;
  functionResult?: string;
  functionLabel?: string;
  note?: string;
}

export interface InspectionPhotoItem {
  id?: string;
  fileName: string;
  fileUrl: string;
}

export interface SlotInspectionDetail {
  id: string;
  submittedAt: string;
  displayTime: string;
  inspectorName: string;
  inspectorRole: string;
  overallStatus: "BERSIH" | "ADA_TEMUAN";
  dirtyCount: number;
  findings: InspectionFindingItem[];
  photos: InspectionPhotoItem[];
}

export interface RoomSlotSummary {
  id: string;
  code: string;
  name: string;
  role: "PETUGAS" | "SUPERVISOR";
  completed: boolean;
  inspection: SlotInspectionDetail | null;
}

export interface RoomSummaryItem {
  id: string;
  code: string;
  name: string;
  roomTypeName: string;
  totalSlots: number;
  completedSlots: number;
  petugasFinished: number;
  petugasTotal: number;
  spvFinished: number;
  spvTotal: number;
  dirtyCount: number;
  hasFindings: boolean;
  status: "COMPLETE" | "WAITING_SPV" | "PARTIAL" | "EMPTY";
  slots: RoomSlotSummary[];
}

export interface AttentionFindingItem {
  id: string;
  inspectionId: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  slotName: string;
  officerName: string;
  activityName: string;
  dirtyCount: number;
  note: string;
  time: string;
  submittedAt: string;
  photos: string[];
  findingDetails: InspectionFindingItem[];
}

export interface ActionItem {
  id: string;
  roomName: string;
  slotName: string;
  desc: string;
  status: string;
  type: "FINDINGS" | "PENDING";
}

export interface LatestEvidencePhoto {
  id: string;
  fileName: string;
  fileUrl: string;
  capturedAt?: string;
  displayTime: string;
  roomName: string;
  roomCode?: string;
  slotName: string;
  slotCode?: string;
  slotRole?: string;
  officerName: string;
  overallStatus: "BERSIH" | "ADA_TEMUAN";
  dirtyCount?: number;
  dateKey?: string;
}

export interface RecentActivityItem {
  id: string;
  roomName: string;
  roomCode: string;
  slotName: string;
  slotCode: string;
  slotRole: "PETUGAS" | "SUPERVISOR";
  officerName: string;
  officerRole: string;
  submittedAt: string;
  displayTime: string;
  dateKey: string;
  overallStatus: "BERSIH" | "ADA_TEMUAN";
  dirtyCount: number;
  evidenceName?: string;
  photos: string[];
}

export interface DailyTrendItem {
  day: number;
  dateKey: string;
  total: number;
  clean: number;
  finding: number;
}

export interface DashboardSummary {
  completionRate: number;
  completedSessions: number;
  totalExpectedSessions: number;
  cleanCount: number;
  findingCount: number;
  greenCount: number;
  purpleCount: number;
  yellowCount: number;
  redCount: number;
  startDate: string;
  endDate: string;
  daysCount: number;
}

export interface DashboardMetrics {
  totalRooms: number;
  inspectionsTodayCount: number;
  cleanCount: number;
  findingCount: number;
  monthlyInspectionsCount: number;
  monthlyCleanCount: number;
  monthlyFindingCount: number;
  totalEvaluations: number;
  averageRating: string;
  satisfactionRate: number;
}

export interface DashboardData {
  today: string;
  dateKey: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  selectedMonth: string;
  summary: DashboardSummary;
  metrics: DashboardMetrics;
  dailyTrend: DailyTrendItem[];
  ratingDist: Record<number, number>;
  recentActivities: RecentActivityItem[];
  latestPhotos: LatestEvidencePhoto[];
  findings: AttentionFindingItem[];
  roomSummaries: RoomSummaryItem[];
}
