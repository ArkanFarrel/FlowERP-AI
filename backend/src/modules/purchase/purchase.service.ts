import { PurchaseRepository } from './purchase.repository.js';
import { SupplierRepository } from '../supplier/supplier.repository.js';
import { ProductRepository } from '../product/product.repository.js';
import { CreatePurchaseOrderDto } from './purchase.dto.js';
import { BadRequestError, NotFoundError } from '../../common/errors/index.js';

export class PurchaseService {
  constructor(
    private purchaseRepo = new PurchaseRepository(),
    private supplierRepo = new SupplierRepository(),
    private productRepo = new ProductRepository()
  ) {}

  async getPurchaseOrders(companyId: string, params?: { supplierId?: string; status?: any }) {
    return this.purchaseRepo.findAllByCompany(companyId, params);
  }

  async getPurchaseOrderById(companyId: string, id: string) {
    const po = await this.purchaseRepo.findById(companyId, id);
    if (!po) throw new NotFoundError('Purchase Order not found');
    return po;
  }

  async createPurchaseOrder(companyId: string, createdById: string, dto: CreatePurchaseOrderDto) {
    const supplier = await this.supplierRepo.findById(companyId, dto.supplierId);
    if (!supplier) throw new NotFoundError('Supplier not found');

    let subtotal = 0;
    const processedItems = [];

    for (const item of dto.items) {
      const product = await this.productRepo.findById(companyId, item.productId);
      if (!product) throw new NotFoundError(`Product with ID ${item.productId} not found`);

      const itemSubtotal = item.quantity * item.unitCost;
      subtotal += itemSubtotal;

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: itemSubtotal,
      });
    }

    const totalAmount = subtotal + dto.tax;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    return this.purchaseRepo.createPurchaseOrder(companyId, createdById, {
      supplierId: dto.supplierId,
      poNumber,
      subtotal,
      tax: dto.tax,
      totalAmount,
      items: processedItems,
    });
  }

  async receiveGoods(companyId: string, purchaseOrderId: string) {
    const po = await this.getPurchaseOrderById(companyId, purchaseOrderId);
    if (po.status === 'RECEIVED') {
      throw new BadRequestError('Purchase Order has already been received');
    }
    return this.purchaseRepo.receiveGoods(companyId, purchaseOrderId);
  }
}
