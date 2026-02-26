# 图片资源说明

本目录包含小程序所需的图片资源文件。

## 文件列表

### 轮播图
- `banner1.jpg` - 首页轮播图1：保姆服务
- `banner2.jpg` - 首页轮播图2：育儿嫂服务
- `banner3.jpg` - 首页轮播图3：月嫂服务

### 默认头像
- `default-avatar.png` - 默认用户头像（当用户未上传头像时显示）
- `share.png` - 分享图标

### 阿姨头像
- `worker-1.jpg` - 阿姨头像1（王秀芳）
- `worker-2.jpg` - 阿姨头像2（李桂英）
- `worker-3.jpg` - 阿姨头像3（张美华）
- `worker-4.jpg` - 阿姨头像4（陈雅琴）
- `worker-5.jpg` - 阿姨头像5（刘小红）

## 使用方式

在小程序代码中引用图片：

```wxml
<!-- WXML 文件中 -->
<image src="/images/banner1.jpg" mode="aspectFill"/>
<image src="/images/default-avatar.png" mode="aspectFill"/>
<image src="/images/worker-1.jpg" mode="aspectFill"/>
```

```js
// JS 文件中
const bannerImage = '/images/banner1.jpg';
```

## 注意事项

1. 所有图片已针对小程序进行优化
2. 建议使用 `mode="aspectFill"` 保持图片比例
3. 头像图片建议使用正方形尺寸
4. 轮播图建议使用 16:9 比例
