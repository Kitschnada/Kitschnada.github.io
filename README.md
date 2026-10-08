# Liu Muqing

个人主页，基于 Jekyll。深色背景、三维莫比乌斯曲面与光影动效，保留个人资料、论文、项目、博客和简历。`/` 与 `/home/` 均直接进入主页。

支持拖动旋转、场景配色、暂停与重置；首页没有顶部导航条。悬停于三维曲面或点击环心的导航按钮，曲面展开为五片，显示首页、文章、作品、简历、关于五个入口；手机点击展开。内页使用角落折叠菜单。作品卡片响应鼠标倾斜。按 `⌘/Ctrl + K` 搜索页面与文章。可切换深浅主题和中英文，复制联系邮箱。小屏幕、键盘导航、减少动态效果和无脚本浏览均有对应支持。

## 本地预览

```sh
bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

打开 <http://127.0.0.1:4000>。修改配置后需要重启服务。

```sh
bundle exec jekyll build
```

静态产物位于 `_site/`；继续使用现有 GitHub Pages 发布方式。

## 内容维护

- 个人资料：`_config.yml`，或运行 `npm run profile:editor` 打开本地编辑器。
- 博客：`_posts/`，用 `channel: life` 或 `channel: academic` 区分。
- 论文：`_publications/`，自动进入学术栏目和最新内容。
- 学习／分享：`_teaching/`、`_talks/`。
- 项目：`_data/projects.yml`。
- 页面标题：`_data/page_titles.yml`。
- 首页结构：`_includes/home-landing.html`；视觉样式：`_sass/_experience.scss`、`_sass/_spatial.scss`。
- 场景与快捷导航：`assets/js/experience.js`；语言、主题及通用交互：`assets/js/garden.js`。
- 卡片倾斜：`assets/js/spatial.js`。
- 环上导航与内页菜单：`_includes/ring-navigation.html`、`_includes/masthead.html`、`_sass/_navigation-experience.scss`、`assets/js/navigation.js`。

写作格式和内容目录见 [维护指南](docs/WRITING.md)。浏览器验收与截图说明见 [tests/README.md](tests/README.md)。

网站保留 Jekyll / [Academic Pages](https://github.com/academicpages/academicpages.github.io) 的内容基础。原主题与本仓库的 MIT 许可见 [LICENSE](LICENSE)。
