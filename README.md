# 月下庭院

本人的个人网站。点击月亮进入庭中，通过顶部导航翻阅近笺、作品、简历与关于。宣纸与蓝黑夜庭两套主题，配以古籍字形、枯枝、月窗和枯山水。

## 本地预览

```sh
bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

打开 <http://127.0.0.1:4000>，点击月亮进入；可直接访问 <http://127.0.0.1:4000/home/>。修改配置后需要重启服务。

```sh
bundle exec jekyll build
```

静态产物位于 `_site/`；继续使用现有 GitHub Pages 发布方式。

## 内容维护

完整说明见 [写作与维护指南](docs/WRITING.md)。

- 个人资料：`_config.yml`，或运行 `npm run profile:editor` 打开本地编辑器。
- 近笺博文：`_posts/`，用 `channel: life` 或 `channel: academic` 区分。
- 论文：`_publications/`，自动进入学术栏目。
- 学习／分享：`_teaching/`、`_talks/`，在近笺子目录中展示。
- 作品：`_data/projects.yml`。
- 栏目篇首语：`_data/page_titles.yml`。
- 随机诗库：`_data/poems.yml`，现有 20 条中国古诗词与 5 条日本汉诗，增删后重新发布即可。英文诗句增加 `lang: en`。
- 草稿模板：`_drafts/life-template.md`、`_drafts/academic-template.md`。
- 全站阅读样式：`_sass/_garden.scss`；入口与庭中：`_sass/_courtyard.scss`；交互：`assets/js/garden.js`。

## 字体与来源

诗句原文与「月下庭院」站名题字使用齐伋体；姓名、其余题签、导航、标题、正文及诗句署名统一优先使用朱雀仿宋，代码保留等宽字体。首页姓名保持横排。本地 WOFF2 分片保留完整源字体字符覆盖，新增文字会自动加载相应分片。字体来源、版本和构建说明见维护指南，许可证随字体一起保存。

网站保留 Jekyll / [Academic Pages](https://github.com/academicpages/academicpages.github.io) 的内容基础，视觉与布局已重建。原主题与本仓库的 MIT 许可见 [LICENSE](LICENSE)。
