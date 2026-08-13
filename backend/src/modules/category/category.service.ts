import { CategoryRepository } from './category.repository.js';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto.js';
import { NotFoundError } from '../../common/errors/index.js';

export class CategoryService {
  constructor(private repository = new CategoryRepository()) {}

  async getCategories(companyId: string) {
    return this.repository.findAllByCompany(companyId);
  }

  async getCategoryById(companyId: string, id: string) {
    const category = await this.repository.findById(companyId, id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  async createCategory(companyId: string, dto: CreateCategoryDto) {
    return this.repository.create(companyId, dto);
  }

  async updateCategory(companyId: string, id: string, dto: UpdateCategoryDto) {
    await this.getCategoryById(companyId, id);
    return this.repository.update(companyId, id, dto);
  }

  async deleteCategory(companyId: string, id: string) {
    await this.getCategoryById(companyId, id);
    await this.repository.delete(companyId, id);
    return { message: 'Category deleted successfully' };
  }
}
