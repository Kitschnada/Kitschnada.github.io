# 写作与维护

## 预览与发布

运行 `bundle exec jekyll serve --host 127.0.0.1 --port 4000`，打开 http://127.0.0.1:4000。修改 `_config.yml` 后重启。
运行 `bundle exec jekyll build` 检查构建；确认后自行提交并推送到现有 GitHub Pages 分支。网站没有新增后端或部署服务。

## 入口与页面导航

`/` 是月亮入口，点击月亮或用键盘 Enter 进入 `/home/`。入口是普通链接，禁用脚本仍可使用。站内姓名和「庭中」都返回 `/home/`，不会强制重复进入封面；页脚「庭门」可以返回封面。

主页只显示简介、随机诗句和最近三篇文章。近笺、作品、简历、关于是独立页面，通过顶部导航切换。近笺下拉菜单包含全部文章、生活、学术、学习、分享，对应 `/blogs/`、`/blogs/life/`、`/blogs/academic/`、`/blogs/study/`、`/blogs/sharing/`；支持点击、键盘 Enter、Escape 收起。原 `/teaching/`、`/talks/` 自动跳转到新子目录。联系方式在 `/profile/`。

学习内容继续维护在 `_teaching/`，分享内容在 `_talks/`；单篇永久链接不变。两类内容一并进入近笺总览和首页最近三篇，按日期倒序。站点目录页和 RSS 已移除。各栏目篇首语统一在 `_data/page_titles.yml` 修改。

宣纸为首次访问默认主题；夜庭为蓝黑色。主题与语言选择跨页面保存。

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
- 首页合并显示最近三条博文、论文、学习或分享，不分栏目；博客全部页与生活、学术页分别显示完整列表，均按日期倒序。
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

论文继续放在 `_publications/`。论文条目自动与学术博文合并排序，保留原网址、作者、会议及 Paper/BibTeX 链接，不必复制到博客目录。

作品在 `_data/projects.yml` 维护：`title`、`title_en`、`description`、`description_en`、`category`、`tags`、`url`。首页和作品页共用这份数据。已有 portfolio collection 条目也会显示。

## 增删随机诗句

只需编辑 `_data/poems.yml`：

```yaml
- text: |
    溪深水声远，
    山高月色迟。
  author: 日本·良宽
  title: 秋夜偶作
  source: https://entsuji-kurashiki.jp/ryoukan.html
```

`text` 是要展示的诗句；`|` 后的换行会保留。`author` 和 `title` 显示为署名；`source` 仅供维护时核对出处，页面不提供诗句外链。英文诗句增加 `lang: en`，保留原文与斜体样式；省略时按中文展示。
每次打开或刷新 `/home/` 随机选一条；阅读、语言切换和主题切换不会重新抽取。禁用 JavaScript 时显示首条有效诗句。没有诗句时题句区域隐藏。

现有 25 条诗句：20 条中国古典诗词与 5 条日本汉诗。中国诗词偏取六朝山水、唐人幽居与宋人清词；日本汉诗收录良宽、菅原道真、菅茶山与夏目漱石，以夜雨、苔纹、花影、秋声与幽庭为意象。出处仅保存在数据文件中供维护者核对，不输出到前端诗库，也不生成外链。齐伋体会把部分简体字呈现为传统字形，实际文本没有自动简繁转换。源字体缺少的字由朱雀仿宋和系统宋体依次补足。

正常增删诗句、写博客都不需要重建字体。

## 个人资料与中英文

`_config.yml` 的 `author` 中包含：
- `name` / `name_zh`：英文／中文姓名。
- `bio` / `bio_zh`：英文／中文简介。
- `employer` / `employer_zh`：英文／中文学校或机构。
- `email`、`github`、`googlescholar`：联系与主页链接。

运行 `npm run profile:editor`，默认打开 http://127.0.0.1:4100，可直接编辑上述字段。空中文字段回退到对应英文值。

首页与公共界面支持中英文。诗句和文章保留原文，英文诗句也不会随界面切换而翻译；主题与语言在浏览器内保存。首次访问为中文宣纸主题。

## 字体来源与重建

- [齐伋体 0.0.4](https://github.com/LingDong-/qiji-font/releases/tag/0.0.4)：源文件 `qiji.ttf`，黄令东制作，SIL OFL 1.1。
- [朱雀仿宋 0.212](https://github.com/TrionesType/zhuque/releases/tag/v0.212)：源文件 `ZhuqueFangsong-Regular.ttf`，璇玑造字制作，SIL OFL 1.1；该上游版本为预览版。

诗句原文（`.hero-poem blockquote`）与「月下庭院」站名题字（`.signature-title`、`.gate-inscription > span`）使用齐伋体；姓名、导航、其余题签、各级标题、正文、日期和署名均优先使用朱雀仿宋，代码保留等宽字体。英文字母同样优先使用朱雀仿宋内含字形，缺字时依字体栈回退。

字体和许可存放于 `assets/fonts/garden/`。网页衍生字体分别命名为 Garden Qiji 与 Garden Zhuque，保留上游版权信息，并遵循保留名称要求。

需要升级字体时，下载上述源文件与各自的 LICENSE 到一个本地目录，将许可分别命名为 `qiji-LICENSE.txt` 与 `zhuque-LICENSE.txt`，然后运行：

```sh
python3 -m pip install 'fonttools[woff]'
python3 scripts/build_garden_fonts.py /path/to/font-sources
bundle exec jekyll build
```

生成器把当前页面常用字符放入 core 分片，其余字符按 Unicode 区间分片。所有源字体字符都被保留，浏览器只下载实际需要的文件。`manifest.json` 记录覆盖数和体积。字体加载失败时仍可使用系统宋体阅读。

## 验收

运行仓库的浏览器验收脚本需要 Node.js、Playwright 和 Chromium。具体命令见 `tests/README.md`。
验收覆盖主题、语言、菜单、博客分类、诗库边界、旧链接、复制邮箱及手机布局。测试文章与诗库变体只在临时目录生成，不写入正式内容。


## 册页视觉与交互

`_sass/_courtyard.scss` 定义双线版框、竖排题签和册页式导航；`assets/art/ink-landscape.svg` 与 `ink-branch.svg` 为本地淡墨山水及疏枝。首页姓名、简介与诗句保持横排，山水在文字下方独立排布；长文保持横排阅读，移动端按宽度调整版式。

精细鼠标移动时，庭门与首页的山水、月光产生轻微位移；悬停文章时显示墨线，点击正文之外的纸面空白处出现短暂墨晕。触屏、减少动态模式与禁用脚本时保持静态，所有导航均支持键盘。
