# 云函数部署说明

## 目录结构
```
cloudfunctions/
  └── login/
      ├── index.js      # 云函数入口文件
      ├── package.json  # 依赖配置
      └── config.json   # 权限配置
```

## 部署步骤

1. 在微信开发者工具中，右键点击 `cloudfunctions/login` 文件夹
2. 选择「上传并部署：云端安装依赖」
3. 等待部署完成

## 环境配置

确保 `project.config.json` 中配置了云函数目录：
```json
{
  "cloudfunctionRoot": "miniprogram/cloudfunctions/"
}
```

## 测试

部署成功后，可以在小程序中调用：
```javascript
wx.cloud.callFunction({
  name: 'login',
  data: {},
  success: res => {
    console.log('openid:', res.result.openid)
  }
})
```

