import { SupplierRepository } from './supplier.repository.js';
import { CreateSupplierDto, UpdateSupplierDto } from './supplier.dto.js';
import { NotFoundError } from '../../common/errors/index.js';

export class SupplierService {
  constructor(private repository = new SupplierRepository()) {}

  async getSuppliers(companyId: string, search?: string) {
    return this.repository.findAllByCompany(companyId, search);
  }

  async getSupplierById(companyId: string, id: string) {
    const supplier = await this.repository.findById(companyId, id);
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier;
  }

  async createSupplier(companyId: string, dto: CreateSupplierDto) {
    return this.repository.create(companyId, dto);
  }

  async updateSupplier(companyId: string, id: string, dto: UpdateSupplierDto) {
    await this.getSupplierById(companyId, id);
    return this.repository.update(companyId, id, dto);
  }

  async deleteSupplier(companyId: string, id: string) {
    await this.getSupplierById(companyId, id);
    await this.repository.delete(companyId, id);
    return { message: 'Supplier deleted successfully' };
  }
}
