import { SalesRepository } from './sales.repository.js';
import { ProductRepository } from '../product/product.repository.js';
import { CustomerRepository } from '../customer/customer.repository.js';
import { CreateSalesOrderDto, CreateSimpleSalesOrderDto, UpdateSalesStatusDto } from './sales.dto.js';
import { BadRequestError, NotFoundError } from '../../common/errors/index.js';
import { prisma } from '../../config/database.config.js';

export class SalesService {
  constructor(
    private salesRepo = new SalesRepository(),
    private productRepo = new ProductRepository(),
    private customerRepo = new CustomerRepository()
  ) {}

  async getSalesOrders(companyId: string, params?: { customerId?: string; paymentStatus?: any; status?: any }) {
    return this.salesRepo.findAllByCompany(companyId, params);
  }

  async getSalesOrderById(companyId: string, id: string) {
    const order = await this.salesRepo.findById(companyId, id);
    if (!order) throw new NotFoundError('Sales Order not found');
    return order;
  }

  async createSalesOrder(companyId: string, salespersonId: string, dto: CreateSalesOrderDto) {
    const customer = await this.customerRepo.findById(companyId, dto.customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    let subtotal = 0;
    const processedItems = [];

    for (const item of dto.items) {
      const product = await this.productRepo.findById(companyId, item.productId);
      if (!product) throw new NotFoundError(`Product with ID ${item.productId} not found`);

      if (product.stock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for "${product.name}". Current stock: ${product.stock}, Requested: ${item.quantity}`
        );
      }

      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
      });
    }

    const totalAmount = subtotal + dto.tax - dto.discount;
    const orderNumber = `SO-${Date.now().toString().slice(-6)}`;

    return this.salesRepo.createSalesOrder(companyId, salespersonId, {
      customerId: dto.customerId,
      orderNumber,
      subtotal,
      tax: dto.tax,
      discount: dto.discount,
      totalAmount,
      items: processedItems,
    });
  }

  async updateSalesStatus(companyId: string, id: string, dto: UpdateSalesStatusDto) {
    await this.getSalesOrderById(companyId, id);
    return this.salesRepo.updateStatus(companyId, id, dto);
  }

  async createSimpleSalesOrder(companyId: string, salespersonId: string, dto: CreateSimpleSalesOrderDto) {
    // Find or create customer by name
    let customer = await prisma.customer.findFirst({
      where: {
        companyId,
        OR: [
          { name: { equals: dto.customerName } },
          { companyName: { equals: dto.customerName } },
        ],
      },
    });

    if (!customer) {
      const emailSlug = dto.customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      customer = await prisma.customer.create({
        data: {
          companyId,
          name: dto.customerName,
          companyName: dto.customerName,
          email: `${emailSlug}@customer.example.com`,
          phone: '-',
        },
      });
    }

    const totalAmount = Number(dto.totalAmount) || 0;
    const tax = Math.round(totalAmount * 0.1 * 100) / 100;
    const subtotal = Math.round((totalAmount - tax) * 100) / 100;

    let orderNum = dto.orderNumber?.trim() || '';
    if (!orderNum) {
      orderNum = `SO-${Date.now().toString().slice(-6)}`;
    }

    // Check for duplicate order number
    const existing = await prisma.salesOrder.findFirst({
      where: { companyId, orderNumber: orderNum },
    });
    if (existing) {
      orderNum = `${orderNum}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const paymentStatusMap: Record<string, string> = {
      Paid: 'PAID', Pending: 'UNPAID', Overdue: 'OVERDUE',
    };
    const statusMap: Record<string, string> = {
      Quotation: 'PENDING', Confirmed: 'PENDING', Processing: 'PROCESSING',
      Completed: 'COMPLETED', Cancelled: 'CANCELLED',
    };

    const orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();

    const salesOrder = await prisma.salesOrder.create({
      data: {
        companyId,
        orderNumber: orderNum,
        customerId: customer.id,
        salespersonId,
        subtotal,
        tax,
        discount: 0,
        totalAmount,
        paymentStatus: paymentStatusMap[dto.paymentStatus] || 'PAID',
        status: statusMap[dto.status] || 'PROCESSING',
        createdAt: orderDate,
      },
      include: {
        customer: true,
        salesperson: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
        invoices: true,
      },
    });

    return salesOrder;
  }

  async getSalesMetrics(companyId: string) {
    const sales = await this.salesRepo.findAllByCompany(companyId);
    
    let totalRevenue = 0;
    let totalProfit = 0;
    let completedOrders = 0;

    for (const sale of sales) {
      if (sale.paymentStatus === 'PAID') {
        totalRevenue += Number(sale.totalAmount);
        completedOrders++;

        for (const item of sale.items) {
          const cost = Number(item.product.costPrice) * item.quantity;
          const revenue = Number(item.subtotal);
          totalProfit += (revenue - cost);
        }
      }
    }

    return {
      totalRevenue,
      totalProfit,
      totalOrders: sales.length,
      completedOrders,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
    };
  }
}
