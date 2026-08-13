import { CustomerRepository } from './customer.repository.js';
import { CreateCustomerDto, UpdateCustomerDto } from './customer.dto.js';
import { NotFoundError } from '../../common/errors/index.js';

export class CustomerService {
  constructor(private repository = new CustomerRepository()) {}

  async getCustomers(companyId: string, search?: string) {
    return this.repository.findAllByCompany(companyId, search);
  }

  async getCustomerById(companyId: string, id: string) {
    const customer = await this.repository.findById(companyId, id);
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  }

  async createCustomer(companyId: string, dto: CreateCustomerDto) {
    return this.repository.create(companyId, dto);
  }

  async updateCustomer(companyId: string, id: string, dto: UpdateCustomerDto) {
    await this.getCustomerById(companyId, id);
    return this.repository.update(companyId, id, dto);
  }

  async deleteCustomer(companyId: string, id: string) {
    await this.getCustomerById(companyId, id);
    await this.repository.delete(companyId, id);
    return { message: 'Customer deleted successfully' };
  }
}
