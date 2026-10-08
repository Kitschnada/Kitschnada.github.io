# 浏览器验收

需要 Ruby/Bundler 与 Node.js 18+。

```sh
bundle install
npm install
npx playwright install chromium
npm run test:site
```

已有 Chromium 时，可用 `GARDEN_CHROMIUM=/path/to/chrome npm run test:site`。
只复查某组时，可用 `GARDEN_CHECK=WebGL npm run test:site` 按名称筛选；用 `GARDEN_ARTIFACTS` 指定独立目录可保留上次完整报告。

脚本自行构建 Jekyll 站点、启动临时 HTTP 服务，并在临时副本中创建测试文章；结束后自动清理。不会改动正式内容。HTTP 服务只返回实际文件或目录中的 `index.html`，不为不存在的地址补上 `.html`，因此能够发现静态托管上的路径错误。

覆盖：首页直接访问、真实论文与项目链接、三种场景配色、暂停和拖动、重置、快捷搜索及键盘操作、语言与主题记忆、手机点击展开环上导航、邮箱复制、禁用 JavaScript、WebGL 不可用或首次绘制失败、存储与剪贴板拒绝、减少动态效果。内容检查涵盖公开路由、旧链接重定向、站内资源、子路径部署、分类和排序，以及长标题、图文、代码、公式和相邻文章。正式文章与论文还会从首页、文章目录和快捷搜索逐一点击，确认页面在严格静态托管下实际打开。

截图涵盖 1440、1024、768、390、320 像素宽度的深浅两种主页主题，以及桌面和移动端主要内页；同时检查横向溢出。截图与 `verification.json` 保存到被 Git 忽略的 `local/previews/`，可用 `GARDEN_ARTIFACTS` 指定目录。

公式渲染检查需要访问 MathJax CDN；三维场景使用 Chromium 的软件 WebGL，以便在无 GPU 环境运行。

新导航的独立验收：

```sh
npm run test:navigation
```

脚本默认自行构建并启动严格静态服务。已有预览时可用 `NAV_ORIGIN=http://127.0.0.1:4000 node tests/navigation.cjs`；指定浏览器使用 `NAV_CHROMIUM=/path/to/chrome`（也接受 `GARDEN_CHROMIUM`）。`NAV_CHECK` 按检查名称筛选，`NAV_ARTIFACTS` 指定截图与报告目录，默认 `local/previews/integrated-navigation/`。

导航检查覆盖鼠标悬停中央莫比乌斯环后出现的五个入口、实际页面跳转与内页返回、键盘和触屏展开、Escape 与点击外部收起、收起后链接不能获得焦点、快捷搜索和焦点恢复。还验证无 JavaScript 的真实链接、无 WebGL 的静态导航、减少动态效果，以及顶部独立导航已经移除。

1440、1024、768、390、320 像素宽度与深浅两种主题均检查展开后的图标触控区域至少 44 × 44 像素、互不重叠、位于屏内且页面没有横向溢出。320 × 568 与 900 × 412 的短屏额外验证页面入口和内页菜单仍可点击。所有截图使用独立浏览器上下文，避免软件 GPU 在跨尺寸捕获时残留旧的合成图层。

导航截图保存首屏的收起与展开状态，以及滚动浏览全部首页内容后返回顶部的长截图；覆盖减少动态效果的全部尺寸，以及正常动效的桌面与手机版。暂停状态下还会隐藏 HTML 图标层，比较三维画布在展开和选中入口前后的截图，确认曲面本身确实分段并响应选中状态。
