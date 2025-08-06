"use strict";
// Shared enums used across the application
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = exports.RoleType = exports.AuditOperation = exports.TransactionType = exports.DocumentType = exports.TaskStatus = void 0;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "PENDING";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["DONE"] = "DONE";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["WIKI"] = "WIKI";
    DocumentType["SOP"] = "SOP";
    DocumentType["PLAYBOOK"] = "PLAYBOOK";
    DocumentType["TEMPLATE"] = "TEMPLATE";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["INCOME"] = "INCOME";
    TransactionType["EXPENSE"] = "EXPENSE";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var AuditOperation;
(function (AuditOperation) {
    AuditOperation["CREATE"] = "CREATE";
    AuditOperation["UPDATE"] = "UPDATE";
    AuditOperation["DELETE"] = "DELETE";
    AuditOperation["RESTORE"] = "RESTORE";
})(AuditOperation || (exports.AuditOperation = AuditOperation = {}));
var RoleType;
(function (RoleType) {
    RoleType["ADMIN"] = "admin";
    RoleType["MANAGER"] = "manager";
    RoleType["STAFF"] = "staff";
    RoleType["GUEST"] = "guest";
})(RoleType || (exports.RoleType = RoleType = {}));
var Action;
(function (Action) {
    Action["CREATE"] = "create";
    Action["READ"] = "read";
    Action["UPDATE"] = "update";
    Action["DELETE"] = "delete";
    Action["MANAGE"] = "manage";
})(Action || (exports.Action = Action = {}));
//# sourceMappingURL=enums.js.map