import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import geoip from 'geoip-lite';
import { prisma } from '../config/prisma';

export type SecurityEventPayload = {
  type: string;
  ip: string;
  location: string;
  path: string;
  detail: string;
  level: 'low' | 'medium' | 'high';
  timestamp: string;
  latitude: number;
  longitude: number;
};

let wss: WebSocketServer | null = null;

const normalizeIp = (ip: string): string => {
  if (!ip) return 'unknown';
  return ip.replace('::ffff:', '');
};

const isPrivateIp = (ip: string): boolean => {
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
};

const ipToLocation = (rawIp: string): string => {
  const ip = normalizeIp(rawIp);
  if (!ip || ip === 'unknown') return '未知';
  if (ip === '::1' || ip === '127.0.0.1') return '本机';
  if (isPrivateIp(ip)) return '内网';

  const geo = geoip.lookup(ip);
  if (!geo) return '未知';

  const parts = [geo.country, geo.region, geo.city].filter(Boolean);
  if (parts.length === 0) return '未知';
  // 尽量给“更具体的地名”：优先城市，其次省/州，再次国家
  return (geo.city || geo.region || geo.country) as string;
};

const ipToGeo = (rawIp: string): { latitude: number; longitude: number; location: string } => {
  const ip = normalizeIp(rawIp);
  const location = ipToLocation(ip);
  const geo = !isPrivateIp(ip) ? geoip.lookup(ip) : null;
  if (geo?.ll?.length === 2) {
    return { latitude: geo.ll[0], longitude: geo.ll[1], location };
  }
  // 本机/内网/未知：没有真实经纬度就用 0,0（前端用地名展示，不依赖坐标“准不准”）
  return { latitude: 0, longitude: 0, location };
};

export const initRealtimeServer = (server: HttpServer): void => {
  wss = new WebSocketServer({ server, path: '/ws/security-events' });
  wss.on('connection', async (socket, req) => {
    const ip = normalizeIp(req.socket.remoteAddress ?? 'unknown');
    const geo = ipToGeo(ip);
    const hello: SecurityEventPayload = {
      type: 'ws_connected',
      ip,
      location: geo.location,
      path: '/ws/security-events',
      detail: 'WebSocket 已连接，等待事件推送…',
      level: 'low',
      timestamp: new Date().toISOString(),
      latitude: geo.latitude,
      longitude: geo.longitude
    };
    socket.send(JSON.stringify(hello));

    // 连接后回放最近事件，避免“只显示已连接”
    try {
      const items = await prisma.attackLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 12
      });
      items.reverse().forEach((i) => {
        const g = ipToGeo(i.ip_address);
        const payload: SecurityEventPayload = {
          type: i.attack_type,
          ip: i.ip_address,
          location: g.location,
          path: i.path,
          detail: `${i.status} ${i.mitigation_action ?? ''}`.trim(),
          level: i.severity,
          timestamp: i.created_at.toISOString(),
          latitude: g.latitude,
          longitude: g.longitude
        };
        socket.send(JSON.stringify(payload));
      });
    } catch {
      // ignore replay failures
    }
  });
};

export const emitSecurityEvent = (data: Omit<SecurityEventPayload, 'timestamp' | 'latitude' | 'longitude' | 'location'>): void => {
  if (!wss) return;
  const geo = ipToGeo(data.ip);
  const payload: SecurityEventPayload = {
    ...data,
    timestamp: new Date().toISOString(),
    latitude: geo.latitude,
    longitude: geo.longitude,
    location: geo.location
  };
  const text = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(text);
  });
};
