# 预售卡兑换系统 - 数据库设计建议方案 (V1.0)

## 1. 设计概述
本设计方案基于《预售卡项目 PRD V1.0》及现有原型开发，旨在满足预售卡（商品卡、积分卡）的制卡、发售、兑换、物流及财务结算等核心业务需求。

**设计原则：**
- **安全性**：卡密（Token）独立存储并建立索引，确保兑换链接的唯一性与查询效率。
- **扩展性**：支持“商品卡”与“积分卡”两种业务模式，预留未来营销扩展字段。
- **数据完整性**：通过外键约束（逻辑或物理）确保订单、卡片、批次、商品之间的数据关联。

---

## 2. ER 图核心实体关系
- **分发商 (Distributor)** 1 : N **批次 (Batch)**
- **批次 (Batch)** 1 : N **卡片 (Card)**
- **批次 (Batch)** N : N **商品 (Product)** (仅商品卡类型)
- **卡片 (Card)** 1 : N **订单 (Order)** (积分卡可能多次兑换，商品卡通常一次)
- **订单 (Order)** 1 : N **订单明细 (OrderItem)**

---

## 3. 数据表结构设计

### 3.1 基础模块

#### `sys_users` (系统用户表)
用于管理后台登录。
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| username | VARCHAR(50) | 用户名 |
| password_hash | VARCHAR(255) | 密码哈希 |
| role | VARCHAR(20) | 角色 (admin:管理员, operator:运营) |
| created_at | DATETIME | 创建时间 |

#### `distributors` (分发商表)
管理合作渠道商信息。
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| name | VARCHAR(100) | 分发商名称 |
| contact_person | VARCHAR(50) | 联系人 |
| phone | VARCHAR(20) | 联系电话 |
| address | VARCHAR(255) | 地址 |
| status | TINYINT | 状态 (1:合作中, 0:停用) |
| created_at | DATETIME | 创建时间 |

#### `products` (商品表)
包含实物商品信息，供商品卡绑定或积分商城展示。
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| name | VARCHAR(100) | 商品名称 |
| description | TEXT | 商品详情描述 (HTML) |
| image_urls | TEXT | 商品图片 (JSON数组) |
| stock | INT | 库存数量 |
| points_price | INT | 积分兑换价 (积分商城用) |
| category | VARCHAR(50) | 分类 (如: 数码, 食品) |
| status | TINYINT | 状态 (1:上架, 0:下架) |
| created_at | DATETIME | 创建时间 |

### 3.2 卡务核心模块

#### `card_batches` (制卡批次表)
核心表，定义一批卡的属性、规则和结算费率。
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| batch_no | VARCHAR(50) | 批次号 (唯一) |
| name | VARCHAR(100) | 批次名称 |
| type | TINYINT | 卡类型 (1:商品卡, 2:积分卡) |
| distributor_id | INT | 关联分发商ID |
| discount_rate | DECIMAL(5,2) | 结算折扣率 (如 0.70) |
| points_value | INT | 面额积分 (仅积分卡有效) |
| total_count | INT | 制卡总数 |
| start_time | DATETIME | 兑换开始时间 |
| delivery_estimate | VARCHAR(100)| 预计发货时间描述 |
| status | TINYINT | 状态 (0:未激活, 1:已激活, 2:已作废) |
| remark | TEXT | 内部备注 |
| created_at | DATETIME | 创建时间 |

#### `batch_products` (批次-商品关联表)
定义“商品卡”可以兑换哪些商品（多对多关系）。
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| batch_id | INT | 批次ID |
| product_id | INT | 商品ID |

#### `cards` (卡片明细表)
每一张具体的卡片，对应唯一的二维码/链接。
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| card_no | VARCHAR(50) | 卡号 (对外展示, 唯一) |
| token | VARCHAR(64) | 兑换Token (URL参数, 核心凭证, 索引) |
| batch_id | INT | 所属批次ID |
| status | TINYINT | 状态 (0:未激活, 1:已激活, 2:已使用, 3:已作废) |
| points_balance | INT | 剩余积分 (积分卡用) |
| activated_at | DATETIME | 激活时间 |
| first_used_at | DATETIME | 首次使用时间 |
| created_at | DATETIME | 生成时间 |

### 3.3 订单与履约模块

#### `orders` (兑换订单表)
用户扫码提交的兑换请求。
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| order_no | VARCHAR(50) | 订单号 (唯一) |
| card_id | INT | 关联卡片ID |
| user_name | VARCHAR(50) | 收货人姓名 |
| user_phone | VARCHAR(20) | 收货人电话 |
| user_address | TEXT | 完整收货地址 |
| total_points | INT | 消耗积分总额 (积分卡订单用) |
| status | TINYINT | 状态 (0:待发货, 1:已发货, 2:已完成) |
| tracking_company | VARCHAR(50) | 物流公司 |
| tracking_no | VARCHAR(50) | 物流单号 |
| shipped_at | DATETIME | 发货时间 |
| created_at | DATETIME | 下单时间 |

#### `order_items` (订单商品明细表)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| order_id | INT | 订单ID |
| product_id | INT | 商品ID |
| product_name | VARCHAR(100) | 商品名称快照 |
| quantity | INT | 数量 |
| settlement_price | DECIMAL(10,2)| 结算单价快照 (根据批次折扣计算) |

### 3.4 财务模块

#### `finance_records` (财务流水表)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| type | TINYINT | 类型 (1:制卡成本, 2:售卡收入) |
| batch_id | INT | 关联批次ID (可选) |
| amount | DECIMAL(10,2)| 金额 |
| related_party | VARCHAR(100) | 相关方 (供应商/客户) |
| record_date | DATE | 业务发生日期 |
| created_at | DATETIME | 登记时间 |

#### `settlements` (结算单表)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | INT | 主键, 自增 |
| settlement_no | VARCHAR(50) | 结算单号 |
| distributor_id | INT | 分发商ID |
| amount | DECIMAL(10,2)| 结算总金额 |
| status | TINYINT | 状态 (0:未结算, 1:已结算) |
| period | VARCHAR(20) | 账期 (如 2023-10) |
| created_at | DATETIME | 创建时间 |

---

## 4. 关键索引建议
1. `cards` 表：`UNIQUE INDEX idx_card_token (token)` - 确保扫码兑换的高性能查询。
2. `cards` 表：`INDEX idx_card_no (card_no)` - 后台查询用。
3. `orders` 表：`UNIQUE INDEX idx_order_no (order_no)` - 订单查询。
4. `orders` 表：`INDEX idx_card_id (card_id)` - 查询某张卡的兑换记录。

## 5. 补充说明
- **积分扣减**：对于积分卡，采用**乐观锁**或**数据库事务**处理 `points_balance` 的扣减，防止并发超额兑换。
- **状态流转**：卡片状态变更需记录日志（可增加 `card_logs` 表），以便追踪“作废”、“激活”等操作的审计。
