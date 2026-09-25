---
layout: archive
title: CV
permalink: /cv/
redirect_from:
  - /resume
---
<div class="cv-sheet">
  {% assign cv_name = site.author.name_zh | default: site.author.name %}{% assign cv_bio = site.author.bio_zh | default: site.author.bio %}{% assign cv_school = site.author.employer_zh | default: site.author.employer %}
  <header class="cv-identity"><h2>{% include garden-text.html zh=cv_name en=site.author.name %}</h2><p>{% include garden-text.html zh=cv_bio en=site.author.bio %}</p><a href="mailto:{{ site.author.email }}">{{ site.author.email }}</a></header>
  <section class="cv-section"><h2>{% include garden-text.html zh="教育" en="Education" %}</h2><div><p class="entry-meta">2023 — {% include garden-text.html zh="至今" en="present" %}</p><h3>{% include garden-text.html zh=cv_school en=site.author.employer %}</h3><p>{% include garden-text.html zh="本科在读 · 计算机科学与技术" en="Undergraduate student · Computer Science" %}</p></div></section>
  <section class="cv-section"><h2>{% include garden-text.html zh="论文" en="Publications" %}</h2><div>{% for entry in site.publications reversed %}{% include garden-entry.html entry=entry %}{% else %}{% include garden-empty.html %}{% endfor %}</div></section>
</div>
