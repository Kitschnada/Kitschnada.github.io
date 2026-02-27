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
  <p></p>
</div>

<div class="cv-layout-grid">
  <section class="cv-block">
    <h2>Education</h2>
    <ul class="cv-timeline">
      <li>
        <h3>Undergraduate Student</h3>
        <p>Southeast University · 2023-present</p>
      </li>
    </ul>
  </section>

  <section class="cv-block">
    <h2>Work Experience</h2>
    <ul class="cv-timeline">
      <li>
        <h3>Ongoing</h3>
        <p>Ongoing</p>
        <p class="cv-muted">Ongoing</p>
      </li>
    </ul>
  </section>
</div>

<section class="cv-block cv-block--full">
  <h2>Skills</h2>
  <ul class="cv-skill-tags">
    <li>Pytorch</li>
    <li>Data Processing</li>
    <li>Web Engineering</li>
    <li>Technical Writing</li>
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

<!-- <section class="cv-block cv-block--full">
  <h2>Teaching</h2>
  <ul class="cv-link-list">
    {% for post in site.teaching reversed %}
    <li>
      <a href="{{ base_path }}{{ post.url }}">{{ post.title }}</a>
      <span>{{ post.date | default: "1900-01-01" | date: "%Y" }}</span>
    </li>
    {% endfor %}
  </ul>
</section> -->
