import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async createProduct(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  async findAllProducts() {
    return this.prisma.product.findMany({ include: { sales: true } });
  }

  async findOneProduct(id: string) {
    return this.prisma.product.findUnique({ 
      where: { id }, 
      include: { sales: true } 
    });
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async removeProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async createSale(data: Prisma.SaleCreateInput) {
    return this.prisma.sale.create({ 
      data, 
      include: { product: true, seller: true } 
    });
  }

  async findAllSales() {
    return this.prisma.sale.findMany({ 
      include: { product: true, seller: true } 
    });
  }

  async findSalesByProduct(productId: string) {
    return this.prisma.sale.findMany({ 
      where: { productId }, 
      include: { product: true, seller: true } 
    });
  }

  async findSalesBySeller(sellerId: string) {
    return this.prisma.sale.findMany({ 
      where: { soldBy: sellerId }, 
      include: { product: true, seller: true } 
    });
  }
}
