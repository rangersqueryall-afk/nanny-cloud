# 阿姨快约 - 微信云开发版

保姆/育儿嫂中介小程序的微信云开发版本，无需搭建服务器，使用云函数、云数据库和云存储。

## 目录结构

```
nanny-cloud/
├── cloudfunctions/          # 云函数
│   ├── user/               # 用户相关（登录、信息、收藏）
│   ├── worker/             # 阿姨相关（列表、详情、收藏）
│   ├── order/              # 订单相关（创建、查询、状态更新）
│   ├── review/             # 评价相关（提交、查询）
│   └── home/               # 首页相关（轮播图、推荐、搜索）
├── miniprogram/            # 小程序前端
│   ├── pages/              # 页面
│   ├── components/         # 组件
│   ├── images/             # 图片资源
│   ├── utils/              # 工具函数
│   ├── app.js              # 应用入口
│   ├── app.json            # 应用配置
│   └── app.wxss            # 全局样式
├── database/               # 数据库初始化数据
│   ├── workers.json        # 阿姨数据
│   ├── banners.json        # 轮播图数据
│   ├── serviceTypes.json   # 服务类型数据
│   └── README.md           # 数据库配置说明
├── project.config.json     # 项目配置
└── README.md               # 本文件
```

## 快速开始

### 1. 创建云开发环境

1. 登录微信开发者工具
2. 点击工具栏的"云开发"按钮
3. 点击"创建环境"，输入环境名称（如 `nanny-dev`）
4. 记录环境 ID，后续会用到

### 2. 配置项目

1. 修改 `project.config.json` 中的 `appid` 为你自己的小程序 AppID
2. 修改 `miniprogram/app.js` 中的云开发环境 ID：

```javascript
wx.cloud.init({
  env: 'YOUR_ENV_ID',  // 替换为你的云开发环境ID
  traceUser: true
});
```

### 3. 部署云函数

#### 方式一：使用微信开发者工具（推荐）

1. 在微信开发者工具中，右键点击 `cloudfunctions/user` 文件夹
2. 选择"创建并部署：云端安装依赖"
3. 等待部署完成
4. 依次部署其他云函数：worker、order、review、home

#### 方式二：使用命令行

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
tcb fn deploy user
tcb fn deploy worker
tcb fn deploy order
tcb fn deploy review
tcb fn deploy home
```

### 4. 初始化数据库

1. 打开微信开发者工具，点击"云开发"按钮
2. 进入"数据库"标签
3. 依次创建以下集合：
   - `users` - 用户集合
   - `workers` - 阿姨集合
   - `orders` - 订单集合
   - `reviews` - 评价集合
   - `favorites` - 收藏集合
   - `banners` - 轮播图集合
   - `serviceTypes` - 服务类型集合

4. 设置集合权限：
   - `users`、`orders`、`favorites`：仅创建者可读写
   - `workers`、`reviews`、`banners`、`serviceTypes`：所有用户可读，管理员可写

5. 导入初始数据：
   - 在 `workers` 集合中导入 `database/workers.json`
   - 在 `banners` 集合中导入 `database/banners.json`
   - 在 `serviceTypes` 集合中导入 `database/serviceTypes.json`

### 5. 上传图片到云存储

1. 打开微信开发者工具，点击"云开发"按钮
2. 进入"存储"标签
3. 创建文件夹 `images`
4. 上传 `miniprogram/images/` 目录下的所有图片
5. 记录图片的 fileID，更新数据库中的图片路径

### 6. 运行小程序

1. 在微信开发者工具中点击"编译"
2. 预览或真机调试

## 云函数说明

### user 云函数

**actions:**
- `login` - 用户登录
- `getProfile` - 获取用户信息
- `updateProfile` - 更新用户信息
- `getFavorites` - 获取收藏列表

### worker 云函数

**actions:**
- `getList` - 获取阿姨列表（支持筛选、分页）
- `getDetail` - 获取阿姨详情
- `getReviews` - 获取阿姨评价
- `addFavorite` - 添加收藏
- `removeFavorite` - 取消收藏
- `checkFavorite` - 检查是否已收藏

### order 云函数

**actions:**
- `getList` - 获取订单列表
- `getDetail` - 获取订单详情
- `create` - 创建订单
- `cancel` - 取消订单
- `complete` - 确认完成订单

### review 云函数

**actions:**
- `getList` - 获取评价列表
- `create` - 创建评价
- `getTags` - 获取评价标签

### home 云函数

**actions:**
- `getBanners` - 获取轮播图
- `getRecommendations` - 获取推荐阿姨
- `getServiceTypes` - 获取服务类型
- `getStatistics` - 获取统计数据
- `search` - 搜索阿姨

## 数据库集合说明

### workers 集合

存储阿姨信息

```json
{
  "_id": "w001",
  "name": "王秀芳",
  "avatar": "/images/worker-1.jpg",
  "age": 45,
  "hometown": "安徽合肥",
  "experience": 8,
  "serviceTypes": ["babysitter", "nanny"],
  "price": { "daily": 280, "monthly": 7500 },
  "skills": ["婴儿护理", "辅食制作", "早教启蒙"],
  "rating": 4.9,
  "reviewCount": 128,
  "isVerified": true,
  "status": "available"
}
```

### orders 集合

存储订单信息

```json
{
  "_openid": "oXXXXX",
  "workerId": "w001",
  "serviceType": "babysitter",
  "startDate": "2024-03-01",
  "endDate": "2024-03-31",
  "address": "北京市朝阳区...",
  "contactName": "张三",
  "contactPhone": "13800138000",
  "price": 7500,
  "status": "pending",
  "createdAt": "2024-02-25T10:00:00Z"
}
```

**订单状态：**
- `pending` - 待确认
- `confirmed` - 待服务
- `in_service` - 服务中
- `completed` - 已完成
- `cancelled` - 已取消

## 前端调用示例

```javascript
const app = getApp();

// 调用云函数
app.callCloudFunction('worker', 'getList', {
  type: 'nanny',
  page: 1,
  limit: 10
})
.then(res => {
  console.log('阿姨列表:', res.data);
})
.catch(err => {
  console.error('调用失败:', err);
});
```

## 常见问题

### 1. 云函数调用失败

**问题：** 调用云函数时报错

**解决：**
1. 检查云函数是否已部署
2. 检查云开发环境ID是否正确配置
3. 查看云函数日志排查错误

### 2. 数据库权限错误

**问题：** 无法读取或写入数据

**解决：**
1. 检查集合权限设置
2. 用户数据集合应设置为"仅创建者可读写"
3. 公共数据集合应设置为"所有用户可读"

### 3. 图片无法显示

**问题：** 图片加载失败

**解决：**
1. 检查图片是否已上传到云存储
2. 检查图片路径是否正确
3. 建议使用云存储的 fileID

## 开发注意事项

1. **云函数调试**：可以在微信开发者工具中右键点击云函数选择"本地调试"
2. **数据库索引**：建议为常用查询字段创建索引，提高查询性能
3. **图片存储**：建议使用云存储，并设置合适的权限
4. **数据安全**：敏感操作（如支付）需要添加安全验证
5. **性能优化**：列表查询建议使用分页，避免一次性返回大量数据

## 升级指南

### 从原服务器版本升级

1. 备份原有数据
2. 创建云开发环境
3. 部署云函数
4. 迁移数据到云数据库
5. 上传图片到云存储
6. 替换前端 API 调用为云函数调用

## 技术支持

- 微信云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 云函数文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/functions.html
- 云数据库文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/database.html

## License

MIT
