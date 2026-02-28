# 预约到订单流程设计（V1）

## 1. 目标

统一雇主、阿姨、平台在「预约 -> 面试 -> 下单 -> 服务」中的状态流转与接口规范，避免越权、状态错乱、重复预约等问题。

## 2. 角色定义

- 雇主：发起预约、取消/终止预约、面试通过后提交订单（签合同）。
- 阿姨：处理预约（接受/拒绝）。
- 平台：安排面试、确认面试结果。

## 3. 数据模型

### 3.1 bookings（预约）

必填字段：

- `_id`
- `employerOpenid`
- `workerId`
- `workerName`
- `workerAvatar`
- `contactName`
- `contactPhone`
- `serviceType`
- `startDate`
- `duration`
- `dailyHours`
- `address`
- `totalPrice`
- `status`
- `createdAt`
- `updatedAt`

推荐字段：

- `rejectReason`
- `platformNote`
- `interviewTime`
- `orderId`
- `contractSigned`
- `statusHistory`（数组，记录每次流转：`from/to/operator/operatorRole/time/remark`）

### 3.2 orders（订单）

必填字段：

- `_id`
- `bookingId`
- `userOpenid`
- `workerId`
- `serviceType`
- `startDate`
- `endDate`
- `address`
- `contactName`
- `contactPhone`
- `price`
- `status`
- `createdAt`
- `updatedAt`

推荐字段：

- `contractSigned`
- `contractSignedAt`

## 4. 状态机

### 4.1 预约状态（bookings.status）

- `pending`：雇主已提交，待阿姨处理
- `accepted`：阿姨已接受，待平台安排面试
- `rejected`：阿姨已拒绝（雇主可见、阿姨默认隐藏）
- `interview_scheduled`：平台已安排面试
- `interview_passed`：面试通过，待雇主提交订单
- `interview_failed`：面试未通过
- `order_created`：已转订单
- `cancelled_by_employer`：雇主取消
- `terminated`：预约终止

### 4.2 订单状态（orders.status）

- `pending`：待服务（未到开始日期）
- `in_service`：服务中（已到开始日期）
- `completed`：已完成
- `cancelled`：已取消

## 5. 状态流转规则

- `pending -> accepted/rejected/cancelled_by_employer`
- `accepted -> interview_scheduled/terminated`
- `interview_scheduled -> interview_passed/interview_failed/terminated`
- `interview_passed -> order_created/terminated`
- `order_created` 为预约终态（仅可查看）

禁止：

- 已终态（`rejected/interview_failed/cancelled_by_employer/terminated/order_created`）再次流转
- 未到 `interview_passed` 不允许创建订单

## 6. 预约冲突规则

创建预约时校验阿姨是否已被占用：

- 同一 `workerId` 存在 `pending/accepted/interview_scheduled/interview_passed` 状态预约时，不允许新建预约
- 返回错误：`该阿姨已被预约，请选择其他阿姨或稍后再试`

## 7. 接口规范（云函数）

以下沿用已有 `worker`、`order` 云函数风格：`{ action, data }`。

### 7.1 worker.bookWorker（雇主创建预约）

入参：

- `workerId`
- `serviceType`
- `startDate`
- `duration`
- `dailyHours`
- `contactName`
- `contactPhone`
- `address`
- `remark`
- `totalPrice`

行为：

- 校验用户存在
- 校验阿姨存在
- 校验占用冲突
- 创建 booking，状态 `pending`

返回：

- `bookingId`

### 7.2 worker.getMyBookings（雇主视角预约列表）

入参：

- `page`
- `limit`

行为：

- 查询 `employerOpenid == OPENID`
- 按 `createdAt desc`

### 7.3 worker.cancelBooking（雇主取消预约）

入参：

- `bookingId`

行为：

- 仅雇主本人可操作
- 仅 `pending/accepted/interview_scheduled/interview_passed` 可取消
- 更新为 `cancelled_by_employer`

### 7.4 worker.getWorkerBookings（阿姨视角预约列表）【新增】

入参：

- `page`
- `limit`

行为：

- 根据当前用户 `workerId` 查询预约
- 默认过滤掉 `rejected`（阿姨拒绝后隐藏）

### 7.5 worker.acceptBooking（阿姨接受预约）【新增】

入参：

- `bookingId`

行为：

- 仅该预约所属阿姨可操作
- 仅 `pending` 可接受
- 更新 `status = accepted`
- 写入状态历史

### 7.6 worker.rejectBooking（阿姨拒绝预约）【新增】

入参：

- `bookingId`
- `reason`（可选）

行为：

- 仅该预约所属阿姨可操作
- 仅 `pending` 可拒绝
- 更新 `status = rejected`，记录 `rejectReason`

### 7.7 worker.platformScheduleInterview（平台安排面试）【新增，平台端】

入参：

- `bookingId`
- `interviewTime`
- `platformNote`

行为：

- 仅平台角色可操作
- `accepted -> interview_scheduled`

### 7.8 worker.platformSetInterviewResult（平台设置面试结果）【新增，平台端】

入参：

- `bookingId`
- `passed`（bool）
- `platformNote`

行为：

- 仅平台角色可操作
- `interview_scheduled -> interview_passed/interview_failed`

### 7.9 order.createFromBooking（雇主提交订单并签合同）【新增】

入参：

- `bookingId`
- `contractSigned`（bool，必须 true）

行为：

- 仅预约雇主可操作
- 仅 `interview_passed` 可转单
- 创建订单
- 订单状态：
  - `now < startDate` => `pending`
  - `now >= startDate` => `in_service`
- 回写 booking：
  - `status = order_created`
  - `orderId`
  - `contractSigned = true`

返回：

- `orderId`

## 8. 页面行为规范

### 8.1 雇主「我的预约」卡片按钮

- `pending`：取消预约
- `accepted/interview_scheduled/interview_passed`：终止预约
- `interview_passed`：提交订单（签合同）
- `rejected`：仅展示状态“已被拒绝”
- `order_created`：展示“已转订单”，可跳订单详情

### 8.2 阿姨「我的预约」卡片按钮

- `pending`：接受、拒绝
- `accepted/interview_scheduled/interview_passed`：只读查看
- `rejected`：默认不显示

## 9. 关键校验清单

- 所有状态变更必须校验当前状态
- 所有写操作必须校验操作者身份
- 拒绝重复预约时只看“有效占用状态”
- `createFromBooking` 必须绑定合同签署标记

## 10. 实施顺序建议

1. 先实现后端状态机与 5 个核心接口：
   - `acceptBooking`
   - `rejectBooking`
   - `getWorkerBookings`
   - `cancelBooking`（增强状态校验）
   - `createFromBooking`
2. 再实现雇主端与阿姨端预约列表按钮逻辑
3. 最后接平台端面试操作接口与页面
