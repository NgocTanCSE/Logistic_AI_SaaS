const { PrismaClient } = require('@prisma/client');
class PrismaService extends PrismaClient {
  static _isSqlite = true;
  static get isSqlite() { return this._isSqlite; }
  get tenantClient() { return this; }
}
const p = new PrismaService();
console.log('p.tenantClient === p:', p.tenantClient === p);
console.log('p.tenantUser:', typeof p.tenantUser);
console.log('p.tenantClient.tenantUser:', typeof p.tenantClient.tenantUser);
