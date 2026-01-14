# 实验室设备管理系统

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://lab-system.jwyihao.top)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.2.0-2D3748?logo=prisma)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](LICENSE)

> 🌐 **在线预览**: [https://lab-system.jwyihao.top](https://lab-system.jwyihao.top)
>
> 本项目已部署于 Vercel 平台，可直接访问上述链接进行体验。

一套基于 B/S 架构的综合性实验室设备管理系统，涵盖设备台账管理、多角色借用预约、分级审批流转、实验过程监管、财务对接与统计报表等核心功能。

> **📚 课程项目说明**
>
> 本项目为**哈尔滨工业大学软件工程专业**《软件过程与项目管理》课程综合实验作品。项目以"江南大学实验室设备管理"为虚构业务场景，完整实践了敏捷开发流程（Scrum）、用户故事编写、Sprint 规划与迭代开发等软件工程方法。

---

## 目录

- [项目概述](#项目概述)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
  - [环境要求](#环境要求)
  - [本地开发](#本地开发)
  - [Docker 部署](#docker-部署)
- [数据库设计](#数据库设计)
- [用户角色](#用户角色)
- [审批流程](#审批流程)
- [环境变量](#环境变量)
- [测试](#测试)
- [许可证](#许可证)

---

## 项目概述

本系统以高校实验室设备管理为业务背景，旨在解决传统实验室设备管理中存在的信息不透明、预约流程繁琐、审批效率低下等问题。系统支持五种用户角色（学生、教师、校外人员、设备管理员、实验室负责人），通过差异化的权限控制和分级审批机制，实现设备资源的高效利用与规范管理。

## 功能特性

### 🔐 认证与授权

- 基于 NextAuth.js v5 的安全认证
- 五种用户角色的差异化权限控制
- 可选的 IP 白名单访问控制（管理员角色）
- Middleware 路由保护

### 📦 设备管理

- 设备信息 CRUD 操作
- 设备状态管理（空闲/占用/维修中/报废）
- 可用时段配置（周期时段 + 特殊日期）
- 维护日志记录
- 设备采购与报废流程

### 📅 预约借用

- 可视化时段选择（日历组件）
- 智能时段冲突检测
- 支持预约撤销与退款

### ✅ 多级审批

- 学生申请需导师审批
- 教师申请需管理员审批
- 校外人员申请需负责人审批 + 缴费确认

### 🔬 实验监管

- 签到/签退功能
- 使用日志采集
- 异常事件上报与处理

### 📊 报表统计

- Dashboard 数据概览
- 设备利用率可视化图表
- 周报/月报/年报自动生成
- 报表导出（PDF/Excel）

### ⚙️ 系统设置

- 管理制度编辑与展示
- 实验计划制定
- 通用配置管理
- IP 白名单管理

---

## 技术栈

| 层级           | 技术选型                                  |
| -------------- | ----------------------------------------- |
| **前端框架**   | Next.js 16 (App Router)                   |
| **UI 组件库**  | shadcn/ui (Mira 风格) + Tailwind CSS 4    |
| **图标库**     | Tabler Icons                              |
| **表单处理**   | React Hook Form + Zod                     |
| **数据表格**   | TanStack Table                            |
| **数据可视化** | Recharts                                  |
| **后端**       | Next.js Server Actions + API Routes       |
| **ORM**        | Prisma 7                                  |
| **数据库**     | PostgreSQL                                |
| **认证**       | NextAuth.js v5 (Auth.js) + Prisma Adapter |
| **包管理器**   | pnpm                                      |
| **测试框架**   | Vitest + Testing Library                  |
| **部署**       | Vercel / Docker                           |

---

## 项目结构

```
lab_system/
├── app/
│   ├── (auth)/                    # 认证路由组
│   │   ├── login/                 # 登录页
│   │   └── register/              # 注册页
│   ├── dashboard/                 # 后台路由组 (需登录)
│   │   ├── equipment/             # 设备管理
│   │   ├── reservation/           # 预约管理
│   │   ├── admin/                 # 管理模块
│   │   │   ├── staff/             # 员工管理
│   │   │   └── approval/          # 审批中心
│   │   ├── monitoring/            # 实验过程监管
│   │   ├── reports/               # 统计报表
│   │   ├── settings/              # 系统设置
│   │   └── ...
│   └── api/                       # API 路由
├── components/
│   ├── ui/                        # shadcn/ui 基础组件
│   ├── layout/                    # 布局组件
│   ├── business/                  # 业务组件
│   └── monitoring/                # 监管相关组件
├── lib/
│   ├── actions/                   # Server Actions
│   ├── schemas/                   # Zod 校验模式
│   ├── auth.ts                    # NextAuth 配置
│   ├── prisma.ts                  # Prisma 客户端
│   ├── ip-whitelist.ts            # IP 白名单校验
│   └── utils.ts                   # 工具函数
├── prisma/
│   ├── schema.prisma              # 数据库 Schema
│   └── seed.ts                    # 种子数据
├── types/                         # TypeScript 类型定义
├── middleware.ts                  # 路由保护中间件
├── Dockerfile                     # Docker 镜像配置
└── docker-compose.yml             # Docker Compose 配置
```

---

## 快速开始

### 环境要求

- **Node.js**: >= 18.x
- **pnpm**: >= 8.x
- **PostgreSQL**: >= 14.x

### 本地开发

1. **克隆仓库**

   ```bash
   git clone https://github.com/your-username/lab_system.git
   cd lab_system
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **配置环境变量**

   ```bash
   cp .env.example .env
   ```

   编辑 `.env` 文件，配置数据库连接和认证密钥：

   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/lab_system?schema=public"
   AUTH_SECRET="your-secret-key-here"
   ```

4. **初始化数据库**

   ```bash
   pnpm prisma migrate dev
   ```

5. **生成种子数据（可选）**

   ```bash
   pnpm prisma db seed
   ```

6. **启动开发服务器**

   ```bash
   pnpm dev
   ```

   访问 [http://localhost:3000](http://localhost:3000)

### Docker 部署

项目提供 Docker 支持，可通过 Docker Compose 快速部署：

```bash
docker-compose up -d
```

---

## 数据库设计

系统使用 Prisma ORM 管理数据库模型，主要包含以下核心模型：

| 模型                               | 说明           |
| ---------------------------------- | -------------- |
| `User`                             | 用户基础信息   |
| `Student` / `Teacher` / `Outsider` | 用户角色扩展表 |
| `Equipment`                        | 设备信息       |
| `EquipmentTimeSlot`                | 设备可用时段   |
| `MaintenanceLog`                   | 维护日志       |
| `Reservation`                      | 预约记录       |
| `Payment`                          | 支付信息       |
| `CheckIn`                          | 签到/签退记录  |
| `Incident`                         | 异常事件       |
| `PurchaseRequest`                  | 采购申请       |
| `ScrapRequest`                     | 报废申请       |
| `Regulation`                       | 管理制度       |
| `ExperimentPlan`                   | 实验计划       |
| `Report`                           | 统计报表       |
| `IpWhitelist`                      | IP 白名单      |
| `SystemConfig`                     | 系统配置       |

详细定义请参阅 [`prisma/schema.prisma`](prisma/schema.prisma)。

---

## 用户角色

系统定义了五种用户角色，各角色权限如下：

| 角色             | 标识       | 主要权限                                       |
| ---------------- | ---------- | ---------------------------------------------- |
| **学生**         | `STUDENT`  | 浏览设备、提交预约申请（需导师审批）           |
| **教师**         | `TEACHER`  | 浏览设备、提交预约申请、审批学生申请、管理学生 |
| **校外人员**     | `OUTSIDER` | 浏览设备、提交预约申请（需负责人审批 + 缴费）  |
| **设备管理员**   | `ADMIN`    | 设备 CRUD、审批预约、处理异常、采购/报废流程   |
| **实验室负责人** | `HEAD`     | 全部权限、员工管理、终审校外预约、系统设置     |

---

## 审批流程

不同角色的预约申请遵循不同的审批流程：

```
学生申请:   待导师审批 → 待管理员审批 → 已批准 → 使用中 → 已完成
教师申请:   待管理员审批 → 已批准 → 使用中 → 已完成
校外申请:   待管理员审批 → 待负责人审批 → 待缴费 → 已批准 → 使用中 → 已完成
任意角色:   * → 已驳回 / 已撤销
```

---

## 环境变量

| 变量名                | 说明                  | 示例                                                       |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL 连接字符串 | `postgresql://postgres:password@localhost:5432/lab_system` |
| `AUTH_SECRET`         | NextAuth 加密密钥     | `your-secret-key`                                          |
| `ENABLE_IP_WHITELIST` | 是否启用 IP 白名单    | `true` / `false`                                           |

---

## 测试

项目使用 Vitest 作为测试框架：

```bash
# 运行所有测试
pnpm test

# 运行一次性测试
pnpm test:run

# 代码检查
pnpm lint
```

---

## 许可证

本项目采用 [Mozilla Public License 2.0 (MPL-2.0)](LICENSE) 开源协议。

---

<p align="center">
  <sub>Made with ❤️ at Harbin Institute of Technology</sub>
</p>
