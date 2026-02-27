(function () {
  var app = document.getElementById("home-app");

  if (!app) {
    return;
  }

  var email = app.getAttribute("data-email") || "";
  var basePath = app.getAttribute("data-base-path") || "";

  if (basePath === "/") {
    basePath = "";
  }

  if (basePath.slice(-1) === "/") {
    basePath = basePath.slice(0, -1);
  }

  function withBase(path) {
    return basePath ? basePath + path : path;
  }

  function readStorage(key) {
    try {
      if (window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function writeStorage(key, value) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      // Ignore storage write failures in private/incognito modes.
    }
  }

  var state = {
    lang: "zh",
    accent: false,
    activeTab: "all",
    focusIndex: 0,
    copied: false,
    copyTimer: null
  };

  var content = {
    i18n: {
      zh: {
        kicker: "PERSONAL PAGE",
        heroLead: "你好，我是刘穆清。这是我的个人主页。",
        ctaPortfolio: "查看项目",
        ctaCv: "查看 CV",
        ctaToWarm: "切换暖色主题",
        ctaToCool: "切换冷色主题",
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
        ctaToWarm: "Switch to warm palette",
        ctaToCool: "Switch to cool palette",
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
        metricSkills: "Skills"
      }
    },
    focusPool: {
      zh: ["构建个人网站", "2026保研", "参数高效微调研究"],
      en: ["Building Personal Site", "2026 Postgraduate Admission", "Research on Parameter Efficient Fine-Tuning"]
    },
    tabs: [
      { key: "all", label: { zh: "全部", en: "All" } },
      { key: "ai", label: { zh: "AI", en: "AI" } },
      { key: "web", label: { zh: "Web", en: "Web" } },
      { key: "data", label: { zh: "Data", en: "Data" } },
      { key: "research", label: { zh: "研究", en: "Research" } }
    ],
    quickLinks: [
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
        label: { zh: "Studying", en: "Studying" },
        hint: { zh: "学习记录", en: "Learning notes" }
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
          zh: "为东南大学吴健雄学院设计的统一工单系统，并结合 QQ Bot 提高工单效率。",
          en: "A unified work order system with QQ Bot integration for Chien-Shiung Wu College media center."
        },
        tags: { zh: ["Flask", "Dashboard", "Data"], en: ["Flask", "Dashboard", "Data"] },
        url: "https://liumuqing.pythonanywhere.com"
      },
      {
        categories: ["ai", "research"],
        type: { zh: "AI 研究", en: "AI RESEARCH" },
        title: { zh: "FlexLoRA", en: "FlexLoRA" },
        summary: {
          zh: "熵引导的动态低秩适配方法，用于提升参数高效微调稳定性。",
          en: "Entropy-guided flexible low-rank adaptation for stable parameter-efficient fine-tuning."
        },
        tags: { zh: ["PEFT", "LoRA", "LLM"], en: ["PEFT", "LoRA", "LLM"] },
        url: withBase("/publication/2026-02-27-FlexLoRA")
      }
    ],
    skills: [
      { name: { zh: "Python", en: "Python" }, level: 50 },
      { name: { zh: "Pytorch", en: "Pytorch" }, level: 50 },
      { name: { zh: "C++", en: "C++" }, level: 30 },
      { name: { zh: "数据库", en: "Database" }, level: 30 }
    ],
    journey: {
      zh: [{ when: "2026", title: "网站构建", desc: "完成个人站点 UI 与交互设计。" }],
      en: [{ when: "2026", title: "Site Build", desc: "Designed personal website UI and interactions." }]
    }
  };

  function t(key) {
    return content.i18n[state.lang][key] || "";
  }

  function setTexts() {
    var nodes = app.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i += 1) {
      var key = nodes[i].getAttribute("data-i18n");
      nodes[i].textContent = t(key);
    }

    var ariaNodes = app.querySelectorAll("[data-i18n-aria]");
    for (var j = 0; j < ariaNodes.length; j += 1) {
      var ariaKey = ariaNodes[j].getAttribute("data-i18n-aria");
      ariaNodes[j].setAttribute("aria-label", t(ariaKey));
    }

    var accentBtn = document.getElementById("home-accent-btn");
    if (accentBtn) {
      accentBtn.textContent = state.accent ? t("ctaToCool") : t("ctaToWarm");
    }

    var langBtn = document.getElementById("home-lang-btn");
    if (langBtn) {
      langBtn.textContent = state.lang === "zh" ? "EN" : "中";
    }

    var copyBtn = document.getElementById("home-copy-btn");
    if (copyBtn) {
      copyBtn.textContent = state.copied ? t("copiedBtn") : t("copyBtn");
    }

    var projectsMetric = document.getElementById("metric-projects-value");
    if (projectsMetric) {
      projectsMetric.textContent = content.projects.length + "+";
    }

    var skillsMetric = document.getElementById("metric-skills-value");
    if (skillsMetric) {
      skillsMetric.textContent = String(content.skills.length);
    }
  }

  function renderQuickLinks() {
    var container = document.getElementById("home-quick-links");
    container.innerHTML = "";

    content.quickLinks.forEach(function (item) {
      var card = document.createElement("a");
      card.className = "quick-card";
      card.href = item.url;

      var label = document.createElement("p");
      label.textContent = item.label[state.lang];

      var hint = document.createElement("small");
      hint.textContent = item.hint[state.lang];

      card.appendChild(label);
      card.appendChild(hint);
      container.appendChild(card);
    });
  }

  function renderTabs() {
    var buttons = app.querySelectorAll("[data-tab]");

    for (var i = 0; i < buttons.length; i += 1) {
      var btn = buttons[i];
      var key = btn.getAttribute("data-tab");
      var tab = content.tabs.find(function (item) {
        return item.key === key;
      });

      if (tab) {
        btn.textContent = tab.label[state.lang];
      }

      btn.classList.toggle("chip--active", state.activeTab === key);
    }
  }

  function renderProjects() {
    var container = document.getElementById("home-project-grid");
    container.innerHTML = "";

    var filtered = content.projects.filter(function (project) {
      return state.activeTab === "all" || project.categories.indexOf(state.activeTab) !== -1;
    });

    filtered.forEach(function (project) {
      var card = document.createElement("article");
      card.className = "project-card";

      var type = document.createElement("p");
      type.className = "project-type";
      type.textContent = project.type[state.lang];

      var title = document.createElement("h3");
      title.textContent = project.title[state.lang];

      var summary = document.createElement("p");
      summary.textContent = project.summary[state.lang];

      var tags = document.createElement("ul");
      tags.className = "tag-row";

      project.tags[state.lang].forEach(function (tag) {
        var li = document.createElement("li");
        li.textContent = tag;
        tags.appendChild(li);
      });

      var link = document.createElement("a");
      link.className = "card-link";
      link.href = project.url;
      link.textContent = t("cardLink");

      card.appendChild(type);
      card.appendChild(title);
      card.appendChild(summary);
      card.appendChild(tags);
      card.appendChild(link);
      container.appendChild(card);
    });
  }

  function renderSkills() {
    var container = document.getElementById("home-skill-list");
    container.innerHTML = "";

    content.skills.forEach(function (skill) {
      var item = document.createElement("div");
      item.className = "skill-item";

      var title = document.createElement("div");
      title.className = "skill-title";

      var name = document.createElement("span");
      name.textContent = skill.name[state.lang];

      var level = document.createElement("span");
      level.textContent = skill.level + "%";

      title.appendChild(name);
      title.appendChild(level);

      var bar = document.createElement("div");
      bar.className = "skill-bar";

      var fill = document.createElement("i");
      fill.style.width = skill.level + "%";

      bar.appendChild(fill);
      item.appendChild(title);
      item.appendChild(bar);
      container.appendChild(item);
    });
  }

  function renderJourney() {
    var container = document.getElementById("home-journey-list");
    container.innerHTML = "";

    content.journey[state.lang].forEach(function (entry) {
      var li = document.createElement("li");

      var when = document.createElement("span");
      when.textContent = entry.when;

      var title = document.createElement("strong");
      title.textContent = entry.title;

      var desc = document.createElement("p");
      desc.textContent = entry.desc;

      li.appendChild(when);
      li.appendChild(title);
      li.appendChild(desc);
      container.appendChild(li);
    });
  }

  function tickClock() {
    var locale = state.lang === "zh" ? "zh-CN" : "en-US";
    var formatter = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      month: "short",
      day: "2-digit"
    });

    var clock = document.getElementById("home-clock");
    if (clock) {
      clock.textContent = formatter.format(new Date());
    }

    var focus = document.getElementById("home-focus");
    if (focus) {
      var pool = content.focusPool[state.lang];
      focus.textContent = pool[state.focusIndex % pool.length];
    }
  }

  function applyAccent() {
    var accentMode = state.accent ? "warm" : "cool";
    app.classList.toggle("home-reboot--alt", state.accent);
    document.documentElement.setAttribute("data-accent", accentMode);
    writeStorage("home_accent", state.accent ? "1" : "0");
  }

  function applyLanguage() {
    document.documentElement.setAttribute("lang", state.lang === "zh" ? "zh-CN" : "en");
    writeStorage("home_lang", state.lang);
    setTexts();
    renderQuickLinks();
    renderTabs();
    renderProjects();
    renderSkills();
    renderJourney();
    tickClock();
  }

  function copyEmail() {
    if (!email) {
      return;
    }

    function markCopied() {
      state.copied = true;
      setTexts();
      clearTimeout(state.copyTimer);
      state.copyTimer = setTimeout(function () {
        state.copied = false;
        setTexts();
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

  function bindEvents() {
    var accentBtn = document.getElementById("home-accent-btn");
    if (accentBtn) {
      accentBtn.addEventListener("click", function () {
        state.accent = !state.accent;
        applyAccent();
        setTexts();
      });
    }

    var langBtn = document.getElementById("home-lang-btn");
    if (langBtn) {
      langBtn.addEventListener("click", function () {
        state.lang = state.lang === "zh" ? "en" : "zh";
        applyLanguage();
      });
    }

    var copyBtn = document.getElementById("home-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", copyEmail);
    }

    var tabButtons = app.querySelectorAll("[data-tab]");
    for (var i = 0; i < tabButtons.length; i += 1) {
      tabButtons[i].addEventListener("click", function (event) {
        state.activeTab = event.currentTarget.getAttribute("data-tab");
        renderTabs();
        renderProjects();
      });
    }
  }

  function init() {
    var savedLang = readStorage("home_lang");
    var savedAccent = readStorage("home_accent");

    if (savedLang === "zh" || savedLang === "en") {
      state.lang = savedLang;
    }

    if (savedAccent === "1") {
      state.accent = true;
    }

    bindEvents();
    applyAccent();
    applyLanguage();

    tickClock();
    setInterval(tickClock, 1000);
    setInterval(function () {
      state.focusIndex += 1;
      tickClock();
    }, 4500);
  }

  init();
})();
