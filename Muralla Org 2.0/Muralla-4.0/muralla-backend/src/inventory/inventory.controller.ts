import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Prisma } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'staff')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('products')
  createProduct(@Body() createProductDto: Prisma.ProductCreateInput) {
    return this.inventoryService.createProduct(createProductDto);
  }

  @Get('products')
  findAllProducts() {
    return this.inventoryService.findAllProducts();
  }

  @Get('products/:id')
  findOneProduct(@Param('id') id: string) {
    return this.inventoryService.findOneProduct(id);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() updateProductDto: Prisma.ProductUpdateInput) {
    return this.inventoryService.updateProduct(id, updateProductDto);
  }

  @Delete('products/:id')
  removeProduct(@Param('id') id: string) {
    return this.inventoryService.removeProduct(id);
  }

  @Post('sales')
  createSale(@Body() createSaleDto: Prisma.SaleCreateInput) {
    return this.inventoryService.createSale(createSaleDto);
  }

  @Get('sales')
  findAllSales(@Query('productId') productId?: string, @Query('sellerId') sellerId?: string) {
    if (productId) return this.inventoryService.findSalesByProduct(productId);
    if (sellerId) return this.inventoryService.findSalesBySeller(sellerId);
    return this.inventoryService.findAllSales();
  }
}
