import { InventoryRepository } from './inventory.repository.js';
import { ProductRepository } from '../product/product.repository.js';
import { StockMovementDto, StockAdjustmentDto } from './inventory.dto.js';
import { BadRequestError, NotFoundError } from '../../common/errors/index.js';

export class InventoryService {
  constructor(
    private inventoryRepo = new InventoryRepository(),
    private productRepo = new ProductRepository()
  ) {}

  async getMovementHistory(companyId: string, params?: { productId?: string; type?: any }) {
    return this.inventoryRepo.findMovementsByCompany(companyId, params);
  }

  async stockIn(companyId: string, dto: StockMovementDto) {
    const product = await this.productRepo.findById(companyId, dto.productId);
    if (!product) throw new NotFoundError('Product not found');

    return this.inventoryRepo.recordStockMovement(
      companyId,
      dto.productId,
      'STOCK_IN',
      dto.quantity,
      dto.reference,
      dto.notes
    );
  }

  async stockOut(companyId: string, dto: StockMovementDto) {
    const product = await this.productRepo.findById(companyId, dto.productId);
    if (!product) throw new NotFoundError('Product not found');

    if (product.stock < dto.quantity) {
      throw new BadRequestError(`Insufficient stock. Current stock is ${product.stock}, requested ${dto.quantity}`);
    }

    return this.inventoryRepo.recordStockMovement(
      companyId,
      dto.productId,
      'STOCK_OUT',
      dto.quantity,
      dto.reference,
      dto.notes
    );
  }

  async stockAdjustment(companyId: string, dto: StockAdjustmentDto) {
    const product = await this.productRepo.findById(companyId, dto.productId);
    if (!product) throw new NotFoundError('Product not found');

    return this.inventoryRepo.setStockLevel(companyId, dto.productId, dto.newStockLevel, dto.notes);
  }
}
