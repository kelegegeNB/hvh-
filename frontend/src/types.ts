export type ReportItem = {
  id: string;
  title: string;
  content: string;
  targetName: string;
  targetId?: string;
  platform: string;
  status: string;
  scoreAvg: number;
  sortOrder: number;
  publisherIp?: string;
  isHidden: boolean;
  trafficVolume: number;
  createdAt: string;
  evidences?: { id: string; url: string; type: string }[];
};

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  username: string;
  attachments?: { id: string; url: string; type: string }[];
};

export type ExposureViewLogItem = {
  id: string;
  reportId: string;
  report?: { title: string };
  viewerIp: string;
  viewTime: string;
  userAgent?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
};

export type ExposureComplaintItem = {
  id: string;
  reportId: string;
  report?: { title: string };
  title: string;
  description: string;
  contact: string;
  images: string; // JSON string
  complainantIp: string;
  status: string;
  result?: string;
  handledBy?: string;
  handledAt?: string;
  createdAt: string;
};

export type IpBlacklistItem = {
  id: string;
  ip: string;
  reason: string;
  startAt: string;
  endAt: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

export type AppealItem = {
  id: string;
  ip: string;
  content: string;
  contact: string;
  status: string;
  handledBy?: string;
  reply?: string;
  createdAt: string;
};

export type PlatformItem = {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
};

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
};

export type AdItem = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  startAt: string;
  endAt: string;
  status: string;
};

export type UserItem = {
  id: string;
  username: string;
  role: string;
  status: string;
  violationCount: number;
  createdAt: string;
};

export type MusicItem = {
  id: string;
  title: string;
  url: string;
  status: string;
  createdAt: string;
};

export type SystemConfigItem = {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
};

export type OperationLogItem = {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ip?: string;
  createdAt: string;
};

export type UserLogItem = {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  details?: string;
  ip: string;
  device?: string;
  reportId?: string;
  createdAt: string;
};
