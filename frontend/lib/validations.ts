import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Full Name is required"),
  companyName: z.string().min(2, "Company Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const customerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  company: z.string().min(2, "Company name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number is required"),
  city: z.string().min(2, "City is required"),
  country: z.string().default("Indonesia"),
  address: z.string().optional(),
  type: z.enum(["Retail", "Wholesale"]).default("Retail"),
  status: z.enum(["Active", "Inactive", "VIP", "Blocked", "New"]).default("Active"),
  salesRep: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  loyaltyPoints: z.number().min(0).default(0),
});

export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required"),
  company: z.string().min(2, "Company name is required"),
  category: z.string().min(2, "Category is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().optional(),
  status: z.enum(["Active", "Pending", "Inactive"]).default("Active"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().min(2, "SKU is required"),
  barcode: z.string().optional(),
  categoryName: z.string().default("General"),
  supplierId: z.string().optional(),
  costPrice: z.number().min(0, "Cost price must be positive"),
  sellingPrice: z.number().min(0, "Selling price must be positive"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  minStock: z.number().int().min(0).default(5),
  maxStock: z.number().int().min(0).default(100),
  unit: z.string().default("pcs"),
  warehouse: z.string().default("Central Store"),
  status: z.enum(["Active", "Low Stock", "Out of Stock"]).default("Active"),
  description: z.string().optional(),
});

export const saleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1, "At least one item is required"),
  paymentStatus: z.enum(["Paid", "Pending", "Overdue"]).default("Paid"),
  status: z.enum(["Quotation", "Confirmed", "Processing", "Completed", "Cancelled"]).default("Completed"),
});

export const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      unitCost: z.number().min(0),
    })
  ).min(1, "At least one item is required"),
  status: z.enum(["Ordered", "Processing", "Shipping", "Delivered", "Cancelled"]).default("Ordered"),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "TRANSFER"]),
  quantity: z.number().int(),
  warehouse: z.string().default("Central Store"),
  notes: z.string().optional(),
});
