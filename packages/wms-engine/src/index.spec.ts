import { WmsAllocationEngine, AllocationStrategy, InventoryItem, BinCapacity } from './index';

describe('WmsAllocationEngine', () => {
  const mockStock: InventoryItem[] = [
    { id: 'inv_1', binId: 'bin_1', productId: 'prod_1', quantityAvailable: 100, createdAt: new Date('2024-01-01') },
    { id: 'inv_2', binId: 'bin_2', productId: 'prod_1', quantityAvailable: 50, createdAt: new Date('2024-01-15') },
    { id: 'inv_3', binId: 'bin_3', productId: 'prod_1', quantityAvailable: 75, createdAt: new Date('2024-02-01') },
  ];

  describe('allocate', () => {
    it('should allocate FIFO correctly', () => {
      const result = WmsAllocationEngine.allocate(mockStock, 120, AllocationStrategy.FIFO);

      expect(result).toHaveLength(2);
      expect(result[0].inventoryId).toBe('inv_1');
      expect(result[0].allocatedQuantity).toBe(100);
      expect(result[1].inventoryId).toBe('inv_2');
      expect(result[1].allocatedQuantity).toBe(20);
    });

    it('should allocate LIFO correctly', () => {
      const result = WmsAllocationEngine.allocate(mockStock, 120, AllocationStrategy.LIFO);

      expect(result).toHaveLength(2);
      expect(result[0].inventoryId).toBe('inv_3');
      expect(result[0].allocatedQuantity).toBe(75);
      expect(result[1].inventoryId).toBe('inv_2');
      expect(result[1].allocatedQuantity).toBe(45);
    });

    it('should allocate FEFO correctly with expiry dates', () => {
      const stockWithExpiry: InventoryItem[] = [
        { id: 'inv_1', binId: 'bin_1', productId: 'prod_1', quantityAvailable: 50, createdAt: new Date('2024-01-01'), expiryDate: new Date('2024-12-31') },
        { id: 'inv_2', binId: 'bin_2', productId: 'prod_1', quantityAvailable: 50, createdAt: new Date('2024-01-15'), expiryDate: new Date('2024-06-30') },
      ];

      const result = WmsAllocationEngine.allocate(stockWithExpiry, 60, AllocationStrategy.FEFO);

      expect(result).toHaveLength(2);
      expect(result[0].inventoryId).toBe('inv_2');
      expect(result[0].allocatedQuantity).toBe(50);
      expect(result[1].inventoryId).toBe('inv_1');
      expect(result[1].allocatedQuantity).toBe(10);
    });

    it('should throw error for insufficient stock', () => {
      expect(() => WmsAllocationEngine.allocate(mockStock, 300)).toThrow('Insufficient stock');
    });

    it('should handle exact stock amount', () => {
      const result = WmsAllocationEngine.allocate(mockStock, 225);
      expect(result).toHaveLength(3);
      const totalAllocated = result.reduce((sum, r) => sum + r.allocatedQuantity, 0);
      expect(totalAllocated).toBe(225);
    });
  });

  describe('allocateWithCapacity', () => {
    const binCapacities: BinCapacity[] = [
      { binId: 'bin_1', maxWeightKg: 100, maxVolumeCbm: 2, currentWeightKg: 80, currentVolumeCbm: 1.5 },
      { binId: 'bin_2', maxWeightKg: 50, maxVolumeCbm: 1, currentWeightKg: 10, currentVolumeCbm: 0.2 },
    ];

    const stockWithWeight: InventoryItem[] = [
      { id: 'inv_1', binId: 'bin_1', productId: 'prod_1', quantityAvailable: 100, createdAt: new Date('2024-01-01'), weightKg: 1 },
      { id: 'inv_2', binId: 'bin_2', productId: 'prod_1', quantityAvailable: 50, createdAt: new Date('2024-01-15'), weightKg: 1 },
    ];

    it('should respect weight capacity limits', () => {
      const result = WmsAllocationEngine.allocateWithCapacity(stockWithWeight, 60, binCapacities);

      expect(result.length).toBeGreaterThan(0);
      const totalAllocated = result.reduce((sum, r) => sum + r.allocatedQuantity, 0);
      expect(totalAllocated).toBe(60);
    });
  });

  describe('generateWave', () => {
    it('should generate waves from orders', () => {
      const orders = [
        { orderId: 'ord_1', items: [{ productId: 'prod_1', quantity: 5 }] },
        { orderId: 'ord_2', items: [{ productId: 'prod_1', quantity: 3 }] },
      ];

      const waves = WmsAllocationEngine.generateWave(orders, 10);

      expect(waves).toHaveLength(1);
      expect(waves[0].orders).toContain('ord_1');
      expect(waves[0].orders).toContain('ord_2');
      expect(waves[0].totalItems).toBe(8);
    });
  });

  describe('assignPutawayBin', () => {
    const bins: BinCapacity[] = [
      { binId: 'bin_1', maxWeightKg: 100, maxVolumeCbm: 2, currentWeightKg: 80, currentVolumeCbm: 1.5 },
      { binId: 'bin_2', maxWeightKg: 50, maxVolumeCbm: 1, currentWeightKg: 10, currentVolumeCbm: 0.2 },
    ];

    it('should assign to least full bin', () => {
      const binId = WmsAllocationEngine.assignPutawayBin('prod_1', bins, 5, 0.1);
      expect(binId).toBe('bin_2');
    });

    it('should return null if no suitable bin', () => {
      const binId = WmsAllocationEngine.assignPutawayBin('prod_1', bins, 1000, 10);
      expect(binId).toBeNull();
    });

    it('should handle empty stock list', () => {
      expect(() => WmsAllocationEngine.allocate([], 10)).toThrow('Insufficient stock');
    });

    it('should handle negative requiredQty', () => {
      const result = WmsAllocationEngine.allocate(mockStock, -5);
      expect(result).toHaveLength(0);
    });

    it('should handle FEFO with mixed expiry dates (some items without expiry)', () => {
      const stockWithMixedExpiry: InventoryItem[] = [
        { id: 'inv_1', binId: 'bin_1', productId: 'prod_1', quantityAvailable: 50, createdAt: new Date('2024-01-01') },
        { id: 'inv_2', binId: 'bin_2', productId: 'prod_1', quantityAvailable: 50, createdAt: new Date('2024-01-15'), expiryDate: new Date('2024-06-30') },
        { id: 'inv_3', binId: 'bin_3', productId: 'prod_1', quantityAvailable: 50, createdAt: new Date('2024-02-01'), expiryDate: new Date('2024-12-31') },
      ];

      const result = WmsAllocationEngine.allocate(stockWithMixedExpiry, 80, AllocationStrategy.FEFO);

      expect(result.length).toBeGreaterThan(0);
      const totalAllocated = result.reduce((sum, r) => sum + r.allocatedQuantity, 0);
      expect(totalAllocated).toBe(80);
    });

    it('should generate multiple waves when orders exceed wave size', () => {
      const orders = Array.from({ length: 15 }, (_, i) => ({
        orderId: `ord_${i}`,
        items: [{ productId: 'prod_1', quantity: 1 }],
      }));

      const waves = WmsAllocationEngine.generateWave(orders, 5);

      expect(waves.length).toBeGreaterThan(1);
      const totalOrders = waves.reduce((sum, w) => sum + w.orders.length, 0);
      expect(totalOrders).toBe(15);
    });

    it('should handle allocateWithCapacity with empty bins', () => {
      const result = WmsAllocationEngine.allocateWithCapacity(mockStock, 10, []);
      expect(result).toHaveLength(0);
    });

    it('should handle empty orders for wave generation', () => {
      const waves = WmsAllocationEngine.generateWave([], 10);
      expect(waves).toHaveLength(0);
    });

    it('should handle single item allocation', () => {
      const result = WmsAllocationEngine.allocate(mockStock, 50, AllocationStrategy.FIFO);
      expect(result).toHaveLength(1);
      expect(result[0].allocatedQuantity).toBe(50);
    });
  });
});
