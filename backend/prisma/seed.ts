import { prisma } from '../src/config/database.config.js';
import { hashPassword } from '../src/common/utils/password.util.js';

async function seed() {
  console.log('🌱 Seeding FlowERP-AI Database with initial demonstration data...');

  // 1. Create Company
  const company = await prisma.company.create({
    data: {
      name: 'FlowERP Enterprise Store',
      taxRate: 10.0,
      currency: 'USD',
      address: '123 Enterprise Way, Tech City',
      phone: '+1 (555) 123-4567',
      email: 'contact@flowerp-demo.com',
    },
  });

  // 2. Create Owner User
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      fullName: 'Alex Johnson (Owner)',
      email: 'owner@flowerp.com',
      passwordHash,
      role: 'OWNER',
    },
  });

  // 3. Create Categories
  const officeCat = await prisma.category.create({
    data: { companyId: company.id, name: 'Office Supplies', description: 'Stationery and office essentials' },
  });
  const electronicsCat = await prisma.category.create({
    data: { companyId: company.id, name: 'Electronics', description: 'Gadgets, accessories and peripherals' },
  });

  // 4. Create Supplier
  const supplier = await prisma.supplier.create({
    data: {
      companyId: company.id,
      name: 'Global Tech Wholesale',
      companyName: 'Global Tech Logistics LLC',
      email: 'sales@globaltech.com',
      phone: '+1 (800) 555-9900',
      address: '789 Supply Chain Blvd',
      paymentTerms: 'Net 30',
      rating: 4.8,
    },
  });

  // 5. Create Products
  const prod1 = await prisma.product.create({
    data: {
      companyId: company.id,
      categoryId: electronicsCat.id,
      supplierId: supplier.id,
      sku: 'WM-001',
      barcode: '8991002001',
      name: 'Wireless Mouse RGB',
      brand: 'LogiTech',
      unit: 'pcs',
      costPrice: 12.00,
      sellingPrice: 35.00,
      stock: 5,
      minimumStock: 20,
      warehouse: 'Central Store',
      status: 'ACTIVE',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      companyId: company.id,
      categoryId: officeCat.id,
      supplierId: supplier.id,
      sku: 'KB-003',
      barcode: '8991002002',
      name: 'Executive Notebook Set',
      brand: 'Moleskine',
      unit: 'set',
      costPrice: 8.00,
      sellingPrice: 24.00,
      stock: 8,
      minimumStock: 15,
      warehouse: 'Central Store',
      status: 'ACTIVE',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      companyId: company.id,
      categoryId: electronicsCat.id,
      supplierId: supplier.id,
      sku: 'USB-002',
      barcode: '8991002003',
      name: 'USB-C Fast Charging Cable 2m',
      brand: 'Anker',
      unit: 'pcs',
      costPrice: 5.00,
      sellingPrice: 18.00,
      stock: 120,
      minimumStock: 30,
      warehouse: 'Central Store',
      status: 'ACTIVE',
    },
  });

  // 6. Create Customer
  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Sarah Chen',
      companyName: 'Nusantara Digital Ltd',
      email: 'sarah@nusantara.com',
      phone: '+1 (555) 987-6543',
      city: 'Jakarta',
      country: 'Indonesia',
      creditLimit: 5000.00,
      loyaltyPoints: 350,
      healthScore: 98,
      segment: 'VIP',
    },
  });

  // 7. Create Sales Order
  const salesOrder = await prisma.salesOrder.create({
    data: {
      companyId: company.id,
      orderNumber: 'SO-10021',
      customerId: customer.id,
      salespersonId: user.id,
      subtotal: 120.00,
      tax: 12.00,
      discount: 0.00,
      totalAmount: 132.00,
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      items: {
        create: [
          { productId: prod3.id, quantity: 4, unitPrice: 18.00, subtotal: 72.00 },
          { productId: prod1.id, quantity: 1, unitPrice: 35.00, subtotal: 35.00 },
        ],
      },
      invoices: {
        create: {
          companyId: company.id,
          invoiceNumber: 'INV-2026-001',
          amount: 132.00,
          paymentStatus: 'PAID',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  console.log('✅ Database Seeded Successfully!');
  console.log('   Demo Login Email: owner@flowerp.com');
  console.log('   Demo Password: password123');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
