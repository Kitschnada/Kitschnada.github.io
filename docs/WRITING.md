# 写作与维护

## 预览与发布

运行 `bundle exec jekyll serve --host 127.0.0.1 --port 4000`，打开 http://127.0.0.1:4000。修改 `_config.yml` 后重启。
运行 `bundle exec jekyll build` 检查构建；确认后自行提交并推送到现有 GitHub Pages 分支。网站没有新增后端或部署服务。

## 首页与页面导航

`/` 与 `/home/` 使用同一份主页模板 `_includes/home-landing.html`，直接展示个人资料、互动光影、研究与作品、最近三篇更新和联系方式。导航中的「首页」返回 `/home/`。

文章、作品、简历、关于是独立页面。首页悬停于三维曲面或点击环心导航按钮展开五个入口；内页使用角落折叠菜单。文章目录包含全部文章、生活、学术、学习、分享，对应 `/blogs/`、`/blogs/life/`、`/blogs/academic/`、`/blogs/study/`、`/blogs/sharing/`。导航支持点击、键盘 Enter、Escape 收起。原 `/teaching/`、`/talks/` 自动跳转到对应子目录。作品页为 `/portfolio/`，简历为 `/cv/`，个人资料与联系方式为 `/profile/`，论文列表为 `/publications/`。

学习内容继续维护在 `_teaching/`，分享内容在 `_talks/`；单篇永久链接不变。两类内容一并进入文章总览和首页最近三篇，按日期倒序。栏目标题在 `_data/page_titles.yml` 维护，导航名称与链接在 `_data/navigation.yml` 维护。

首次访问默认为中文和深色主题；主题与语言选择跨页面保存。点击搜索按钮或按 `⌘ K` / `Ctrl K` 可打开快速跳转，按页面或文章标题筛选；方向键选择、Enter 打开、Escape 关闭。

## 日常博客与学术博客

在 `_posts/` 新增 `YYYY-MM-DD-slug.md`。两类文章使用同一份 Markdown 格式：

```yaml
---
title: "书页之间"
date: 2026-09-25
channel: life
lang: zh-CN
tags: [阅读]
excerpt: "这篇文章的简短介绍。"
---
```

下方写正文。这个片段只是格式示例，不会作为文章发布。

- `channel: life` 是生活，`channel: academic` 是学术；省略时归入生活。
- `channel` 不参与网址生成。修改栏目不会改变文章链接。
- 保留既有 Jekyll 网址规则；`categories` 会影响网址，不应当作 life/academic 的替代字段。
- 自定义 `permalink` 时使用目录形式（如 `/notes/example/`）或明确的 `.html` 后缀。省略目录末尾 `/` 会导致输出文件与链接不一致，在普通静态服务上返回 404。
- 首页合并显示最近三条博文、论文、学习或分享，不分栏目；文章全部页与生活、学术页分别显示完整列表，均按日期倒序。
- 支持短随笔、长文、照片、引用、代码和数学公式；英文文章使用 `lang: en`。
- 为文章选择准确的图片替代文字；站内图片使用 `{{ '/images/photo.jpg' | relative_url }}`，以兼容子路径部署。
- 两份模板在 `_drafts/`。写好后移入 `_posts/` 并去掉 `published: false`。
- 需要预览尚未发布的草稿时运行 `bundle exec jekyll serve --drafts --unpublished`；这一预览开关不用于正式发布。

可以通过 Markdown 插入图片，也可使用以下带说明的写法：

```html
<figure>
  <img src="{{ '/images/photo.jpg' | relative_url }}" alt="具体描述照片">
  <figcaption>照片说明。</figcaption>
</figure>
```

## 论文与作品

论文继续放在 `_publications/`。论文条目自动与学术博文合并排序，保留作者、会议及 Paper/BibTeX 链接，不必复制到博客目录。FlexLoRA 使用 `/publication/2026-02-27-FlexLoRA/`，输出对应目录的 `index.html`；旧无后缀网址由静态服务器补全末尾 `/`，旧 `.html` 网址通过 `redirect_from` 跳转到新地址。

作品在 `_data/projects.yml` 维护：`title`、`title_en`、`description`、`description_en`、`category`、`tags`、`url`。首页展示最新论文与数据文件中的第一项作品，作品页展示全部作品及已有的 portfolio collection 条目。

## 个人资料与中英文

`_config.yml` 的 `author` 中包含：

- `name` / `name_zh`：英文／中文姓名。
- `bio` / `bio_zh`：英文／中文简介。
- `employer` / `employer_zh`：英文／中文学校或机构。
- `location`：首页姓名上方的附加资料。
- `email`、`github`、`googlescholar`：联系与主页链接。

运行 `npm run profile:editor`，默认打开 http://127.0.0.1:4100，可直接编辑上述字段。

首页与公共界面支持中英文，文章保留原文。双语标签使用 `_includes/garden-text.html`；姓名、简介和学校的空中文字段回退到对应英文值。公共文案仅保留标题、导航与功能说明。

## 视觉与交互维护

`assets/css/main.scss` 先载入 `_sass/_garden.scss` 的基础阅读、文章和通用组件样式，再载入 `_sass/_experience.scss` 的主题与页面布局，接着载入 `_sass/_navigation-experience.scss` 的环上分片导航与内页角落菜单，最后载入 `_sass/_spatial.scss` 的首页空间构图。

`assets/js/garden.js` 负责主题、语言、分类菜单与复制邮箱；`assets/js/experience.js` 负责 WebGL 光影、配色、动画开关、拖动视角、滚动显示和快速跳转。脚本由 `_includes/scripts.html` 加载，不依赖前端框架。

`assets/js/navigation.js` 负责导航展开、触屏与键盘操作、图标名称同步和分片标签定位。首页顶部留空，搜索、语言和主题控制位于首屏底部；滚过首屏后显示小型快速导航入口。环上的五个链接在悬停或点击导航按钮后显示，按 Escape 收起，禁用脚本时始终显示。导航文案和链接继续维护在 `_data/navigation.yml`。`assets/js/spatial.js` 负责作品卡片的鼠标倾斜，仅在允许动效且使用精确指针时启用。

首页使用双面、半圈扭转的莫比乌斯曲面。导航展开时，曲面分为五个独立网格片段，停止自动旋转并回到稳定视角，聚焦某个入口时高亮对应片段。关闭导航后恢复原视角。曲面支持鼠标或触屏拖动，提供紫色、蓝色、银色配色，以及暂停／播放、重置视角按钮。移动端保留纵向滚动。系统启用 `prefers-reduced-motion` 时，光影初始暂停并减少进入和滚动动画；访客仍可主动播放。光影离开视口或浏览器页面隐藏时停止持续绘制。

禁用 JavaScript 或 WebGL 不可用时显示静态 SVG 环带，文章、资料和导航链接仍可访问。旧诗库、字体和庭院素材保留在仓库中存档，当前界面不加载这些资源，日常写作无需维护它们。

## 验收

运行仓库的浏览器验收脚本需要 Node.js、Playwright 和 Chromium。具体命令见 `tests/README.md`。

验收覆盖公开路由、旧链接、文章分类与排序、真实论文与项目链接、主题与语言记忆、移动导航、复制邮箱、光影配色与拖动、暂停与重置、快捷搜索、减少动态效果，以及禁用脚本或 WebGL 的降级显示。测试内容只在临时目录生成，不写入正式内容。
