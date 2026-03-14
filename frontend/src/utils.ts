export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export const normalizeIp = (ip: string) => {
    if (!ip) return "";
    return ip.replace(/^::ffff:/, "");
};

export const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
};

export const platformOptions = [
  { value: "Steam", label: "Steam", icon: "https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" },
  { value: "Discord", label: "Discord", icon: "https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" },
  { value: "QQ", label: "QQ", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Tencent_QQ_Logo_2022.svg/1200px-Tencent_QQ_Logo_2022.svg.png" }
];

export const splitPlatforms = (platforms: string) => {
  if (!platforms) return [];
  return platforms.split(",").map((p) => p.trim()).filter(Boolean);
};

export const getAvatarUrl = (item: any) => {
    // If we had user avatar logic, we could use it here.
    // For now, if platform includes QQ and we can extract a number, maybe use QQ avatar?
    // This is just a placeholder logic based on potential future needs.
    if (item.platform && item.platform.includes("QQ") && item.targetId && /^\d+$/.test(item.targetId)) {
        return `https://q1.qlogo.cn/g?b=qq&nk=${item.targetId}&s=100`;
    }
    return null;
};
