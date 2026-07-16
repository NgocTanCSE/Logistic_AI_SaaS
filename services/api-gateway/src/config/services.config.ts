export interface ServiceConfig {
  name: string;
  url: string;
  prefix: string;
  healthPath: string;
}

export const SERVICES: ServiceConfig[] = [
  {
    name: 'iam-service',
    url: process.env.IAM_SERVICE_URL || 'http://iam-service:8081',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'inventory-service',
    url: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8082',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'order-service',
    url: process.env.ORDER_SERVICE_URL || 'http://order-service:8083',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'logistics-service',
    url: process.env.LOGISTICS_SERVICE_URL || 'http://logistics-service:8084',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'customer-api',
    url: process.env.CUSTOMER_API_URL || 'http://customer-api:8085',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8086',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'ai-service',
    url: process.env.AI_SERVICE_URL || 'http://ai-service:8000',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'gps-ingestion',
    url: process.env.GPS_INGESTION_URL || 'http://gps-ingestion-service:8090',
    prefix: '/api/v1',
    healthPath: '/health',
  },
  {
    name: 'webhook-service',
    url: process.env.WEBHOOK_SERVICE_URL || 'http://webhook-service:8092',
    prefix: '/api/v1',
    healthPath: '/health',
  },
];

export const RATE_LIMIT = {
  global: parseInt(process.env.GATEWAY_RATE_LIMIT || '1000', 10),
  windowMs: 60 * 1000,
};

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Set JWT_SECRET in your environment or .env file.');
  }
  return secret;
}

export const JWT_SECRET = process.env.JWT_SECRET || '';

export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const ROUTE_MAP: Record<string, string> = {
  '/api/v1/admin': 'iam-service',
  '/admin': 'iam-service',
  '/api/v1/iam': 'iam-service',
  '/iam': 'iam-service',
  '/api/v1/tenant': 'iam-service',
  '/api/v1/users': 'iam-service',
  '/api/v1/roles': 'iam-service',
  '/api/v1/branches': 'iam-service',
  '/api/v1/feature-flags': 'iam-service',
  '/api/v1/api-keys': 'iam-service',
  '/api/v1/billing': 'iam-service',
  '/api/v1/orders': 'order-service',
  '/orders': 'order-service',
  '/api/v1/inventory': 'inventory-service',
  '/inventory': 'inventory-service',
  '/api/v1/products': 'inventory-service',
  '/products': 'inventory-service',
  '/api/v1/warehouses': 'inventory-service',
  '/warehouses': 'inventory-service',
  '/api/v1/wms': 'inventory-service',
  '/wms': 'inventory-service',
  '/api/v1/bins': 'inventory-service',
  '/api/v1/logistics': 'logistics-service',
  '/logistics': 'logistics-service',
  '/api/v1/trips': 'logistics-service',
  '/trips': 'logistics-service',
  '/api/v1/drivers': 'logistics-service',
  '/drivers': 'logistics-service',
  '/api/v1/vehicles': 'logistics-service',
  '/vehicles': 'logistics-service',
  '/api/v1/geofences': 'logistics-service',
  '/geofences': 'logistics-service',
  '/api/v1/clients': 'order-service',
  '/clients': 'order-service',
  '/api/v1/public': 'customer-api',
  '/api/v1/client': 'customer-api',
  '/client': 'customer-api',
  '/api/v1/notifications': 'notification-service',
  '/notifications': 'notification-service',
  '/ai': 'ai-service',
  '/api/v1/ai': 'ai-service',
  '/routing': 'ai-service',
  '/gps': 'gps-ingestion',
  '/gps/batch': 'gps-ingestion',
  '/api/v1/gps': 'gps-ingestion',
  '/webhook': 'webhook-service',
  '/webhooks': 'webhook-service',
  '/webhooks/': 'webhook-service',
  '/api/v1/waves': 'inventory-service',
  '/waves': 'inventory-service',
  '/api/v1/locations': 'inventory-service',
  '/locations': 'inventory-service',
  '/api/v1/tasks': 'inventory-service',
  '/tasks': 'inventory-service',
  '/api/v1/tracking': 'order-service',
  '/mobile/auth': 'iam-service',
  '/mobile/trips': 'logistics-service',
  '/mobile/uploads': 'logistics-service',
  '/mobile': 'inventory-service',
  '/api/v1/mobile/auth': 'iam-service',
  '/api/v1/mobile/trips': 'logistics-service',
  '/api/v1/mobile/uploads': 'logistics-service',
  '/api/v1/mobile': 'inventory-service',
  '/api/v1/driver-app': 'logistics-service',
  '/driver-app': 'logistics-service',
  '/api/v1/webhooks': 'iam-service',
  '/api/v1/metrics': 'iam-service',
};

export const PUBLIC_PATHS = [
  '/health',
  '/api/health',
  '/routes',
  '/api/v1/public',
  '/api/v1/track',
  '/gateway/health',
];