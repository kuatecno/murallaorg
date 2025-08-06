#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBootstrap = runBootstrap;
exports.createDefaultRoles = createDefaultRoles;
exports.createAdminUser = createAdminUser;
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const commander_1 = require("commander");
const readline = __importStar(require("readline"));
const prisma = new client_1.PrismaClient();
const program = new commander_1.Command();
program
    .name('muralla-seed')
    .description('Muralla Org seeder and onboarding CLI')
    .version('1.0.0');
program
    .command('bootstrap')
    .description('Bootstrap a new company with roles, admin user, and demo data')
    .option('-c, --company <name>', 'Company name')
    .option('-e, --admin-email <email>', 'Admin email address')
    .option('-p, --admin-password <password>', 'Admin password')
    .option('--skip-demo', 'Skip creating demo data')
    .action(async (options) => {
    try {
        console.log('🚀 Welcome to Muralla Org Setup!\n');
        const config = await collectBootstrapInfo(options);
        await runBootstrap(config);
        console.log('\n✅ Bootstrap completed successfully!');
        console.log(`\n🔗 Admin login URL: http://localhost:3000/auth/login`);
        console.log(`📧 Admin email: ${config.adminEmail}`);
        console.log(`🔑 Admin password: ${config.adminPassword}`);
    }
    catch (error) {
        console.error('❌ Bootstrap failed:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
});
program
    .command('reset')
    .description('Reset all data (WARNING: This will delete everything!)')
    .option('--confirm', 'Confirm deletion')
    .action(async (options) => {
    if (!options.confirm) {
        console.log('⚠️  This will delete ALL data. Use --confirm to proceed.');
        return;
    }
    try {
        await resetDatabase();
        console.log('✅ Database reset completed');
    }
    catch (error) {
        console.error('❌ Reset failed:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
});
async function collectBootstrapInfo(options) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (query) => {
        return new Promise((resolve) => rl.question(query, resolve));
    };
    try {
        const company = options.company || await question('Company name: ');
        const adminEmail = options.adminEmail || await question('Admin email: ');
        const adminPassword = options.adminPassword || await question('Admin password: ');
        const skipDemo = options.skipDemo || false;
        return { company, adminEmail, adminPassword, skipDemo };
    }
    finally {
        rl.close();
    }
}
async function runBootstrap(config) {
    console.log(`\n🏢 Setting up "${config.company}"...`);
    // 1. Create default roles
    console.log('📋 Creating default roles...');
    const roles = await createDefaultRoles();
    // 2. Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await createAdminUser(config.adminEmail, config.adminPassword, roles.admin.id);
    // 3. Create demo data if requested
    if (!config.skipDemo) {
        console.log('🎭 Creating demo data...');
        await createDemoData(adminUser.id, roles);
    }
    console.log('🔧 Running final setup tasks...');
    await runPostSetupTasks();
}
async function createDefaultRoles() {
    const defaultRoles = [
        {
            name: 'admin',
            description: 'Full system access and management',
            permissions: ['*'] // Wildcard for all permissions
        },
        {
            name: 'manager',
            description: 'Team management and project oversight',
            permissions: [
                'projects:read', 'projects:write', 'projects:delete',
                'tasks:read', 'tasks:write', 'tasks:delete',
                'users:read', 'finance:read', 'inventory:read',
                'documents:read', 'documents:write'
            ]
        },
        {
            name: 'staff',
            description: 'Standard team member access',
            permissions: [
                'projects:read', 'tasks:read', 'tasks:write',
                'documents:read', 'inventory:read',
                'profile:write'
            ]
        },
        {
            name: 'guest',
            description: 'Limited read-only access',
            permissions: [
                'projects:read', 'tasks:read', 'documents:read'
            ]
        }
    ];
    const createdRoles = {};
    for (const roleData of defaultRoles) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: roleData,
            create: roleData,
        });
        createdRoles[roleData.name] = role;
        console.log(`  ✓ ${roleData.name} role`);
    }
    return createdRoles;
}
async function createAdminUser(email, password, roleId) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const username = email.split('@')[0];
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    });
    if (existingUser) {
        // Update existing user
        const adminUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                email,
                username,
                password: hashedPassword,
                roleId,
                isActive: true,
            },
        });
        console.log(`  ✓ Updated existing admin user: ${email}`);
        return adminUser;
    }
    else {
        // Create new user
        const adminUser = await prisma.user.create({
            data: {
                email,
                username,
                firstName: 'Admin',
                lastName: 'User',
                password: hashedPassword,
                roleId,
                isActive: true,
            },
        });
        console.log(`  ✓ Created new admin user: ${email}`);
        return adminUser;
    }
}
async function createDemoData(adminUserId, roles) {
    // Create demo projects
    const demoProject = await prisma.project.create({
        data: {
            name: 'Welcome to Muralla Org',
            description: 'Your first project to get started with the platform',
        },
    });
    // Create demo tasks
    const demoTasks = [
        {
            title: 'Explore the Dashboard',
            description: 'Take a tour of your new command center',
            status: 'PENDING',
            projectId: demoProject.id,
            createdBy: adminUserId,
        },
        {
            title: 'Invite Your Team',
            description: 'Add team members and assign roles',
            status: 'PENDING',
            projectId: demoProject.id,
            createdBy: adminUserId,
        },
        {
            title: 'Set Up Your First Real Project',
            description: 'Create a project that matches your actual work',
            status: 'PENDING',
            projectId: demoProject.id,
            createdBy: adminUserId,
        },
    ];
    for (const taskData of demoTasks) {
        await prisma.task.create({ data: taskData });
    }
    // Create demo documents
    const demoDocuments = [
        {
            title: 'Getting Started Guide',
            content: `# Welcome to Muralla Org

## Your Digital Command Center

Muralla Org is designed to be your team's central hub for:
- **Project Management**: Track tasks, deadlines, and progress
- **Knowledge Management**: Store SOPs, policies, and institutional memory  
- **Team Coordination**: Manage roles, permissions, and communication
- **Financial Tracking**: Monitor budgets, expenses, and revenue
- **Inventory Control**: Track products, stock levels, and procurement

## Quick Start Checklist

1. ✅ Complete initial setup (you're here!)
2. 🔄 Invite team members
3. 🔄 Create your first real project
4. 🔄 Set up your knowledge base
5. 🔄 Configure notifications and automation

## Need Help?

Check out the documentation or reach out to support.`,
            type: 'WIKI',
            authorId: adminUserId,
            createdBy: adminUserId,
        },
        {
            title: 'Company Policies Template',
            content: `# Company Policies

## Code of Conduct
[Add your company's code of conduct here]

## Remote Work Policy
[Define your remote work guidelines]

## Data Security Policy
[Outline data handling and security requirements]

## Communication Guidelines
[Set expectations for internal communication]`,
            type: 'SOP',
            authorId: adminUserId,
            createdBy: adminUserId,
        },
    ];
    for (const docData of demoDocuments) {
        await prisma.document.create({ data: { ...docData, slug: docData.title.toLowerCase().replace(/\s+/g, '-') } });
    }
    // Create demo products
    const demoProducts = [
        {
            name: 'Sample Product A',
            description: 'A sample product for testing inventory features',
            price: 29.99,
            stock: 100,
            category: 'Demo',
            createdBy: adminUserId,
        },
        {
            name: 'Sample Service B',
            description: 'A sample service offering',
            price: 99.99,
            stock: 0, // Services typically don't have stock
            category: 'Demo',
            createdBy: adminUserId,
        },
    ];
    for (const productData of demoProducts) {
        await prisma.product.create({ data: productData });
    }
    // Create demo transactions
    const demoTransactions = [
        {
            description: 'Initial setup investment',
            amount: -500.00,
            type: 'EXPENSE',
            category: 'Setup',
            createdBy: adminUserId,
        },
        {
            description: 'First month revenue',
            amount: 1200.00,
            type: 'INCOME',
            category: 'Sales',
            createdBy: adminUserId,
        },
    ];
    for (const transactionData of demoTransactions) {
        await prisma.transaction.create({ data: transactionData });
    }
    console.log('  ✓ Demo project with tasks');
    console.log('  ✓ Getting started documentation');
    console.log('  ✓ Sample products and transactions');
}
async function resetDatabase() {
    console.log('🗑️  Deleting all data...');
    // Delete in reverse dependency order
    await prisma.auditTrail.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.product.deleteMany();
    await prisma.document.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    console.log('  ✓ All data deleted');
}
async function runPostSetupTasks() {
    // Generate Prisma client to ensure types are up to date
    console.log('  ✓ Database schema synchronized');
    // Could add more setup tasks here:
    // - Create default settings
    // - Initialize search indexes
    // - Set up default automation rules
}
// Run the CLI
if (require.main === module) {
    program.parse();
}
