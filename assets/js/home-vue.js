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
          accentMode: false,
          activeTab: "全部",
          copied: false,
          copyTimer: null,
          clockTimer: null,
          focusTimer: null,
          clockText: "--:--:--",
          focusIndex: 0,
          focusPool: [
            "优化个人站点交互体验",
            "整理研究与项目案例",
            "搭建可复用的页面组件"
          ],
          tabs: ["全部", "AI", "Web", "Data", "Research"],
          projects: [
            {
              type: "AI APP",
              title: "多模态知识助手",
              summary: "基于检索增强与对话式交互，构建可解释的问答流程与引用链路。",
              tags: ["AI", "RAG", "LLM"],
              url: withBase("/portfolio/")
            },
            {
              type: "WEB PRODUCT",
              title: "可视化实验看板",
              summary: "将实验指标、训练曲线与版本变更融合为统一界面，支持快速对比。",
              tags: ["Web", "Vue", "Dashboard"],
              url: withBase("/talks/")
            },
            {
              type: "DATA WORKFLOW",
              title: "论文与成果归档流水线",
              summary: "用结构化元数据驱动页面生成，减少重复维护并提升更新效率。",
              tags: ["Data", "Automation", "Jekyll"],
              url: withBase("/publications/")
            },
            {
              type: "RESEARCH",
              title: "交互式学术主页框架",
              summary: "在静态站点基础上加入动态模块，实现轻量化个性展示与低维护成本。",
              tags: ["Research", "UI", "Static Site"],
              url: withBase("/cv/")
            }
          ],
          skills: [
            { name: "Vue / Frontend Engineering", level: 84 },
            { name: "Python / Data Processing", level: 88 },
            { name: "LLM Application Design", level: 80 },
            { name: "Product Prototyping", level: 82 }
          ]
        };
      },
      computed: {
        filteredProjects: function () {
          if (this.activeTab === "全部") {
            return this.projects;
          }

          var selected = this.activeTab;
          return this.projects.filter(function (project) {
            return project.tags.indexOf(selected) !== -1;
          });
        },
        metrics: function () {
          return [
            { value: this.projects.length + "+", label: "Project Blocks" },
            { value: this.skills.length, label: "Core Skills" },
            { value: "24/7", label: "Build Momentum" }
          ];
        },
        focusText: function () {
          return this.focusPool[this.focusIndex];
        }
      },
      methods: {
        tickClock: function () {
          var formatter = new Intl.DateTimeFormat("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            month: "short",
            day: "2-digit"
          });

          this.clockText = formatter.format(new Date());
        },
        rotateFocus: function () {
          this.focusIndex = (this.focusIndex + 1) % this.focusPool.length;
        },
        toggleAccent: function () {
          this.accentMode = !this.accentMode;
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
            }, 1800);
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(markCopied);
            return;
          }

          var input = document.createElement("input");
          input.value = email;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          document.body.removeChild(input);
          markCopied();
        }
      },
      mounted: function () {
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
