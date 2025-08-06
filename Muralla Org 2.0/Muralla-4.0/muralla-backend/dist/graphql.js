"use strict";
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.Transaction = exports.Task = exports.ISubscription = exports.Sale = exports.Role = exports.IQuery = exports.Project = exports.Product = exports.IMutation = exports.FinancialSummary = exports.Document = exports.UpdateUserInput = exports.CreateUserInput = exports.CreateTransactionInput = exports.CreateTaskInput = exports.CreateSaleInput = exports.CreateProjectInput = exports.CreateProductInput = exports.CreateDocumentInput = exports.TransactionType = exports.TaskStatus = exports.DocumentType = void 0;
/* tslint:disable */
/* eslint-disable */
var DocumentType;
(function (DocumentType) {
    DocumentType["PLAYBOOK"] = "PLAYBOOK";
    DocumentType["POLICY"] = "POLICY";
    DocumentType["SOP"] = "SOP";
    DocumentType["TEMPLATE"] = "TEMPLATE";
    DocumentType["WIKI"] = "WIKI";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["DONE"] = "DONE";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["REVIEW"] = "REVIEW";
    TaskStatus["TODO"] = "TODO";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["EXPENSE"] = "EXPENSE";
    TransactionType["INCOME"] = "INCOME";
    TransactionType["TRANSFER"] = "TRANSFER";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
class CreateDocumentInput {
}
exports.CreateDocumentInput = CreateDocumentInput;
class CreateProductInput {
}
exports.CreateProductInput = CreateProductInput;
class CreateProjectInput {
}
exports.CreateProjectInput = CreateProjectInput;
class CreateSaleInput {
}
exports.CreateSaleInput = CreateSaleInput;
class CreateTaskInput {
}
exports.CreateTaskInput = CreateTaskInput;
class CreateTransactionInput {
}
exports.CreateTransactionInput = CreateTransactionInput;
class CreateUserInput {
}
exports.CreateUserInput = CreateUserInput;
class UpdateUserInput {
}
exports.UpdateUserInput = UpdateUserInput;
class Document {
}
exports.Document = Document;
class FinancialSummary {
}
exports.FinancialSummary = FinancialSummary;
class IMutation {
}
exports.IMutation = IMutation;
class Product {
}
exports.Product = Product;
class Project {
}
exports.Project = Project;
class IQuery {
}
exports.IQuery = IQuery;
class Role {
}
exports.Role = Role;
class Sale {
}
exports.Sale = Sale;
class ISubscription {
}
exports.ISubscription = ISubscription;
class Task {
}
exports.Task = Task;
class Transaction {
}
exports.Transaction = Transaction;
class User {
}
exports.User = User;
