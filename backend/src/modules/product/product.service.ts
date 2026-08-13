import { ProductRepository } from './product.repository.js';
import { CreateProductDto, UpdateProductDto } from './product.dto.js';
import { ConflictError, NotFoundError } from '../../common/errors/index.js';
import { prisma } from '../../config/database.config.js';

export class ProductService {
  constructor(private repository = new ProductRepository()) {}

  async getProducts(companyId: string, query?: { search?: string; categoryId?: string; status?: string }) {
    return this.repository.findAllByCompany(companyId, query);
  }

  async getProductById(companyId: string, id: string) {
    const product = await this.repository.findById(companyId, id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async createProduct(companyId: string, dto: CreateProductDto) {
    const existing = await this.repository.findBySku(companyId, dto.sku);
    if (existing) throw new ConflictError('A product with this SKU already exists');

    let { categoryName, categoryId, ...productData } = dto as any;

    if (!categoryId && categoryName) {
      let category = await prisma.category.findFirst({
        where: { companyId, name: categoryName }
      });
      if (!category) {
        category = await prisma.category.create({
          data: { companyId, name: categoryName }
        });
      }
      categoryId = category.id;
    }

    return this.repository.create(companyId, {
      ...productData,
      categoryId
    });
  }

  async updateProduct(companyId: string, id: string, dto: UpdateProductDto) {
    await this.getProductById(companyId, id);

    let { categoryName, categoryId, ...productData } = dto as any;

    if (!categoryId && categoryName) {
      let category = await prisma.category.findFirst({
        where: { companyId, name: categoryName }
      });
      if (!category) {
        category = await prisma.category.create({
          data: { companyId, name: categoryName }
        });
      }
      categoryId = category.id;
    }

    return this.repository.update(companyId, id, {
      ...productData,
      ...(categoryId ? { categoryId } : {})
    });
  }

  async deleteProduct(companyId: string, id: string) {
    await this.getProductById(companyId, id);
    await this.repository.delete(companyId, id);
    return { message: 'Product deleted successfully' };
  }
}
