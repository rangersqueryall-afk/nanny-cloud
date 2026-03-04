# 订单流程文档

## 1. 系统概述

- **技术栈**: 微信小程序 + 腾讯云开发 (CloudBase)
- **业务场景**: 家政服务平台（保姆、月嫂、育儿嫂等）
- **核心模块**: 预约 -> 面试 -> 签约 -> 订单 -> 支付 -> 服务 -> 完成

---

## 2. 订单状态定义

| 状态常量 | 显示文本 | 说明 |
|---------|---------|------|
| `pending_payment` | 待支付 | 订单已创建，等待用户支付 |
| `pending` | 待服务 | 已支付，等待开始服务 |
| `confirmed` | 已确认 | 阿姨已确认接单 |
| `serving` / `in_service` | 服务中 | 正在提供服务 |
| `completed` | 已完成 | 服务已完成 |
| `cancelled` | 已取消 | 订单已取消 |

---

## 3. 订单创建流程

### 3.1 流程一：直接创建订单

适用于雇主直接选择阿姨下单的场景。

```
雇主选择阿姨 -> 创建订单(pending) -> 等待支付
```

**接口**: `order.create`

**主要逻辑**:
1. 校验阿姨是否存在
2. 计算服务价格 = 日薪 × 服务天数
3. 创建订单，状态设为 `pending`
4. 返回订单信息

**请求参数**:
```javascript
{
  workerId: '阿姨ID',
  serviceType: '服务类型(babysitter/nanny/maternity...)',
  serviceSchedule: '服务时间安排(livein/daytime/temporary)',
  startDate: '开始日期',
  endDate: '结束日期',
  address: '服务地址',
  contactName: '联系人',
  contactPhone: '联系电话',
  remark: '备注'
}
```

### 3.2 流程二：从预约创建订单（签约）

适用于面试通过后签署合同的场景。

```
预约面试 -> 面试通过(interview_passed) -> 签署合同 -> 创建订单(pending_payment) -> 等待支付
```

**接口**: `order.createFromBooking`

**前置条件**:
- 预约状态为 `interview_passed` 或 `order_created`
- 用户已签署合同 (`contractSigned: true`)

**主要逻辑**:
1. 校验预约是否存在及权限
2. 校验预约状态是否符合要求
3. 计算支付金额（中介费 + 首月工资）
4. 创建订单，状态设为 `pending_payment`，支付状态设为 `unpaid`
5. 更新预约状态为 `order_created`
6. 通知阿姨有新订单

**订单金额计算**:
```javascript
payableTotal = agencyFee + firstMonthSalary
// agencyFee = agencyFeeBase × agencyFeeMonths × discountFactor
// firstMonthSalary = monthlySalary
```

---

## 4. 支付流程

```
订单详情页 -> 点击支付 -> 调用 payOrder -> 拉起微信支付 -> 用户支付 -> 支付回调 -> confirmPaid -> 状态变更
```

### 4.1 发起支付

**接口**: `order.payOrder`

**主要逻辑**:
1. 校验订单是否存在
2. 如果已支付，直接返回
3. 重新计算订单金额（基于最新的预约数据）
4. 调用 `cloudPay.unifiedOrder` 发起微信支付
5. 返回支付参数（timeStamp, nonceStr, package, signType, paySign）

**支付金额**: `payableTotal`（单位：元）

### 4.2 支付回调

**接口**: `order.confirmPaid` (主动确认)

**支付回调通知**:
- 微信支付成功后，通过云函数的支付回调处理
- 将订单状态从 `pending_payment` 变更为 `pending` 或 `in_service`
- 更新支付状态为 `paid`

---

## 5. 服务流程

```
pending(待服务) -> confirmed(已确认) -> serving/in_service(服务中) -> completed(已完成)
```

### 5.1 确认接单

**接口**: 阿姨端确认接单

- 订单状态从 `pending` 变更为 `confirmed`

### 5.2 开始服务

- 订单状态从 `confirmed` 变更为 `serving` 或 `in_service`

### 5.3 完成服务

**接口**: `order.complete`

**主要逻辑**:
1. 校验订单状态（只能在 `serving` 状态下完成）
2. 更新订单状态为 `completed`
3. 记录完成时间

---

## 6. 取消订单流程

```
order.cancel -> 校验状态 -> 更新状态为 cancelled
```

**接口**: `order.cancel`

**取消条件**:
- 仅可在以下状态取消：`pending_payment`、`pending`、`confirmed`
- 支付后取消需走退款流程

---

## 7. 订单数据模型

```json
{
  "_id": "订单ID",
  "bookingId": "预约ID(可选)",
  "userOpenid": "雇主OpenID",
  "workerId": "阿姨ID",
  "serviceType": "服务类型",
  "serviceSchedule": "服务时间安排",
  "startDate": "开始日期",
  "endDate": "结束日期",
  "address": "服务地址",
  "contactName": "联系人",
  "contactPhone": "联系电话",
  "remark": "备注",
  "price": "订单价格",
  "status": "订单状态",
  "paymentStatus": "支付状态(unpaid/paid)",
  "monthlySalary": "月薪",
  "agencyFeeMonths": "中介费月数",
  "agencyFeeBase": "中介费基准",
  "discountFactor": "折扣因子",
  "agencyFee": "中介费",
  "firstMonthSalary": "首月工资",
  "payableTotal": "应付总额",
  "paidAmount": "已付金额",
  "contractSigned": "是否签合同",
  "contractSignedAt": "签约时间",
  "outTradeNo": "微信支付订单号",
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

---

## 8. 相关文件

| 文件 | 说明 |
|------|------|
| `cloudfunctions/order/index.js` | 订单云函数（核心业务逻辑） |
| `miniprogram/utils/constants.js` | 订单/预约状态常量定义 |
| `miniprogram/pages/orders/orders.js` | 订单列表页 |
| `miniprogram/packageB/pages/order-detail/order-detail.js` | 订单详情页 |
| `miniprogram/components/order-card/order-card.js` | 订单卡片组件 |
| `database_v2/orders.json` | 订单数据库结构 |

---

## 9. 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                         订单全流程                               │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
  │   预约      │────▶│   面试通过      │────▶│   签署合同       │
  │ (booking)  │     │(interview_pass)│     │(contractSigned)  │
  └─────────────┘     └─────────────────┘     └────────┬─────────┘
                                                        │
                                                        ▼
  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
  │   已取消    │◀────│  待支付/待服务  │────▶│   服务中        │
  │ (cancelled)│     │(pending_payment│     │(serving)         │
  └─────────────┘     │   /pending)    │     └────────┬─────────┘
                      └────────┬────────┘              │
                               │                        │
                               ▼                        ▼
                      ┌─────────────────┐     ┌──────────────────┐
                      │   支付成功      │────▶│   已完成         │
                      │ (confirmPaid)  │     │ (completed)      │
                      └─────────────────┘     └──────────────────┘

说明:
- 从预约创建订单时，初始状态为 pending_payment
- 直接创建订单时，初始状态为 pending
- 只有 pending_payment/pending/confirmed 状态可取消
```
