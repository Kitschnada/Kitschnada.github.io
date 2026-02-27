---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

<div class="archive-intro-card cv-intro-card">
  <p class="archive-kicker">Curriculum Vitae</p>
  <p>一个结构化 CV 版本，强调教育背景、经历、能力与成果。你可以在后续直接替换下面字段为真实信息。</p>
</div>

<div class="cv-layout-grid">
  <section class="cv-block">
    <h2>Education</h2>
    <ul class="cv-timeline">
      <li>
        <h3>Ph.D in Version Control Theory</h3>
        <p>GitHub University · 2018 (expected)</p>
      </li>
      <li>
        <h3>M.S. in Jekyll</h3>
        <p>GitHub University · 2014</p>
      </li>
      <li>
        <h3>B.S. in GitHub</h3>
        <p>GitHub University · 2012</p>
      </li>
    </ul>
  </section>

  <section class="cv-block">
    <h2>Work Experience</h2>
    <ul class="cv-timeline">
      <li>
        <h3>Academic Pages Collaborator</h3>
        <p>GitHub University · Spring 2024</p>
        <p class="cv-muted">Duties: updates and improvements to template</p>
      </li>
      <li>
        <h3>Research Assistant</h3>
        <p>GitHub University · Fall 2015</p>
        <p class="cv-muted">Duties: merging pull requests</p>
      </li>
      <li>
        <h3>Research Assistant</h3>
        <p>GitHub University · Summer 2015</p>
        <p class="cv-muted">Duties: issue triage and tagging</p>
      </li>
    </ul>
  </section>
</div>

<section class="cv-block cv-block--full">
  <h2>Skills</h2>
  <ul class="cv-skill-tags">
    <li>Research Communication</li>
    <li>Data Processing</li>
    <li>Web Engineering</li>
    <li>LLM Application</li>
    <li>Technical Writing</li>
    <li>Open Source Collaboration</li>
  </ul>
</section>

<div class="cv-layout-grid">
  <section class="cv-block">
    <h2>Selected Publications</h2>
    <ul class="cv-link-list">
      {% for post in site.publications reversed limit: 8 %}
      <li>
        <a href="{{ base_path }}{{ post.url }}">{{ post.title }}</a>
        <span>{{ post.date | default: "1900-01-01" | date: "%Y" }}</span>
      </li>
      {% endfor %}
    </ul>
  </section>

  <section class="cv-block">
    <h2>Talks</h2>
    <ul class="cv-link-list">
      {% for post in site.talks reversed limit: 8 %}
      <li>
        <a href="{{ base_path }}{{ post.url }}">{{ post.title }}</a>
        <span>{{ post.date | default: "1900-01-01" | date: "%Y" }}</span>
      </li>
      {% endfor %}
    </ul>
  </section>
</div>

<section class="cv-block cv-block--full">
  <h2>Teaching</h2>
  <ul class="cv-link-list">
    {% for post in site.teaching reversed %}
    <li>
      <a href="{{ base_path }}{{ post.url }}">{{ post.title }}</a>
      <span>{{ post.date | default: "1900-01-01" | date: "%Y" }}</span>
    </li>
    {% endfor %}
  </ul>
</section>
