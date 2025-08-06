
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum DocumentType {
    PLAYBOOK = "PLAYBOOK",
    POLICY = "POLICY",
    SOP = "SOP",
    TEMPLATE = "TEMPLATE",
    WIKI = "WIKI"
}

export enum TaskStatus {
    DONE = "DONE",
    IN_PROGRESS = "IN_PROGRESS",
    REVIEW = "REVIEW",
    TODO = "TODO"
}

export enum TransactionType {
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
    TRANSFER = "TRANSFER"
}

export class CreateDocumentInput {
    content: string;
    title: string;
    type: DocumentType;
}

export class CreateProductInput {
    description?: Nullable<string>;
    name: string;
    price: number;
    sku?: Nullable<string>;
    stock: number;
}

export class CreateProjectInput {
    description?: Nullable<string>;
    endDate?: Nullable<DateTime>;
    name: string;
    startDate?: Nullable<DateTime>;
    status: string;
}

export class CreateSaleInput {
    productId: string;
    quantity: number;
    totalAmount: number;
}

export class CreateTaskInput {
    assigneeId?: Nullable<string>;
    description?: Nullable<string>;
    dueDate?: Nullable<DateTime>;
    priority?: Nullable<string>;
    projectId: string;
    status: TaskStatus;
    title: string;
}

export class CreateTransactionInput {
    amount: number;
    category: string;
    description?: Nullable<string>;
    type: TransactionType;
}

export class CreateUserInput {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    roleId: string;
    username: string;
}

export class UpdateUserInput {
    email?: Nullable<string>;
    firstName?: Nullable<string>;
    isActive?: Nullable<boolean>;
    lastName?: Nullable<string>;
    roleId?: Nullable<string>;
    username?: Nullable<string>;
}

export class Document {
    author: User;
    content: string;
    createdAt: DateTime;
    id: string;
    title: string;
    type: DocumentType;
    updatedAt: DateTime;
}

export class FinancialSummary {
    netProfit: number;
    totalExpenses: number;
    totalIncome: number;
    transactionCount: number;
}

export abstract class IMutation {
    abstract createDocument(input: CreateDocumentInput): Document | Promise<Document>;

    abstract createProduct(input: CreateProductInput): Product | Promise<Product>;

    abstract createProject(input: CreateProjectInput): Project | Promise<Project>;

    abstract createSale(input: CreateSaleInput): Sale | Promise<Sale>;

    abstract createTask(input: CreateTaskInput): Task | Promise<Task>;

    abstract createTransaction(input: CreateTransactionInput): Transaction | Promise<Transaction>;

    abstract createUser(input: CreateUserInput): User | Promise<User>;

    abstract deleteDocument(id: string): boolean | Promise<boolean>;

    abstract deleteProduct(id: string): boolean | Promise<boolean>;

    abstract deleteProject(id: string): boolean | Promise<boolean>;

    abstract deleteSale(id: string): boolean | Promise<boolean>;

    abstract deleteTask(id: string): boolean | Promise<boolean>;

    abstract deleteTransaction(id: string): boolean | Promise<boolean>;

    abstract deleteUser(id: string): boolean | Promise<boolean>;

    abstract updateDocument(id: string, input: CreateDocumentInput): Document | Promise<Document>;

    abstract updateProduct(id: string, input: CreateProductInput): Product | Promise<Product>;

    abstract updateProject(id: string, input: CreateProjectInput): Project | Promise<Project>;

    abstract updateSale(id: string, input: CreateSaleInput): Sale | Promise<Sale>;

    abstract updateTask(id: string, input: CreateTaskInput): Task | Promise<Task>;

    abstract updateTransaction(id: string, input: CreateTransactionInput): Transaction | Promise<Transaction>;

    abstract updateUser(id: string, input: UpdateUserInput): User | Promise<User>;
}

export class Product {
    createdAt: DateTime;
    description?: Nullable<string>;
    id: string;
    name: string;
    price: number;
    sales: Sale[];
    sku?: Nullable<string>;
    stock: number;
    updatedAt: DateTime;
}

export class Project {
    createdAt: DateTime;
    description?: Nullable<string>;
    endDate?: Nullable<DateTime>;
    id: string;
    name: string;
    startDate?: Nullable<DateTime>;
    status: string;
    tasks: Task[];
    updatedAt: DateTime;
}

export abstract class IQuery {
    abstract document(id: string): Nullable<Document> | Promise<Nullable<Document>>;

    abstract documents(authorId?: Nullable<string>, type?: Nullable<DocumentType>): Document[] | Promise<Document[]>;

    abstract financialSummary(): FinancialSummary | Promise<FinancialSummary>;

    abstract product(id: string): Nullable<Product> | Promise<Nullable<Product>>;

    abstract products(): Product[] | Promise<Product[]>;

    abstract project(id: string): Nullable<Project> | Promise<Nullable<Project>>;

    abstract projects(): Project[] | Promise<Project[]>;

    abstract role(id: string): Nullable<Role> | Promise<Nullable<Role>>;

    abstract roles(): Role[] | Promise<Role[]>;

    abstract sale(id: string): Nullable<Sale> | Promise<Nullable<Sale>>;

    abstract sales(productId?: Nullable<string>, sellerId?: Nullable<string>): Sale[] | Promise<Sale[]>;

    abstract task(id: string): Nullable<Task> | Promise<Nullable<Task>>;

    abstract tasks(assigneeId?: Nullable<string>, projectId?: Nullable<string>): Task[] | Promise<Task[]>;

    abstract transaction(id: string): Nullable<Transaction> | Promise<Nullable<Transaction>>;

    abstract transactions(category?: Nullable<string>, creatorId?: Nullable<string>, type?: Nullable<TransactionType>): Transaction[] | Promise<Transaction[]>;

    abstract user(id: string): Nullable<User> | Promise<Nullable<User>>;

    abstract users(): User[] | Promise<User[]>;
}

export class Role {
    createdAt: DateTime;
    id: string;
    name: string;
    permissions: string[];
    updatedAt: DateTime;
    users: User[];
}

export class Sale {
    createdAt: DateTime;
    id: string;
    product: Product;
    quantity: number;
    seller: User;
    totalAmount: number;
    updatedAt: DateTime;
}

export abstract class ISubscription {
    abstract documentUpdated(): Document | Promise<Document>;

    abstract saleCreated(): Sale | Promise<Sale>;

    abstract taskUpdated(): Task | Promise<Task>;

    abstract transactionCreated(): Transaction | Promise<Transaction>;
}

export class Task {
    assignee?: Nullable<User>;
    createdAt: DateTime;
    description?: Nullable<string>;
    dueDate?: Nullable<DateTime>;
    id: string;
    priority?: Nullable<string>;
    project: Project;
    status: TaskStatus;
    title: string;
    updatedAt: DateTime;
}

export class Transaction {
    amount: number;
    category: string;
    createdAt: DateTime;
    creator: User;
    description?: Nullable<string>;
    id: string;
    type: TransactionType;
    updatedAt: DateTime;
}

export class User {
    createdAt: DateTime;
    documents: Document[];
    email: string;
    firstName: string;
    id: string;
    isActive: boolean;
    lastName: string;
    role: Role;
    sales: Sale[];
    tasks: Task[];
    transactions: Transaction[];
    updatedAt: DateTime;
    username: string;
}

export type DateTime = any;
export type JSON = any;
type Nullable<T> = T | null;
