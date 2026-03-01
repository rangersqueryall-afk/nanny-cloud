# 数据库示例（V2）

本目录数据按当前代码逻辑生成，重点覆盖以下集合：

- `workers`
- `users`
- `bookings`
- `orders`

## 字段口径说明

### workers（与 cloudfunctions/worker + cloudfunctions/user 对齐）

关键字段：

- `_id`
- `name`
- `avatar`
- `age`
- `hometown`
- `experience`
- `serviceTypes`（建议：`babysitter/nanny/maternity/elderly/hourly`）
- `price.daily`
- `price.monthly`
- `skills`
- `phone`
- `bio`
- `rating`
- `reviewCount`
- `orderCount`
- `isVerified`
- `isPublic`
- `status`（`available/offline`）
- `userOpenid`
- `acceptPreferences`
- `createdAt`
- `updatedAt`

### users（与 cloudfunctions/user + cloudfunctions/worker 的角色校验对齐）

关键字段：

- `_id`
- `openid`
- `nickname`
- `avatar`
- `phone`
- `role`（`user/worker/platform`）
- `workerId`（仅 `worker` 角色有值）
- `createdAt`
- `updatedAt`

### orders（与 cloudfunctions/order 对齐）

关键字段：

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
- `remark`
- `price`
- `status`（`pending/confirmed/in_service/completed/cancelled`）
- `contractSigned`
- `contractSignedAt`
- `createdAt`
- `updatedAt`

说明：

- 当前代码会在读取订单时，根据 `startDate` 自动把 `pending/confirmed` 且已到日期的订单更新为 `in_service`。

### bookings（与 cloudfunctions/worker + cloudfunctions/order.createFromBooking 对齐）

关键字段：

- `_id`
- `employerOpenid`
- `userOpenid`
- `userNickname`
- `userPhone`
- `workerId`
- `workerName`
- `workerAvatar`
- `workerPhone`
- `serviceType`
- `serviceMode`
- `startDate`
- `endDate`
- `duration`
- `dailyHours`
- `address`
- `totalPrice`
- `contactName`
- `contactPhone`
- `remark`
- `rejectReason`
- `platformNote`
- `interviewTime`
- `orderId`
- `contractSigned`
- `status`
- `statusHistory`
- `createdAt`
- `updatedAt`
