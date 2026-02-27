# Profile Editor

本地可视化编辑器，用于修改 `_config.yml` 里的个人信息字段。

## 启动

在仓库根目录运行：

```bash
npm run profile:editor
```

默认地址：`http://127.0.0.1:4310`

## 功能

- 读取当前配置（站点信息 / 个人信息 / 社交链接）
- 表单可视化编辑
- 保存后自动回写 `_config.yml`
- 每次保存自动备份到 `.profile-editor-backups/`

## 注意

- 保存 `_config.yml` 后，需要重启 `jekyll serve` 才会生效。
