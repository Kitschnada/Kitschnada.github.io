(function () {
  function mountHome() {
    var root = document.getElementById("home-app");

    if (!root || !window.Vue) {
      return;
    }

    var basePath = root.getAttribute("data-base-path") || "";
    var email = root.getAttribute("data-email") || "";

    if (basePath === "/") {
      basePath = "";
    }

    function withBase(path) {
      return basePath + path;
    }

    window.Vue.createApp({
      data: function () {
        return {
          lang: "zh",
          accentMode: false,
          activeTab: "all",
          copied: false,
          copyTimer: null,
          clockTimer: null,
          focusTimer: null,
          clockText: "--:--:--",
          focusIndex: 0,
          i18nMap: {
            zh: {
              kicker: "PERSONAL PAGE",
              heroLead: "你好，我是刘穆清。这是我的个人主页",
              ctaPortfolio: "查看项目",
              ctaCv: "查看 CV",
              ctaAccentA: "切换暖色主题",
              ctaAccentB: "切换冷色主题",
              langAria: "切换语言",
              glanceTitle: "实时工作面板",
              glanceDesc: "保持持续构建和公开迭代。",
              timeLabel: "当前时间",
              focusLabel: "当前焦点",
              statusLabel: "状态",
              statusValue: "Open to Collaborate",
              projectTitle: "项目工作台",
              projectDesc: "按主题筛选，快速了解每个方向的实战项目。",
              filterAria: "项目筛选",
              cardLink: "进入详情",
              skillTitle: "核心能力",
              skillDesc: "从问题定义到工程落地的一体化能力。",
              journeyTitle: "近期轨迹",
              contactTitle: "合作与联系",
              contactDesc: "如果你正在做 AI 产品、工程研究或前端体验优化，欢迎直接联系。",
              mailBtn: "发送邮件",
              copyBtn: "复制邮箱",
              copiedBtn: "已复制",
              metricProjects: "项目",
              metricSkills: "技能"
            },
            en: {
              kicker: "PERSONAL PAGE",
              heroLead: "Hi, I am Liu Muqing. This is my personal page.",
              ctaPortfolio: "View Portfolio",
              ctaCv: "View CV",
              ctaAccentA: "Switch warm palette",
              ctaAccentB: "Switch cool palette",
              langAria: "Switch language",
              glanceTitle: "Live Dashboard",
              glanceDesc: "Building continuously in public.",
              timeLabel: "Time",
              focusLabel: "Focus",
              statusLabel: "Status",
              statusValue: "Open to Collaborate",
              projectTitle: "Project Workbench",
              projectDesc: "Filter by domains to scan practical projects quickly.",
              filterAria: "Project filters",
              cardLink: "Open",
              skillTitle: "Core Capabilities",
              skillDesc: "From problem framing to production delivery.",
              journeyTitle: "Recent Journey",
              contactTitle: "Contact",
              contactDesc: "If you are building AI products, research systems, or frontend experiences, feel free to reach out.",
              mailBtn: "Send Email",
              copyBtn: "Copy Email",
              copiedBtn: "Copied",
              metricProjects: "Projects",
              metricSkills: "Skills",
            }
          },
          focusPool: {
            zh: ["重构个人网站交互", "沉淀研究项目案例", "打磨可复用前端模块"],
            en: ["Rebuilding site interaction", "Curating research case studies", "Refining reusable UI modules"]
          },
          tabDefs: [
            { key: "all", label: { zh: "全部", en: "All" } },
            { key: "ai", label: { zh: "AI", en: "AI" } },
            { key: "web", label: { zh: "Web", en: "Web" } },
            { key: "data", label: { zh: "Data", en: "Data" } },
            { key: "research", label: { zh: "研究", en: "Research" } }
          ],
          quickLinkDefs: [
            {
              url: withBase("/publications/"),
              label: { zh: "Publications", en: "Publications" },
              hint: { zh: "论文与成果", en: "Papers and outputs" }
            },
            {
              url: withBase("/talks/"),
              label: { zh: "Talks", en: "Talks" },
              hint: { zh: "演讲与分享", en: "Talks and presentations" }
            },
            {
              url: withBase("/teaching/"),
              label: { zh: "Teaching", en: "Teaching" },
              hint: { zh: "课程与教学", en: "Courses and teaching" }
            },
            {
              url: withBase("/year-archive/"),
              label: { zh: "Blog", en: "Blog" },
              hint: { zh: "思考与记录", en: "Notes and thoughts" }
            }
          ],
          projects: [
            {
              categories: ["web", "data"],
              type: { zh: "前端工程", en: "FRONTEND" },
              title: { zh: "融媒体中心管理系统", en: "Media Center Management System" },
              summary: {
                zh: "为东南大学吴健雄学院的融媒体中心设计的统一工单系统，并结合QQBot提高工单效率，目前正在推动落实",
                en: "A unified work order system was designed for the Media Center of Chien-Shiung Wu College at Southeast University, and QQBot was integrated to improve work order efficiency. Implementation is currently underway."
              },
              tags: { zh: ["Flask", "Dashboard", "Data"], en: ["Flask", "Dashboard", "Data"] },
              url: "https://liumuqing.pythonanywhere.com"
            }
          ],
          skills: [
            { name: { zh: "Python", en: "Python" }, level: 50 },
            { name: { zh: "Pytorch", en: "Pytorch" }, level: 50 },
            { name: { zh: "C++", en: "C++" }, level: 30 },
            { name: { zh: "数据库", en: "Database" }, level: 30 }
          ],
          journeyMap: {
            zh: [
              { when: "2026", title: "网站构建", desc: "完成个人站点 UI 与交互设计。" }
            ],
            en: [
              { when: "2026", title: "Site Build", desc: "Designed personal website UI and interactions." }
            ]
          }
        };
      },
      computed: {
        i18n: function () {
          return this.i18nMap[this.lang];
        },
        localizedTabs: function () {
          var lang = this.lang;
          return this.tabDefs.map(function (tab) {
            return { key: tab.key, label: tab.label[lang] };
          });
        },
        quickLinks: function () {
          var lang = this.lang;
          return this.quickLinkDefs.map(function (item) {
            return { url: item.url, label: item.label[lang], hint: item.hint[lang] };
          });
        },
        filteredProjects: function () {
          var lang = this.lang;
          var active = this.activeTab;

          return this.projects
            .filter(function (project) {
              return active === "all" || project.categories.indexOf(active) !== -1;
            })
            .map(function (project) {
              return {
                type: project.type[lang],
                title: project.title[lang],
                summary: project.summary[lang],
                tags: project.tags[lang],
                url: project.url
              };
            });
        },
        localizedSkills: function () {
          var lang = this.lang;
          return this.skills.map(function (skill) {
            return { name: skill.name[lang], level: skill.level };
          });
        },
        journey: function () {
          return this.journeyMap[this.lang];
        },
        metrics: function () {
          return [
            { value: this.projects.length + "+", label: this.i18n.metricProjects },
            { value: this.skills.length, label: this.i18n.metricSkills }
          ];
        },
        focusText: function () {
          var pool = this.focusPool[this.lang];
          return pool[this.focusIndex % pool.length];
        }
      },
      watch: {
        lang: function (value) {
          this.tickClock();
          document.documentElement.setAttribute("lang", value === "zh" ? "zh-CN" : "en");
          localStorage.setItem("home_lang", value);
        },
        accentMode: function (value) {
          localStorage.setItem("home_accent", value ? "1" : "0");
        }
      },
      methods: {
        tickClock: function () {
          var locale = this.lang === "zh" ? "zh-CN" : "en-US";
          var formatter = new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            month: "short",
            day: "2-digit"
          });

          this.clockText = formatter.format(new Date());
        },
        toggleAccent: function () {
          this.accentMode = !this.accentMode;
        },
        toggleLanguage: function () {
          this.lang = this.lang === "zh" ? "en" : "zh";
        },
        rotateFocus: function () {
          this.focusIndex += 1;
        },
        copyEmail: function () {
          var _this = this;

          if (!email) {
            return;
          }

          function markCopied() {
            _this.copied = true;
            window.clearTimeout(_this.copyTimer);
            _this.copyTimer = window.setTimeout(function () {
              _this.copied = false;
            }, 1600);
          }

          function fallbackCopy() {
            var input = document.createElement("input");
            input.value = email;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            markCopied();
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(markCopied).catch(fallbackCopy);
            return;
          }

          fallbackCopy();
        }
      },
      mounted: function () {
        var savedLang = localStorage.getItem("home_lang");
        var savedAccent = localStorage.getItem("home_accent");

        if (savedLang === "zh" || savedLang === "en") {
          this.lang = savedLang;
        }

        if (savedAccent === "1") {
          this.accentMode = true;
        }

        this.tickClock();
        this.clockTimer = window.setInterval(this.tickClock, 1000);
        this.focusTimer = window.setInterval(this.rotateFocus, 4500);
      },
      beforeUnmount: function () {
        window.clearInterval(this.clockTimer);
        window.clearInterval(this.focusTimer);
        window.clearTimeout(this.copyTimer);
      }
    }).mount(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountHome);
  } else {
    mountHome();
  }
})();
