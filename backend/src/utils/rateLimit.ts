import { prisma } from "../db.js";

const LIMITS = {
  exposure: 10,
  comment: 50,
  complaint: 3
};

export async function checkRateLimit(ip: string, type: 'exposure' | 'comment' | 'complaint'): Promise<{ allowed: boolean; message?: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let record = await prisma.ipDailyLimit.findUnique({
    where: { ipAddress: ip }
  });

  if (!record) {
    record = await prisma.ipDailyLimit.create({
      data: {
        ipAddress: ip,
        resetDate: today
      }
    });
  }

  // Check reset date
  if (record.resetDate < today) {
    record = await prisma.ipDailyLimit.update({
      where: { ipAddress: ip },
      data: {
        exposureCount: 0,
        commentCount: 0,
        complaintCount: 0,
        resetDate: today
      }
    });
  }

  const countKey = `${type}Count` as keyof typeof record;
  const currentCount = record[countKey] as number;
  const limit = LIMITS[type];

  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `今日${type === 'exposure' ? '曝光' : type === 'comment' ? '评论' : '投诉'}额度已用完，明日0点恢复`
    };
  }

  // Increment
  await prisma.ipDailyLimit.update({
    where: { ipAddress: ip },
    data: {
      [countKey]: { increment: 1 }
    }
  });

  return { allowed: true };
}
