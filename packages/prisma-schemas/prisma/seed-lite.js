"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var faker_1 = require("@faker-js/faker");
var client_1 = require("@prisma/client");
var bcrypt_1 = __importDefault(require("bcrypt"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var plans, _i, plans_1, plan, proPlan, adminPasswordHash, demoTenant, rolePermissionMap, roleIds, _a, _b, roleName, role, perms, _c, perms_1, p, _d, resource, action, actionName, existingPerm, tenantAdminPassword, demoUsers, _e, demoUsers_1, userDef, tenantAdminPassword_1, tenantUser, roleId, warehousesData, allWhs, _loop_1, _f, allWhs_1, wh, allZones, _loop_2, _g, allZones_1, zone, allRacks, binsData, _loop_3, _h, allRacks_1, rack, allBins, categoriesData, allCategories, productsData, allProducts, inventories, i, allInventories, allTenantUsers, movements, i, inv, vehiclesData, allVehicles, driverUsersData, newDriverUsers, driversData, allDrivers, clientsData, allClients, allOrders, i, ordersBatch, allOrdersData, orderItemsData, _j, allOrders_1, order, itemCount, j, trackingEventsData, _k, _l, order, eventCount, statuses, j, tripsData, allTrips, _m, _o, trip, stopsCount, s, order, allTripStops, deliveriesData, expensesData, codData, sosData, equipmentData, tasksData, branchesData, wavesData, modelsData, allModels, feedbackData, forecastProducts, forecastData, cycleCountsData, adjustmentsData, packLogsData, scanLogsData, returnReasonsData, _p, returnReasonsData_1, reason, demoKeyHash;
        var _q;
        return __generator(this, function (_r) {
            switch (_r.label) {
                case 0:
                    console.log(' Seed-lite HF: Creating essential demo data for SQLite...');
                    // 1. Subscription Plans
                    console.log('--- Seeding Subscription Plans ---');
                    plans = [
                        { name: 'Basic', code: 'BASIC', priceMonthly: 99, maxUsers: 10, maxWarehouses: 2, maxVehicles: 5 },
                        { name: 'Pro', code: 'PRO', priceMonthly: 299, maxUsers: 50, maxWarehouses: 10, maxVehicles: 30 },
                        { name: 'Enterprise', code: 'ENTERPRISE', priceMonthly: 999, maxUsers: 500, maxWarehouses: 100, maxVehicles: 500 },
                    ];
                    _i = 0, plans_1 = plans;
                    _r.label = 1;
                case 1:
                    if (!(_i < plans_1.length)) return [3 /*break*/, 4];
                    plan = plans_1[_i];
                    return [4 /*yield*/, prisma.subscriptionPlan.upsert({
                            where: { code: plan.code },
                            update: {},
                            create: __assign(__assign({}, plan), { 
                                // Dùng string cho SQLite (đã convert Json -> String)
                                featuresJson: JSON.stringify({ ai_routing: plan.code !== 'BASIC', real_time_tracking: true }), isActive: true }),
                        })];
                case 2:
                    _r.sent();
                    _r.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [4 /*yield*/, prisma.subscriptionPlan.findFirst({ where: { code: 'PRO' } })];
                case 5:
                    proPlan = _r.sent();
                    // 2. System Admin (Cho admin-portal)
                    console.log('--- Seeding System Admin ---');
                    return [4 /*yield*/, bcrypt_1.default.hash('Admin@123', 10)];
                case 6:
                    adminPasswordHash = _r.sent();
                    return [4 /*yield*/, prisma.systemAdmin.upsert({
                            where: { email: 'admin@smartlogi.vn' },
                            update: { passwordHash: adminPasswordHash, status: 'ACTIVE' },
                            create: {
                                email: 'admin@smartlogi.vn',
                                passwordHash: adminPasswordHash,
                                fullName: 'Super Admin',
                                status: 'ACTIVE',
                            },
                        })];
                case 7:
                    _r.sent();
                    // 3. Demo Tenant (Cho tenant-portal)
                    console.log('--- Seeding Demo Tenant ---');
                    return [4 /*yield*/, prisma.tenant.upsert({
                            where: { slug: 'demo-tenant' },
                            update: { status: 'ACTIVE', planId: proPlan === null || proPlan === void 0 ? void 0 : proPlan.id },
                            create: {
                                name: 'Demo Logistics Co.',
                                slug: 'demo-tenant',
                                dbSchemaName: 'tenant_demo',
                                status: 'ACTIVE',
                                planId: proPlan === null || proPlan === void 0 ? void 0 : proPlan.id,
                                maxUsers: 50,
                                maxWarehouses: 5,
                                maxVehicles: 30,
                            },
                        })];
                case 8:
                    demoTenant = _r.sent();
                    // 4. Roles & Permissions
                    console.log('--- Seeding Roles & Permissions ---');
                    rolePermissionMap = {
                        'TENANT_ADMIN': [
                            "inventory:read", "inventory:adjust", "warehouses:manage", "tasks:read", "tasks:create", "tasks:update",
                            "orders:read", "orders:create", "trips:read", "trips:dispatch", "vehicles:read", "vehicles:manage",
                            "drivers:manage", "users:read", "users:invite", "roles:manage", "settings:manage", "audit-logs:read",
                            "billing:read", "api-keys:manage", "notifications:read", "mobile:sync:pull", "mobile:sync:push",
                            "mobile:uploads", "mobile:gps:batch", "mobile:sos", "pack-station:scan"
                        ],
                        'WAREHOUSE_MANAGER': ["inventory:read", "inventory:adjust", "warehouses:manage", "tasks:read", "tasks:create", "tasks:update", "orders:read", "vehicles:read", "users:read", "notifications:read", "pack-station:scan"],
                        'WAREHOUSE_STAFF': ["inventory:read", "tasks:read", "tasks:update", "mobile:sync:pull", "mobile:sync:push", "pack-station:scan"],
                        'LOGISTICS_MANAGER': ["orders:read", "orders:create", "trips:read", "trips:dispatch", "vehicles:read", "vehicles:manage", "drivers:manage", "users:read", "notifications:read"],
                        'DRIVER': ["trips:read", "mobile:sync:pull", "mobile:sync:push", "mobile:uploads", "mobile:gps:batch", "mobile:sos"],
                        'CUSTOMER_CLIENT': ["orders:read", "orders:create", "inventory:read", "notifications:read"],
                        'TENANT_USER': ["inventory:read", "orders:read", "tasks:read", "trips:read"]
                    };
                    roleIds = {};
                    _a = 0, _b = Object.keys(rolePermissionMap);
                    _r.label = 9;
                case 9:
                    if (!(_a < _b.length)) return [3 /*break*/, 18];
                    roleName = _b[_a];
                    return [4 /*yield*/, prisma.customRole.findFirst({ where: { name: roleName } })];
                case 10:
                    role = _r.sent();
                    if (!!role) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.customRole.create({
                            data: { name: roleName, isSystemDefault: true },
                        })];
                case 11:
                    role = _r.sent();
                    _r.label = 12;
                case 12:
                    roleIds[roleName] = role.id;
                    perms = rolePermissionMap[roleName];
                    _c = 0, perms_1 = perms;
                    _r.label = 13;
                case 13:
                    if (!(_c < perms_1.length)) return [3 /*break*/, 17];
                    p = perms_1[_c];
                    _d = p.split(':'), resource = _d[0], action = _d[1];
                    actionName = p.split(':').slice(1).join(':');
                    return [4 /*yield*/, prisma.rolePermission.findFirst({
                            where: { roleId: role.id, resource: resource, action: actionName }
                        })];
                case 14:
                    existingPerm = _r.sent();
                    if (!!existingPerm) return [3 /*break*/, 16];
                    return [4 /*yield*/, prisma.rolePermission.create({
                            data: { roleId: role.id, resource: resource, action: actionName }
                        })];
                case 15:
                    _r.sent();
                    _r.label = 16;
                case 16:
                    _c++;
                    return [3 /*break*/, 13];
                case 17:
                    _a++;
                    return [3 /*break*/, 9];
                case 18:
                    // 5. Demo Tenant Users for ALL roles
                    console.log('--- Seeding Demo Users for all roles ---');
                    return [4 /*yield*/, bcrypt_1.default.hash('Tenant@123', 10)];
                case 19:
                    tenantAdminPassword = _r.sent();
                    demoUsers = [
                        { email: 'tenant.admin@smartlogi.vn', fullName: 'Tenant Admin', role: 'TENANT_ADMIN', password: 'Tenant@123' },
                        { email: 'wh.manager@smartlogi.vn', fullName: 'WH Manager', role: 'WAREHOUSE_MANAGER', password: 'Tenant@123' },
                        { email: 'wh.staff@smartlogi.vn', fullName: 'WH Staff', role: 'WAREHOUSE_STAFF', password: 'Tenant@123' },
                        { email: 'log.manager@smartlogi.vn', fullName: 'Log Manager', role: 'LOGISTICS_MANAGER', password: 'Tenant@123' },
                        { email: 'driver@smartlogi.vn', fullName: 'Driver User', role: 'DRIVER', password: 'Tenant@123' },
                        { email: 'client@smartlogi.vn', fullName: 'Client User', role: 'CUSTOMER_CLIENT', password: 'Tenant@123' },
                        { email: 'user@smartlogi.vn', fullName: 'Basic User', role: 'TENANT_USER', password: 'Tenant@123' },
                    ];
                    _e = 0, demoUsers_1 = demoUsers;
                    _r.label = 20;
                case 20:
                    if (!(_e < demoUsers_1.length)) return [3 /*break*/, 26];
                    userDef = demoUsers_1[_e];
                    return [4 /*yield*/, bcrypt_1.default.hash(userDef.password, 10)];
                case 21:
                    tenantAdminPassword_1 = _r.sent();
                    return [4 /*yield*/, prisma.tenantUser.upsert({
                            where: { email: userDef.email },
                            update: { passwordHash: tenantAdminPassword_1, status: 'ACTIVE', fullName: userDef.fullName },
                            create: {
                                email: userDef.email,
                                fullName: userDef.fullName,
                                status: 'ACTIVE',
                                passwordHash: tenantAdminPassword_1,
                            },
                        })];
                case 22:
                    tenantUser = _r.sent();
                    roleId = roleIds[userDef.role];
                    if (!roleId) return [3 /*break*/, 24];
                    return [4 /*yield*/, prisma.userRole.upsert({
                            where: {
                                userId_roleId: { userId: tenantUser.id, roleId: roleId }
                            },
                            update: {},
                            create: { userId: tenantUser.id, roleId: roleId }
                        })];
                case 23:
                    _r.sent();
                    _r.label = 24;
                case 24:
                    console.log("    User: ".concat(userDef.email, " (").concat(userDef.role, ")"));
                    _r.label = 25;
                case 25:
                    _e++;
                    return [3 /*break*/, 20];
                case 26:
                    // 6. Warehouse
                    console.log('--- Seeding Warehouses, Zones, Racks, Bins ---');
                    warehousesData = Array.from({ length: 5 }).map(function (_, i) { return ({
                        name: "Warehouse ".concat(i + 1),
                        code: "WH-00".concat(i + 1),
                        address: faker_1.faker.location.streetAddress() + ', ' + faker_1.faker.location.city(),
                        status: 'ACTIVE',
                    }); });
                    return [4 /*yield*/, prisma.warehouse.createMany({ data: warehousesData }).catch(function (e) { return console.warn('  [WARN] warehouses:', e.message); })];
                case 27:
                    _r.sent();
                    return [4 /*yield*/, prisma.warehouse.findMany()];
                case 28:
                    allWhs = _r.sent();
                    _loop_1 = function (wh) {
                        var zonesData;
                        return __generator(this, function (_s) {
                            switch (_s.label) {
                                case 0:
                                    zonesData = Array.from({ length: 2 }).map(function (_, i) { return ({
                                        warehouseId: wh.id,
                                        code: "ZONE-".concat(wh.code, "-").concat(faker_1.faker.string.alpha(1).toUpperCase()),
                                        type: 'STORAGE'
                                    }); });
                                    return [4 /*yield*/, prisma.zone.createMany({ data: zonesData }).catch(function (e) { return console.warn('  [WARN] zones:', e.message); })];
                                case 1:
                                    _s.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _f = 0, allWhs_1 = allWhs;
                    _r.label = 29;
                case 29:
                    if (!(_f < allWhs_1.length)) return [3 /*break*/, 32];
                    wh = allWhs_1[_f];
                    return [5 /*yield**/, _loop_1(wh)];
                case 30:
                    _r.sent();
                    _r.label = 31;
                case 31:
                    _f++;
                    return [3 /*break*/, 29];
                case 32: return [4 /*yield*/, prisma.zone.findMany()];
                case 33:
                    allZones = _r.sent();
                    _loop_2 = function (zone) {
                        var racksData;
                        return __generator(this, function (_t) {
                            switch (_t.label) {
                                case 0:
                                    racksData = Array.from({ length: 5 }).map(function (_, i) { return ({
                                        zoneId: zone.id,
                                        code: "RACK-".concat(zone.code, "-").concat(i + 1),
                                        aisle: "A".concat(i + 1),
                                        rows: 5,
                                        levels: 3
                                    }); });
                                    return [4 /*yield*/, prisma.rack.createMany({ data: racksData }).catch(function (e) { return console.warn('  [WARN] racks:', e.message); })];
                                case 1:
                                    _t.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _g = 0, allZones_1 = allZones;
                    _r.label = 34;
                case 34:
                    if (!(_g < allZones_1.length)) return [3 /*break*/, 37];
                    zone = allZones_1[_g];
                    return [5 /*yield**/, _loop_2(zone)];
                case 35:
                    _r.sent();
                    _r.label = 36;
                case 36:
                    _g++;
                    return [3 /*break*/, 34];
                case 37: return [4 /*yield*/, prisma.rack.findMany()];
                case 38:
                    allRacks = _r.sent();
                    binsData = [];
                    _loop_3 = function (rack) {
                        for (var i = 0; i < 10; i++) {
                            binsData.push({
                                rackId: rack.id,
                                warehouseId: ((_q = allZones.find(function (z) { return z.id === rack.zoneId; })) === null || _q === void 0 ? void 0 : _q.warehouseId) || allWhs[0].id,
                                barcode: "BIN-".concat(rack.code, "-").concat(i),
                                rowIndex: 1,
                                levelIndex: 1
                            });
                        }
                    };
                    for (_h = 0, allRacks_1 = allRacks; _h < allRacks_1.length; _h++) {
                        rack = allRacks_1[_h];
                        _loop_3(rack);
                    }
                    return [4 /*yield*/, prisma.bin.createMany({ data: binsData }).catch(function (e) { return console.warn('  [WARN] bins:', e.message); })];
                case 39:
                    _r.sent();
                    return [4 /*yield*/, prisma.bin.findMany()];
                case 40:
                    allBins = _r.sent();
                    console.log('--- Seeding Categories ---');
                    categoriesData = Array.from({ length: 10 }).map(function (_, i) {
                        var name = faker_1.faker.commerce.department();
                        return {
                            name: name,
                            slug: (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat') + '-' + i,
                        };
                    });
                    return [4 /*yield*/, prisma.category.createMany({ data: categoriesData }).catch(function (e) { return console.warn('  [WARN] categories:', e.message); })];
                case 41:
                    _r.sent();
                    return [4 /*yield*/, prisma.category.findMany()];
                case 42:
                    allCategories = _r.sent();
                    console.log('--- Seeding Products ---');
                    productsData = Array.from({ length: 200 }).map(function () { return ({
                        sku: faker_1.faker.commerce.isbn(),
                        name: faker_1.faker.commerce.productName(),
                        weightKg: faker_1.faker.number.float({ min: 0.1, max: 20 }),
                        volumeCbm: faker_1.faker.number.float({ min: 0.01, max: 2 }),
                        categoryId: allCategories.length > 0 ? faker_1.faker.helpers.arrayElement(allCategories).id : undefined,
                    }); });
                    return [4 /*yield*/, prisma.product.createMany({ data: productsData }).catch(function (e) { return console.warn('  [WARN] products:', e.message); })];
                case 43:
                    _r.sent();
                    return [4 /*yield*/, prisma.product.findMany()];
                case 44:
                    allProducts = _r.sent();
                    console.log('--- Seeding 500 Inventory & Stock Movements ---');
                    inventories = [];
                    for (i = 0; i < 500; i++) {
                        inventories.push({
                            productId: faker_1.faker.helpers.arrayElement(allProducts).id,
                            warehouseId: faker_1.faker.helpers.arrayElement(allWhs).id,
                            binId: faker_1.faker.helpers.arrayElement(allBins).id,
                            quantityOnHand: faker_1.faker.number.int({ min: 10, max: 1000 }),
                            quantityAllocated: faker_1.faker.number.int({ min: 0, max: 10 }),
                            status: 'AVAILABLE',
                        });
                    }
                    return [4 /*yield*/, prisma.inventory.createMany({ data: inventories }).catch(function (e) { return console.warn('  [WARN] inventory:', e.message); })];
                case 45:
                    _r.sent();
                    return [4 /*yield*/, prisma.inventory.findMany({ take: 50 })];
                case 46:
                    allInventories = _r.sent();
                    return [4 /*yield*/, prisma.tenantUser.findMany()];
                case 47:
                    allTenantUsers = _r.sent();
                    movements = [];
                    for (i = 0; i < 200; i++) {
                        inv = faker_1.faker.helpers.arrayElement(allInventories);
                        movements.push({
                            inventoryId: inv.id,
                            warehouseId: inv.warehouseId,
                            transactionType: faker_1.faker.helpers.arrayElement(['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER']),
                            quantityChange: faker_1.faker.number.int({ min: -50, max: 50 }),
                            balanceAfter: faker_1.faker.number.int({ min: 0, max: 100 }),
                            actorId: allTenantUsers.length > 0 ? faker_1.faker.helpers.arrayElement(allTenantUsers).id : undefined,
                            referenceDocument: "REF-".concat(faker_1.faker.string.alphanumeric(8).toUpperCase())
                        });
                    }
                    return [4 /*yield*/, prisma.stockMovement.createMany({ data: movements }).catch(function (e) { return console.warn('  [WARN] stock_movements:', e.message); })];
                case 48:
                    _r.sent();
                    console.log('--- Seeding Drivers, Vehicles, Clients ---');
                    vehiclesData = Array.from({ length: 50 }).map(function () { return ({
                        plateNumber: faker_1.faker.vehicle.vrm(),
                        type: faker_1.faker.helpers.arrayElement(['TRUCK_1T', 'TRUCK_5T', 'VAN', 'MOTORBIKE']),
                        capacityKg: faker_1.faker.number.int({ min: 500, max: 5000 }),
                        capacityCbm: faker_1.faker.number.int({ min: 5, max: 30 }),
                        status: 'ACTIVE'
                    }); });
                    return [4 /*yield*/, prisma.vehicle.createMany({ data: vehiclesData }).catch(function (e) { return console.warn('  [WARN] vehicles:', e.message); })];
                case 49:
                    _r.sent();
                    return [4 /*yield*/, prisma.vehicle.findMany()];
                case 50:
                    allVehicles = _r.sent();
                    driverUsersData = Array.from({ length: 50 }).map(function (_, i) { return ({
                        email: "driver".concat(i, "@smartlogi.vn"),
                        passwordHash: '$2b$10$X7hO0M1O8aYQ8TfW8QYxU.Z/XQ8TfW8QYxU.Z/XQ8TfW8QYxU.', // fake hash
                        fullName: faker_1.faker.person.fullName(),
                        status: 'ACTIVE'
                    }); });
                    return [4 /*yield*/, prisma.tenantUser.createMany({ data: driverUsersData }).catch(function (e) { return console.warn('  [WARN] driver users:', e.message); })];
                case 51:
                    _r.sent();
                    return [4 /*yield*/, prisma.tenantUser.findMany({ where: { email: { startsWith: 'driver' } } })];
                case 52:
                    newDriverUsers = _r.sent();
                    driversData = newDriverUsers.map(function (user) { return ({
                        userId: user.id,
                        licenseClass: 'C',
                        licenseExpiry: faker_1.faker.date.future(),
                        status: 'AVAILABLE'
                    }); });
                    return [4 /*yield*/, prisma.driver.createMany({ data: driversData }).catch(function (e) { return console.warn('  [WARN] drivers:', e.message); })];
                case 53:
                    _r.sent();
                    return [4 /*yield*/, prisma.driver.findMany()];
                case 54:
                    allDrivers = _r.sent();
                    clientsData = Array.from({ length: 20 }).map(function () { return ({
                        name: faker_1.faker.company.name(),
                        status: 'ACTIVE'
                    }); });
                    return [4 /*yield*/, prisma.client.createMany({ data: clientsData }).catch(function (e) { return console.warn('  [WARN] clients:', e.message); })];
                case 55:
                    _r.sent();
                    return [4 /*yield*/, prisma.client.findMany()];
                case 56:
                    allClients = _r.sent();
                    console.log('--- Seeding 500 Orders & Tracking ---');
                    allOrders = [];
                    i = 0;
                    _r.label = 57;
                case 57:
                    if (!(i < 5)) return [3 /*break*/, 60];
                    ordersBatch = Array.from({ length: 100 }).map(function () { return ({
                        trackingCode: "TRK-".concat(faker_1.faker.string.numeric(8)),
                        clientId: faker_1.faker.helpers.arrayElement(allClients).id,
                        codAmount: faker_1.faker.number.int({ min: 100000, max: 5000000 }),
                        shippingFee: faker_1.faker.number.int({ min: 15000, max: 150000 }),
                        recipientName: faker_1.faker.person.fullName(),
                        recipientPhone: faker_1.faker.phone.number(),
                        recipientAddress: faker_1.faker.location.streetAddress() + ', ' + faker_1.faker.location.city(),
                        status: faker_1.faker.helpers.arrayElement(['NEW', 'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED']),
                        lat: 10.7733 + (Math.random() - 0.5) * 0.1,
                        lng: 106.7000 + (Math.random() - 0.5) * 0.1,
                        driverId: faker_1.faker.helpers.arrayElement(allDrivers).id
                    }); });
                    return [4 /*yield*/, prisma.order.createMany({ data: ordersBatch }).catch(function (e) { return console.warn('  [WARN] orders batch:', e.message); })];
                case 58:
                    _r.sent();
                    _r.label = 59;
                case 59:
                    i++;
                    return [3 /*break*/, 57];
                case 60: return [4 /*yield*/, prisma.order.findMany()];
                case 61:
                    allOrdersData = _r.sent();
                    allOrders.push.apply(allOrders, allOrdersData);
                    console.log('--- Seeding Order Items ---');
                    if (!(allOrders.length > 0 && allProducts.length > 0)) return [3 /*break*/, 63];
                    orderItemsData = [];
                    for (_j = 0, allOrders_1 = allOrders; _j < allOrders_1.length; _j++) {
                        order = allOrders_1[_j];
                        itemCount = faker_1.faker.number.int({ min: 1, max: 5 });
                        for (j = 0; j < itemCount; j++) {
                            orderItemsData.push({
                                orderId: order.id,
                                productId: faker_1.faker.helpers.arrayElement(allProducts).id,
                                quantity: faker_1.faker.number.int({ min: 1, max: 10 }),
                            });
                        }
                    }
                    return [4 /*yield*/, prisma.orderItem.createMany({ data: orderItemsData }).catch(function (e) { return console.warn('  [WARN] order_items:', e.message); })];
                case 62:
                    _r.sent();
                    _r.label = 63;
                case 63:
                    console.log('--- Seeding Order Tracking Events ---');
                    if (!(allOrders.length > 0)) return [3 /*break*/, 65];
                    trackingEventsData = [];
                    for (_k = 0, _l = allOrders.slice(0, 200); _k < _l.length; _k++) {
                        order = _l[_k];
                        eventCount = faker_1.faker.number.int({ min: 2, max: 5 });
                        statuses = ['CREATED', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
                        for (j = 0; j < eventCount; j++) {
                            trackingEventsData.push({
                                orderId: order.id,
                                status: statuses[j] || 'DELIVERED',
                                location: faker_1.faker.location.streetAddress() + ', ' + faker_1.faker.location.city(),
                                description: faker_1.faker.lorem.sentence(),
                                timestamp: faker_1.faker.date.recent({ days: 7 }),
                            });
                        }
                    }
                    return [4 /*yield*/, prisma.orderTrackingEvent.createMany({ data: trackingEventsData }).catch(function (e) { return console.warn('  [WARN] tracking_events:', e.message); })];
                case 64:
                    _r.sent();
                    _r.label = 65;
                case 65:
                    console.log('--- Seeding Trips ---');
                    tripsData = Array.from({ length: 100 }).map(function () { return ({
                        tripCode: "TRIP-".concat(faker_1.faker.string.alphanumeric(8).toUpperCase()),
                        driverId: faker_1.faker.helpers.arrayElement(allDrivers).id,
                        vehicleId: faker_1.faker.helpers.arrayElement(allVehicles).id,
                        status: faker_1.faker.helpers.arrayElement(['DRAFT', 'IN_PROGRESS', 'COMPLETED']),
                        totalWeightKg: faker_1.faker.number.int({ min: 100, max: 2000 })
                    }); });
                    return [4 /*yield*/, prisma.trip.createMany({ data: tripsData }).catch(function (e) { return console.warn('  [WARN] trips:', e.message); })];
                case 66:
                    _r.sent();
                    return [4 /*yield*/, prisma.trip.findMany()];
                case 67:
                    allTrips = _r.sent();
                    console.log('--- Seeding Trip Stops & Deliveries ---');
                    if (!(allTrips.length > 0 && allOrders.length > 0)) return [3 /*break*/, 76];
                    _m = 0, _o = allTrips.slice(0, 80);
                    _r.label = 68;
                case 68:
                    if (!(_m < _o.length)) return [3 /*break*/, 73];
                    trip = _o[_m];
                    stopsCount = faker_1.faker.number.int({ min: 2, max: 6 });
                    s = 0;
                    _r.label = 69;
                case 69:
                    if (!(s < stopsCount)) return [3 /*break*/, 72];
                    order = faker_1.faker.helpers.arrayElement(allOrders);
                    return [4 /*yield*/, prisma.tripStop.create({
                            data: {
                                tripId: trip.id,
                                sequence: s + 1,
                                stopType: faker_1.faker.helpers.arrayElement(['PICKUP', 'DELIVERY']),
                                address: faker_1.faker.location.streetAddress() + ', ' + faker_1.faker.location.city(),
                                status: s === 0 ? 'COMPLETED' : faker_1.faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS']),
                            },
                        }).catch(function (e) { return console.warn('  [WARN] trip_stop:', e.message); })];
                case 70:
                    _r.sent();
                    _r.label = 71;
                case 71:
                    s++;
                    return [3 /*break*/, 69];
                case 72:
                    _m++;
                    return [3 /*break*/, 68];
                case 73: return [4 /*yield*/, prisma.tripStop.findMany()];
                case 74:
                    allTripStops = _r.sent();
                    deliveriesData = allTripStops.slice(0, 100).map(function (stop) { return ({
                        tripId: stop.tripId,
                        orderId: faker_1.faker.helpers.arrayElement(allOrders).id,
                        stopSequence: stop.sequence,
                        stopType: stop.stopType,
                        status: faker_1.faker.helpers.arrayElement(['PENDING', 'IN_TRANSIT', 'DELIVERED']),
                        customerName: faker_1.faker.person.fullName(),
                        customerPhone: faker_1.faker.phone.number(),
                        deliveryAddress: faker_1.faker.location.streetAddress() + ', ' + faker_1.faker.location.city(),
                        lat: 10.7733 + (Math.random() - 0.5) * 0.1,
                        lng: 106.7000 + (Math.random() - 0.5) * 0.1,
                    }); });
                    return [4 /*yield*/, prisma.delivery.createMany({ data: deliveriesData }).catch(function (e) { return console.warn('  [WARN] deliveries:', e.message); })];
                case 75:
                    _r.sent();
                    _r.label = 76;
                case 76:
                    console.log('--- Seeding Finance (Expenses, COD) ---');
                    expensesData = Array.from({ length: 100 }).map(function () { return ({
                        driverId: faker_1.faker.helpers.arrayElement(allDrivers).id,
                        amount: faker_1.faker.number.int({ min: 50000, max: 1000000 }),
                        category: faker_1.faker.helpers.arrayElement(['FUEL', 'TOLL', 'MAINTENANCE', 'OTHER']),
                        status: faker_1.faker.helpers.arrayElement(['PENDING', 'APPROVED', 'REJECTED']),
                        note: faker_1.faker.lorem.sentence()
                    }); });
                    return [4 /*yield*/, prisma.driverExpense.createMany({ data: expensesData }).catch(function (e) { return console.warn('  [WARN] expenses:', e.message); })];
                case 77:
                    _r.sent();
                    codData = Array.from({ length: 100 }).map(function () {
                        var isPending = faker_1.faker.helpers.arrayElement([true, false]);
                        return {
                            driverId: faker_1.faker.helpers.arrayElement(allDrivers).id,
                            totalCodCollected: faker_1.faker.number.int({ min: 500000, max: 5000000 }),
                            totalExpensesDeducted: 0,
                            amountRemitted: faker_1.faker.number.int({ min: 500000, max: 5000000 }),
                            status: isPending ? 'PENDING' : faker_1.faker.helpers.arrayElement(['COMPLETED', 'REJECTED']),
                        };
                    });
                    return [4 /*yield*/, prisma.codRemittance.createMany({ data: codData }).catch(function (e) { return console.warn('  [WARN] cod_remittances:', e.message); })];
                case 78:
                    _r.sent();
                    console.log('--- Seeding SOS Alerts ---');
                    sosData = Array.from({ length: 50 }).map(function () { return ({
                        driverId: faker_1.faker.helpers.arrayElement(allDrivers).id,
                        message: faker_1.faker.lorem.sentence(),
                        status: faker_1.faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
                    }); });
                    return [4 /*yield*/, prisma.sosAlert.createMany({ data: sosData }).catch(function (e) { return console.warn('  [WARN] sos_alerts:', e.message); })];
                case 79:
                    _r.sent();
                    console.log('--- Seeding Equipment Logs & Tasks ---');
                    equipmentData = Array.from({ length: 50 }).map(function () { return ({
                        staffId: faker_1.faker.helpers.arrayElement(allTenantUsers).id,
                        warehouseId: faker_1.faker.helpers.arrayElement(allWhs).id,
                        equipmentCode: "EQ-".concat(faker_1.faker.string.numeric(4)),
                        checkedOutAt: faker_1.faker.date.recent(),
                        status: faker_1.faker.helpers.arrayElement(['OUT', 'RETURNED'])
                    }); });
                    return [4 /*yield*/, prisma.equipmentCheckout.createMany({ data: equipmentData }).catch(function (e) { return console.warn('  [WARN] equipment:', e.message); })];
                case 80:
                    _r.sent();
                    tasksData = Array.from({ length: 100 }).map(function () { return ({
                        warehouseId: faker_1.faker.helpers.arrayElement(allWhs).id,
                        taskType: faker_1.faker.helpers.arrayElement(['INBOUND', 'PUTAWAY', 'PICKING', 'PACKING', 'CYCLE_COUNT']),
                        productId: faker_1.faker.helpers.arrayElement(allProducts).id,
                        quantityRequested: faker_1.faker.number.int({ min: 1, max: 100 }),
                        status: faker_1.faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
                        priority: faker_1.faker.helpers.arrayElement([0, 1, 2, 3])
                    }); });
                    return [4 /*yield*/, prisma.task.createMany({ data: tasksData }).catch(function (e) { return console.warn('  [WARN] tasks:', e.message); })];
                case 81:
                    _r.sent();
                    console.log('--- Seeding Branches ---');
                    branchesData = Array.from({ length: 5 }).map(function (_, i) { return ({
                        type: faker_1.faker.helpers.arrayElement(['HUB', 'STATION', 'DROP_OFF']),
                        code: "BR-".concat(faker_1.faker.string.numeric(4)),
                        name: "Branch ".concat(i + 1),
                        address: faker_1.faker.location.streetAddress() + ', ' + faker_1.faker.location.city(),
                        lat: 10.7733 + (Math.random() - 0.5) * 0.1,
                        lng: 106.7000 + (Math.random() - 0.5) * 0.1,
                        capacityCbm: faker_1.faker.number.int({ min: 100, max: 1000 }),
                        managerId: faker_1.faker.helpers.arrayElement(allTenantUsers).id,
                        status: 'ACTIVE'
                    }); });
                    return [4 /*yield*/, prisma.branch.createMany({ data: branchesData }).catch(function (e) { return console.warn('  [WARN] branches:', e.message); })];
                case 82:
                    _r.sent();
                    console.log('--- Seeding WavePicking ---');
                    wavesData = Array.from({ length: 10 }).map(function (_, i) { return ({
                        warehouseId: faker_1.faker.helpers.arrayElement(allWhs).id,
                        waveNumber: "WAVE-".concat(faker_1.faker.string.numeric(6)),
                        status: faker_1.faker.helpers.arrayElement(['NEW', 'IN_PROGRESS', 'COMPLETED']),
                        totalOrders: faker_1.faker.number.int({ min: 10, max: 100 }),
                        totalItems: faker_1.faker.number.int({ min: 50, max: 500 }),
                        createdBy: faker_1.faker.helpers.arrayElement(allTenantUsers).id,
                    }); });
                    return [4 /*yield*/, prisma.wavePicking.createMany({ data: wavesData }).catch(function (e) { return console.warn('  [WARN] wave_picking:', e.message); })];
                case 83:
                    _r.sent();
                    console.log('--- Seeding AI Models & Feedbacks ---');
                    modelsData = Array.from({ length: 3 }).map(function (_, i) { return ({
                        name: "Demand-Forecasting-V".concat(i + 1),
                        version: "1.0.".concat(i),
                        type: 'FORECASTING',
                        accuracy: faker_1.faker.number.float({ min: 80, max: 99 }),
                        modelPath: "/models/demand-v".concat(i + 1, ".bin"),
                        isCurrent: i === 2,
                        metadata: JSON.stringify({ epochs: 100, batchSize: 32 })
                    }); });
                    return [4 /*yield*/, prisma.aiModel.createMany({ data: modelsData }).catch(function (e) { return console.warn('  [WARN] ai_models:', e.message); })];
                case 84:
                    _r.sent();
                    return [4 /*yield*/, prisma.aiModel.findMany()];
                case 85:
                    allModels = _r.sent();
                    if (!(allModels.length > 0)) return [3 /*break*/, 87];
                    feedbackData = Array.from({ length: 20 }).map(function () { return ({
                        modelId: faker_1.faker.helpers.arrayElement(allModels).id,
                        resourceType: 'ORDER',
                        resourceId: faker_1.faker.string.uuid(),
                        aiPrediction: 'High Volume',
                        humanCorrected: 'Medium Volume',
                        confidence: faker_1.faker.number.float({ min: 50, max: 99 }),
                        isUsedForTrain: faker_1.faker.helpers.arrayElement([true, false])
                    }); });
                    return [4 /*yield*/, prisma.aiFeedback.createMany({ data: feedbackData }).catch(function (e) { return console.warn('  [WARN] ai_feedbacks:', e.message); })];
                case 86:
                    _r.sent();
                    _r.label = 87;
                case 87:
                    console.log('--- Seeding Demand Forecasts ---');
                    return [4 /*yield*/, prisma.product.findMany({ take: 20 })];
                case 88:
                    forecastProducts = _r.sent();
                    if (!(forecastProducts.length > 0)) return [3 /*break*/, 90];
                    forecastData = Array.from({ length: 100 }).map(function () { return ({
                        productId: faker_1.faker.helpers.arrayElement(forecastProducts).id,
                        forecastDate: faker_1.faker.date.future(),
                        demandQuantity: faker_1.faker.number.int({ min: 10, max: 5000 }),
                        modelVersion: '1.0.2',
                    }); });
                    return [4 /*yield*/, prisma.demandForecast.createMany({ data: forecastData }).catch(function (e) { return console.warn('  [WARN] demand_forecasts:', e.message); })];
                case 89:
                    _r.sent();
                    _r.label = 90;
                case 90:
                    console.log('--- Seeding CycleCounts & Adjustments ---');
                    cycleCountsData = Array.from({ length: 10 }).map(function () { return ({
                        warehouseId: faker_1.faker.helpers.arrayElement(allWhs).id,
                        status: faker_1.faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
                        scheduledAt: faker_1.faker.date.future(),
                        createdBy: faker_1.faker.helpers.arrayElement(allTenantUsers).id,
                    }); });
                    return [4 /*yield*/, prisma.cycleCount.createMany({ data: cycleCountsData }).catch(function (e) { return console.warn('  [WARN] cycle_counts:', e.message); })];
                case 91:
                    _r.sent();
                    if (!(allInventories.length > 0)) return [3 /*break*/, 93];
                    adjustmentsData = Array.from({ length: 20 }).map(function () {
                        var inv = faker_1.faker.helpers.arrayElement(allInventories);
                        return {
                            inventoryId: inv.id,
                            warehouseId: inv.warehouseId,
                            reasonCode: faker_1.faker.helpers.arrayElement(['DAMAGE', 'EXPIRED', 'FOUND', 'LOST']),
                            quantityChange: faker_1.faker.number.int({ min: -10, max: 10 }),
                            createdBy: faker_1.faker.helpers.arrayElement(allTenantUsers).id,
                        };
                    });
                    return [4 /*yield*/, prisma.adjustment.createMany({ data: adjustmentsData }).catch(function (e) { return console.warn('  [WARN] adjustments:', e.message); })];
                case 92:
                    _r.sent();
                    _r.label = 93;
                case 93:
                    console.log('--- Seeding PackStationLogs & ScanLogs ---');
                    if (!(allWhs.length > 0 && allTenantUsers.length > 0)) return [3 /*break*/, 96];
                    packLogsData = Array.from({ length: 20 }).map(function () { return ({
                        warehouseId: faker_1.faker.helpers.arrayElement(allWhs).id,
                        orderId: faker_1.faker.helpers.arrayElement(allOrders).id,
                    }); });
                    return [4 /*yield*/, prisma.packStationLog.createMany({ data: packLogsData }).catch(function (e) { return console.warn('  [WARN] pack_station_logs:', e.message); })];
                case 94:
                    _r.sent();
                    scanLogsData = Array.from({ length: 50 }).map(function () { return ({
                        warehouseId: faker_1.faker.helpers.arrayElement(allWhs).id,
                        actorId: faker_1.faker.helpers.arrayElement(allTenantUsers).id,
                        barcode: faker_1.faker.string.alphanumeric(10).toUpperCase(),
                        result: faker_1.faker.helpers.arrayElement(['SUCCESS', 'FAILED']),
                    }); });
                    return [4 /*yield*/, prisma.scanLog.createMany({ data: scanLogsData }).catch(function (e) { return console.warn('  [WARN] scan_logs:', e.message); })];
                case 95:
                    _r.sent();
                    _r.label = 96;
                case 96:
                    console.log('--- Seeding Return Reasons ---');
                    returnReasonsData = [
                        { code: 'DAMAGED', name: 'Sản phẩm bị hư hỏng', description: 'Sản phẩm bị vỡ, trầy xước hoặc hư hỏng khi nhận', isActive: true },
                        { code: 'WRONG_ITEM', name: 'Sai sản phẩm', description: 'Nhận sai sản phẩm so với đơn đặt hàng', isActive: true },
                        { code: 'DEFECTIVE', name: 'Lỗi sản xuất', description: 'Sản phẩm không hoạt động hoặc có lỗi từ nhà sản xuất', isActive: true },
                        { code: 'NOT_AS_DESCRIBED', name: 'Không đúng mô tả', description: 'Sản phẩm không giống như mô tả trên website', isActive: true },
                        { code: 'CHANGE_MIND', name: 'Đổi ý', description: 'Khách hàng không còn nhu cầu sử dụng sản phẩm', isActive: true },
                        { code: 'DUPLICATE', name: 'Đặt trùng', description: 'Khách hàng đặt trùng sản phẩm', isActive: true },
                        { code: 'LATE_DELIVERY', name: 'Giao hàng trễ', description: 'Giao hàng không đúng thời hạn cam kết', isActive: true },
                        { code: 'WRONG_ADDRESS', name: 'Sai địa chỉ', description: 'Địa chỉ giao hàng không chính xác', isActive: true },
                        { code: 'OTHER', name: 'Lý do khác', description: 'Lý do không được liệt kê ở trên', isActive: true },
                    ];
                    _p = 0, returnReasonsData_1 = returnReasonsData;
                    _r.label = 97;
                case 97:
                    if (!(_p < returnReasonsData_1.length)) return [3 /*break*/, 100];
                    reason = returnReasonsData_1[_p];
                    return [4 /*yield*/, prisma.returnReason.upsert({ where: { code: reason.code }, update: {}, create: reason }).catch(function (e) { return console.warn('  [WARN] return_reason:', e.message); })];
                case 98:
                    _r.sent();
                    _r.label = 99;
                case 99:
                    _p++;
                    return [3 /*break*/, 97];
                case 100:
                    console.log('--- Seeding demo API keys & feature flags ---');
                    return [4 /*yield*/, bcrypt_1.default.hash('demo-secret-key-1234', 10)];
                case 101:
                    demoKeyHash = _r.sent();
                    return [4 /*yield*/, prisma.tenantApiKey.create({
                            data: {
                                tenantId: demoTenant.id,
                                keyHash: demoKeyHash,
                                name: 'Demo API Key',
                                scopes: JSON.stringify(['inventory:read', 'orders:create']),
                            },
                        })];
                case 102:
                    _r.sent();
                    return [4 /*yield*/, prisma.featureFlag.createMany({
                            data: [
                                { tenantId: demoTenant.id, key: 'beta-dashboard', enabled: false, description: 'Enable beta UI for tenant' },
                                { tenantId: demoTenant.id, key: 'enable-export', enabled: true, description: 'Allow data export' },
                            ],
                        })];
                case 103:
                    _r.sent();
                    console.log(' SQLite Seeding Finished Successfully');
                    console.log(' Admin: admin@smartlogi.vn / Admin@123');
                    console.log(' Tenant: demo-tenant / tenant.admin@smartlogi.vn / Tenant@123');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
