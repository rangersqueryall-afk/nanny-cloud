# 数据库 Mock 数据

本目录包含小程序所需的 Mock 数据，可以直接导入到云开发数据库中使用。

## 数据文件说明

| 文件 | 集合名 | 说明 |
|------|--------|------|
| workers.json | workers | 阿姨/家政服务人员数据 |
| orders.json | orders | 订单数据 |
| reviews.json | reviews | 用户评价数据 |
| serviceTypes.json | serviceTypes | 服务类型数据 |
| banners.json | banners | 首页轮播图数据 |

## 导入方法

### 方法一：通过云开发控制台导入（推荐）

1. 打开微信开发者工具，点击"云开发"按钮进入云开发控制台
2. 点击"数据库"标签
3. 创建集合（如果不存在）：
   - 点击"添加集合"
   - 输入集合名称（如：workers）
   - 点击"确定"
4. 导入数据：
   - 点击集合名称进入集合详情
   - 点击"导入"按钮
   - 选择对应的 JSON 文件
   - 点击"导入"

### 方法二：通过云函数批量导入

如果数据量较大，可以编写云函数批量导入数据。示例代码：

```javascript
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

// 导入 workers 数据
const workersData = require('./workers.json').data;

exports.main = async () => {
  const collection = db.collection('workers');
  
  for (const item of workersData) {
    await collection.add({ data: item });
  }
  
  return { success: true, message: '导入成功' };
};
```

## 数据说明

### workers 集合

阿姨/家政服务人员数据，包含以下字段：
- `name`: 姓名
- `avatar`: 头像
- `age`: 年龄
- `hometown`: 籍贯
- `experience`: 工作经验（年）
- `serviceTypes`: 服务类型数组（babysitter/nanny/maternity/hourly/elderly）
- `price`: 价格（daily-日薪，monthly-月薪）
- `skills`: 技能数组
- `phone`: 联系电话（脱敏）
- `bio`: 个人简介
- `rating`: 评分（1-5）
- `reviewCount`: 评价数量
- `orderCount`: 订单数量
- `isVerified`: 是否已认证
- `isPublic`: 是否公开
- `status`: 状态（available-可预约，offline-离线，busy-忙碌）

### orders 集合

订单数据，包含以下字段：
- `userOpenid`: 用户openid
- `workerId`: 阿姨ID
- `serviceType`: 服务类型
- `startDate`: 开始日期
- `endDate`: 结束日期
- `address`: 服务地址
- `contactName`: 联系人姓名
- `contactPhone`: 联系人电话
- `remark`: 备注
- `price`: 订单价格
- `status`: 订单状态（pending-待确认，confirmed-已确认，in_service-服务中，completed-已完成，cancelled-已取消）

### reviews 集合

用户评价数据，包含以下字段：
- `workerId`: 阿姨ID
- `userOpenid`: 用户openid
- `userNickname`: 用户昵称
- `userAvatar`: 用户头像
- `rating`: 评分（1-5）
- `content`: 评价内容
- `tags`: 标签数组

### serviceTypes 集合

服务类型数据，包含以下字段：
- `id`: 类型ID
- `name`: 类型名称
- `icon`: 图标
- `description`: 描述
- `priceRange`: 价格范围
- `sortOrder`: 排序顺序
- `isActive`: 是否启用

### banners 集合

首页轮播图数据，包含以下字段：
- `imageUrl`: 图片地址
- `title`: 标题
- `subtitle`: 副标题
- `link`: 跳转链接
- `sortOrder`: 排序顺序
- `isActive`: 是否启用
