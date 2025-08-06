import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/roles.guard';
import { Roles } from '../../../common/roles.decorator';

interface BankTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  reference: string;
  category_icon?: string;
  customer_name?: string;
  supplier_name?: string;
  employee_name?: string;
  items?: string[];
}

interface BankSummary {
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  averageTransaction: number;
  categories: Record<string, { total: number; count: number }>;
  dailyTotals: Record<string, { income: number; expenses: number }>;
  topTransactions: BankTransaction[];
}

interface BankCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Controller('api/bank')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BankController {
  // Mock data based on legacy bank-routes.js
  private bankTransactions: BankTransaction[] = [
    {
      id: '1',
      date: new Date('2024-01-15T10:30:00Z'),
      description: 'Venta de café - Juan Pérez',
      amount: 15000,
      category: 'Ventas',
      type: 'income',
      status: 'completed',
      payment_method: 'Mercado Pago',
      reference: 'MP-2024-001',
      category_icon: 'shopping-cart',
      customer_name: 'Juan Pérez',
      items: ['Café Americano', 'Croissant']
    },
    {
      id: '2',
      date: new Date('2024-01-15T14:20:00Z'),
      description: 'Compra de insumos - Proveedor Café',
      amount: -85000,
      category: 'Compras',
      type: 'expense',
      status: 'completed',
      payment_method: 'Transferencia Bancaria',
      reference: 'TR-2024-002',
      category_icon: 'shopping-bag',
      supplier_name: 'Proveedor Café S.A.',
      items: ['Café grano 5kg', 'Leche 10L', 'Azúcar 5kg']
    },
    {
      id: '3',
      date: new Date('2024-01-16T09:15:00Z'),
      description: 'Pago de nómina - María González',
      amount: -450000,
      category: 'Nómina',
      type: 'expense',
      status: 'completed',
      payment_method: 'Transferencia Bancaria',
      reference: 'TR-2024-003',
      category_icon: 'users',
      employee_name: 'María González'
    },
    {
      id: '4',
      date: new Date('2024-01-16T16:45:00Z'),
      description: 'Venta de evento - Corporación XYZ',
      amount: 250000,
      category: 'Ventas',
      type: 'income',
      status: 'completed',
      payment_method: 'Mercado Pago',
      reference: 'MP-2024-004',
      category_icon: 'shopping-cart',
      customer_name: 'Corporación XYZ'
    }
  ];

  private currentBalance = 1250000;

  @Get('transactions')
  @Roles('admin', 'finance_manager', 'employee')
  async getTransactions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: 'income' | 'expense',
    @Query('category') category?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0'
  ) {
    try {
      let filteredTransactions = [...this.bankTransactions];

      // Apply filters
      if (startDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.date) >= new Date(startDate)
        );
      }

      if (endDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.date) <= new Date(endDate)
        );
      }

      if (type) {
        filteredTransactions = filteredTransactions.filter(t => t.type === type);
      }

      if (category) {
        filteredTransactions = filteredTransactions.filter(t => t.category === category);
      }

      // Calculate summary data
      const now = new Date();
      const monthlyIncome = filteredTransactions
        .filter(t => t.amount > 0 && new Date(t.date).getMonth() === now.getMonth())
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyExpenses = Math.abs(filteredTransactions
        .filter(t => t.amount < 0 && new Date(t.date).getMonth() === now.getMonth())
        .reduce((sum, t) => sum + t.amount, 0));

      const paginatedTransactions = filteredTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      return {
        success: true,
        transactions: paginatedTransactions,
        currentBalance: this.currentBalance,
        monthlyIncome,
        monthlyExpenses,
        totalCount: filteredTransactions.length,
        summary: {
          totalIncome: filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
          totalExpenses: Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
          transactionCount: filteredTransactions.length
        }
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Error al obtener transacciones');
    }
  }

  @Get('balance')
  @Roles('admin', 'finance_manager', 'employee')
  async getBalance() {
    try {
      return {
        success: true,
        balance: this.currentBalance,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Error al obtener balance');
    }
  }

  @Post('transaction')
  @Roles('admin', 'finance_manager')
  async createTransaction(
    @Body() transactionData: {
      description: string;
      amount: number;
      category: string;
      type: 'income' | 'expense';
      payment_method: string;
      reference?: string;
      customer_name?: string;
      supplier_name?: string;
    }
  ) {
    try {
      const { description, amount, category, type, payment_method, reference, customer_name, supplier_name } = transactionData;

      // Validate required fields
      if (!description || !amount || !category || !type) {
        throw new Error('Faltan campos requeridos');
      }

      const newTransaction: BankTransaction = {
        id: (this.bankTransactions.length + 1).toString(),
        date: new Date(),
        description,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category,
        type,
        status: 'completed',
        payment_method,
        reference: reference || `${type.toUpperCase()}-${Date.now()}`,
        customer_name,
        supplier_name
      };

      this.bankTransactions.unshift(newTransaction);
      this.currentBalance += newTransaction.amount;

      return { success: true, transaction: newTransaction };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Error al crear transacción');
    }
  }

  @Get('summary')
  @Roles('admin', 'finance_manager', 'employee')
  async getSummary(@Query('period') period = 'monthly') {
    try {
      let filteredTransactions = [...this.bankTransactions];
      const now = new Date();

      if (period === 'daily') {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.date).toDateString() === now.toDateString()
        );
      } else if (period === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.date) >= weekAgo
        );
      } else if (period === 'monthly') {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.date).getMonth() === now.getMonth() && 
          new Date(t.date).getFullYear() === now.getFullYear()
        );
      }

      const summary: BankSummary = {
        totalIncome: filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
        transactionCount: filteredTransactions.length,
        averageTransaction: filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / filteredTransactions.length || 0,
        categories: this.getCategorySummary(filteredTransactions),
        dailyTotals: this.getDailyTotals(filteredTransactions),
        topTransactions: filteredTransactions.slice(0, 5)
      };

      return { success: true, summary };
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw new Error('Error al obtener resumen');
    }
  }

  @Get('categories')
  @Roles('admin', 'finance_manager', 'employee')
  async getCategories() {
    try {
      const categories: BankCategory[] = [
        { id: 'ventas', name: 'Ventas', icon: 'shopping-cart', color: 'green' },
        { id: 'compras', name: 'Compras', icon: 'shopping-bag', color: 'red' },
        { id: 'nomina', name: 'Nómina', icon: 'users', color: 'blue' },
        { id: 'servicios', name: 'Servicios', icon: 'cogs', color: 'yellow' },
        { id: 'transferencias', name: 'Transferencias', icon: 'exchange-alt', color: 'purple' },
        { id: 'comisiones', name: 'Comisiones', icon: 'percentage', color: 'gray' }
      ];

      return { success: true, categories };
    } catch (error) {
      throw new Error('Error al obtener categorías');
    }
  }

  // Mercado Pago webhook endpoint
  @Post('mercadopago/webhook')
  async handleMercadoPagoWebhook(@Body() webhookData: any) {
    try {
      const { type, data } = webhookData;

      if (type === 'payment') {
        // In a real implementation, you would verify the payment with Mercado Pago API
        // For now, we'll simulate a successful payment
        const transaction: BankTransaction = {
          id: data.id || Date.now().toString(),
          date: new Date(),
          description: 'Pago Mercado Pago',
          amount: data.transaction_amount || 0,
          category: 'Ventas',
          type: 'income',
          status: 'completed',
          payment_method: 'Mercado Pago',
          reference: data.id?.toString() || `MP-${Date.now()}`
        };

        this.bankTransactions.unshift(transaction);
        this.currentBalance += transaction.amount;

        // In a real implementation, you would emit real-time updates via WebSocket
        console.log('New Mercado Pago transaction:', transaction);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error('Webhook error');
    }
  }

  // Helper methods
  private getCategorySummary(transactions: BankTransaction[]) {
    const categories: Record<string, { total: number; count: number }> = {};
    transactions.forEach(transaction => {
      const category = transaction.category || 'Otros';
      if (!categories[category]) {
        categories[category] = { total: 0, count: 0 };
      }
      categories[category].total += Math.abs(transaction.amount);
      categories[category].count += 1;
    });
    return categories;
  }

  private getDailyTotals(transactions: BankTransaction[]) {
    const dailyTotals: Record<string, { income: number; expenses: number }> = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.date).toISOString().split('T')[0];
      if (!dailyTotals[date]) {
        dailyTotals[date] = { income: 0, expenses: 0 };
      }
      
      if (transaction.amount > 0) {
        dailyTotals[date].income += transaction.amount;
      } else {
        dailyTotals[date].expenses += Math.abs(transaction.amount);
      }
    });
    return dailyTotals;
  }
}
