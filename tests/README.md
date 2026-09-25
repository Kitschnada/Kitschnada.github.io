# 浏览器验收

需要 Ruby/Bundler、Node.js 18+、Python 的 fonttools（用于字体覆盖核对）。

```sh
npm install
npx playwright install chromium
npm run test:site
```

已有 Chromium 时，可用 `GARDEN_CHROMIUM=/path/to/chrome npm run test:site`。
字体检查依赖可用 `python3 -m pip install 'fonttools[woff]'` 安装。

脚本自行构建站点、启动临时 HTTP 服务，并在临时目录创建测试文章和诗库变体；结束后自动清理。不会改动正式博客或诗库。

截图及 `verification.json` 保存在被 Git 忽略的 `local/previews/`。内容涵盖四档主页宽度、月亮入口、蓝黑夜庭、博客分类下拉及独立页面、主要内页、旧路由、语言与主题记忆、菜单、无脚本、存储/字体/剪贴板失败、博客分类和排序、图文公式、25 条中日诗句逐条抽取、无诗句外链、诗库空值与安全转义、鼠标视差与墨晕、减少动态模式。

数学公式呈现检查需要访问 MathJax CDN。新资料编辑器字段由原编辑器读写机制维护。
