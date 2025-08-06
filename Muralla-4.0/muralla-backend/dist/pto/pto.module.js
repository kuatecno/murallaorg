"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PtoModule = void 0;
const common_1 = require("@nestjs/common");
const pto_service_1 = require("./pto.service");
const pto_controller_1 = require("./pto.controller");
const prisma_service_1 = require("../prisma/prisma.service");
let PtoModule = class PtoModule {
};
exports.PtoModule = PtoModule;
exports.PtoModule = PtoModule = __decorate([
    (0, common_1.Module)({
        controllers: [pto_controller_1.PtoController],
        providers: [pto_service_1.PtoService, prisma_service_1.PrismaService],
    })
], PtoModule);
