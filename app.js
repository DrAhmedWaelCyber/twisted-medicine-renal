/**
 * Twisted Medicine • Renal System MCQ Master Bank
 * Core Application Engine & State Architecture
 * Responsive Cross-Platform Edition (Mobile, Tablet, iPad & Desktop)
 */

// ================= Web Audio API Synthesizer =================
class SoundController {
  constructor() {
    this.enabled = localStorage.getItem('tm_sound_enabled') !== 'false';
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('tm_sound_enabled', this.enabled);
    return this.enabled;
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5

      osc2.frequency.setValueAtTime(261.63, now);
      osc2.frequency.exponentialRampToValueAtTime(329.63, now + 0.25);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (e) {}
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }
}

// ================= App State & Controller =================
class AppController {
  constructor() {
    this.sound = new SoundController();
    this.curriculum = null;
    this.searchIndex = [];
    this.allQuestionsCache = null;
    this.currentLessonId = 1;
    this.currentLessonData = null;
    this.currentMode = 'study'; // 'study', 'exam', 'flashcards', 'notes', 'bookmarks'
    this.activeTagFilter = 'ALL';
    this.activeDeptFilter = 'ALL';
    this.quickQuery = '';
    
    // User progress persistence
    this.userAnswers = JSON.parse(localStorage.getItem('tm_user_answers') || '{}');
    this.bookmarks = JSON.parse(localStorage.getItem('tm_bookmarks') || '[]');
    
    // Exam state
    this.examState = null;

    // Flashcard state
    this.flashcardIndex = 0;
    this.flashcardFlipped = false;
  }

  async init() {
    this.setupTheme();
    this.setupEventListeners();
    this.updateBookmarkCount();

    // Load master curriculum
    try {
      const res = await fetch('data/master_curriculum.json');
      this.curriculum = await res.json();
      this.renderDepartmentPills();
      this.renderLessonsList();
      await this.loadLesson(1);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    }

    // Load search index in background
    fetch('data/search_index.json')
      .then(res => res.json())
      .then(data => { this.searchIndex = data; })
      .catch(e => console.warn('Search index load deferred:', e));
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('tm_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tm_theme', next);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = next === 'dark' ? '🌙' : '☀️';
    }
  }

  setupEventListeners() {
    // Theme toggle
    document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
      this.sound.playClick();
      this.toggleTheme();
    });

    // Sound toggle
    const soundBtn = document.getElementById('btnSoundToggle');
    const soundIcon = document.getElementById('soundIcon');
    if (soundBtn && soundIcon) {
      soundIcon.textContent = this.sound.enabled ? '🔊' : '🔇';
      soundBtn.addEventListener('click', () => {
        const enabled = this.sound.toggle();
        soundIcon.textContent = enabled ? '🔊' : '🔇';
        if (enabled) this.sound.playClick();
      });
    }

    // Desktop nav tabs
    const navTabs = document.querySelectorAll('.nav-tab-btn');
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Mobile bottom navigation bar tabs
    const mobileTabs = document.querySelectorAll('.mobile-tab-btn[data-mode]');
    mobileTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Mobile Lessons Menu button (in bottom nav)
    document.getElementById('mobileBtnMenu')?.addEventListener('click', () => {
      this.sound.playClick();
      this.openSidebar();
    });

    // Top hamburger sidebar toggle button
    document.getElementById('btnSidebarToggle')?.addEventListener('click', () => {
      this.sound.playClick();
      this.openSidebar();
    });

    // Close sidebar button
    document.getElementById('btnCloseSidebar')?.addEventListener('click', () => {
      this.sound.playClick();
      this.closeSidebar();
    });

    // Sidebar backdrop click
    document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
      this.closeSidebar();
    });

    // Tag filter buttons
    const tagButtons = document.querySelectorAll('#tagFilters .filter-btn');
    tagButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tagButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTagFilter = btn.dataset.tag;
        this.sound.playClick();
        this.renderCurrentView();
      });
    });

    // Quick filter input
    const quickInput = document.getElementById('quickFilterInput');
    quickInput?.addEventListener('input', (e) => {
      this.quickQuery = e.target.value.toLowerCase().trim();
      this.renderCurrentView();
    });

    // High-yield pearls button in banner
    document.getElementById('btnViewLessonNotes')?.addEventListener('click', () => {
      this.sound.playClick();
      this.openNotesModal(this.currentLessonData);
    });

    // Notes modal close
    document.getElementById('btnCloseNotesModal')?.addEventListener('click', () => {
      document.getElementById('notesModal')?.classList.remove('open');
    });

    // Reset Progress modal trigger
    document.getElementById('btnOpenResetModal')?.addEventListener('click', () => {
      this.sound.playClick();
      this.openResetModal();
    });

    document.getElementById('btnCloseResetModal')?.addEventListener('click', () => {
      this.sound.playClick();
      this.closeResetModal();
    });

    document.getElementById('btnCancelReset')?.addEventListener('click', () => {
      this.sound.playClick();
      this.closeResetModal();
    });

    document.getElementById('btnResetCurrentLesson')?.addEventListener('click', () => {
      this.resetCurrentLessonProgress();
    });

    document.getElementById('btnResetAllBank')?.addEventListener('click', () => {
      this.resetAllProgress();
    });

    document.getElementById('resetModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'resetModal') {
        this.closeResetModal();
      }
    });

    // Global Search trigger
    document.getElementById('btnGlobalSearch')?.addEventListener('click', () => {
      this.sound.playClick();
      this.openGlobalSearch();
    });

    document.getElementById('btnCloseSearchModal')?.addEventListener('click', () => {
      document.getElementById('globalSearchModal')?.classList.remove('open');
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openGlobalSearch();
      } else if (e.key === 'Escape') {
        document.getElementById('notesModal')?.classList.remove('open');
        document.getElementById('globalSearchModal')?.classList.remove('open');
        this.closeResetModal();
        this.closeSidebar();
      }
    });

    // Global search input
    const searchInput = document.getElementById('globalSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.handleGlobalSearch(e.target.value);
    });
  }

  openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebarBackdrop')?.classList.add('active');
  }

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
  }

  switchMode(mode) {
    this.currentMode = mode;
    this.sound.playClick();

    // Update active nav tab on desktop
    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    // Update active nav tab on mobile bottom bar
    document.querySelectorAll('.mobile-tab-btn[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    const questionsContainer = document.getElementById('questionsContainer');
    const flashcardsStage = document.getElementById('flashcardsStage');
    const examStage = document.getElementById('examStage');
    const filterBar = document.querySelector('.filter-bar');

    if (mode === 'study') {
      questionsContainer.style.display = 'flex';
      flashcardsStage.style.display = 'none';
      examStage.style.display = 'none';
      filterBar.style.display = 'flex';
      this.renderQuestions();
    } else if (mode === 'exam') {
      questionsContainer.style.display = 'none';
      flashcardsStage.style.display = 'none';
      examStage.style.display = 'block';
      filterBar.style.display = 'none';
      this.initExamMode();
    } else if (mode === 'flashcards') {
      questionsContainer.style.display = 'none';
      flashcardsStage.style.display = 'block';
      examStage.style.display = 'none';
      filterBar.style.display = 'none';
      this.initFlashcardsMode();
    } else if (mode === 'notes') {
      this.openNotesModal(this.currentLessonData);
    } else if (mode === 'bookmarks') {
      questionsContainer.style.display = 'flex';
      flashcardsStage.style.display = 'none';
      examStage.style.display = 'none';
      filterBar.style.display = 'flex';
      this.renderBookmarksView();
    }
  }

  renderDepartmentPills() {
    const container = document.getElementById('deptPillContainer');
    if (!container || !this.curriculum) return;
    container.innerHTML = '';

    const allPill = document.createElement('button');
    allPill.className = `dept-pill ${this.activeDeptFilter === 'ALL' ? 'active' : ''}`;
    allPill.textContent = 'All Departments';
    allPill.onclick = () => {
      this.activeDeptFilter = 'ALL';
      this.sound.playClick();
      this.renderDepartmentPills();
      this.renderLessonsList();
    };
    container.appendChild(allPill);

    const depts = [
      'Anatomy & Embryology',
      'Histology',
      'Physiology',
      'Pharmacology',
      'Pathology',
      'Microbiology',
      'Parasitology',
      'Clinical Biochemistry',
      'Clinical Nephrology & Urology'
    ];

    depts.forEach(dept => {
      const pill = document.createElement('button');
      pill.className = `dept-pill ${this.activeDeptFilter === dept ? 'active' : ''}`;
      const shortName = dept.split('&')[0].trim();
      pill.textContent = shortName;
      pill.onclick = () => {
        this.activeDeptFilter = dept;
        this.sound.playClick();
        this.renderDepartmentPills();
        this.renderLessonsList();
      };
      container.appendChild(pill);
    });
  }

  renderLessonsList() {
    const list = document.getElementById('lessonsList');
    if (!list || !this.curriculum) return;
    list.innerHTML = '';

    const lessons = this.curriculum.masterclasses.filter(mc => {
      if (this.activeDeptFilter === 'ALL') return true;
      return mc.department.toLowerCase().includes(this.activeDeptFilter.toLowerCase()) ||
             this.activeDeptFilter.toLowerCase().includes(mc.department.toLowerCase());
    });

    lessons.forEach(mc => {
      const item = document.createElement('div');
      item.className = `lesson-item ${mc.id === this.currentLessonId ? 'active' : ''}`;
      
      const answeredInLesson = Object.keys(this.userAnswers).filter(k => k.startsWith(`TM-R-${mc.id.toString().padStart(2, '0')}-`)).length;
      const progressPct = Math.round((answeredInLesson / 42) * 100);
      const deptClass = this.getDeptBadgeClass(mc.department);

      item.innerHTML = `
        <div class="lesson-item-top">
          <span class="lesson-dept-badge ${deptClass}">${mc.department.split('&')[0]}</span>
          <span style="color: var(--text-dim); font-size: 0.7rem;">${mc.booklet_pages}</span>
        </div>
        <div class="lesson-item-title">${mc.id}. ${mc.title}</div>
        <div class="lesson-progress-row">
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPct}%;"></div>
          </div>
          <span>${answeredInLesson}/42</span>
        </div>
      `;

      item.onclick = () => {
        this.sound.playClick();
        this.loadLesson(mc.id);
        this.closeSidebar();
      };

      list.appendChild(item);
    });
  }

  getDeptBadgeClass(dept) {
    const d = dept.toLowerCase();
    if (d.includes('anat')) return 'dept-anatomy';
    if (d.includes('histo')) return 'dept-histology';
    if (d.includes('physio')) return 'dept-physiology';
    if (d.includes('patho')) return 'dept-pathology';
    if (d.includes('micro')) return 'dept-microbiology';
    if (d.includes('para')) return 'dept-parasitology';
    if (d.includes('pharm')) return 'dept-pharmacology';
    return 'dept-anatomy';
  }

  async loadLesson(lessonId) {
    this.currentLessonId = lessonId;
    const padId = lessonId.toString().padStart(2, '0');
    
    try {
      const res = await fetch(`data/lessons/lesson_${padId}.json`);
      this.currentLessonData = await res.json();
      this.updateBanner();
      this.renderLessonsList();
      this.renderCurrentView();

      // Scroll to top of content smoothly
      document.getElementById('mainContent')?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(`Error loading lesson ${lessonId}:`, e);
    }
  }

  updateBanner() {
    if (!this.currentLessonData) return;
    const d = this.currentLessonData;
    
    document.getElementById('bannerDept').textContent = d.department;
    document.getElementById('bannerDept').className = `lesson-dept-badge ${this.getDeptBadgeClass(d.department)}`;
    document.getElementById('bannerPages').textContent = d.booklet_pages;
    document.getElementById('bannerTitle').textContent = `${d.id}. ${d.title}`;
    
    const answeredCount = d.questions.filter(q => {
      const gid = `TM-R-${d.id.toString().padStart(2, '0')}-${q.num.toString().padStart(2, '0')}`;
      return this.userAnswers[gid] !== undefined;
    }).length;

    const correctCount = d.questions.filter(q => {
      const gid = `TM-R-${d.id.toString().padStart(2, '0')}-${q.num.toString().padStart(2, '0')}`;
      return this.userAnswers[gid] === q.correct_option;
    }).length;

    const acc = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    document.getElementById('statCompleted').textContent = `${answeredCount}/${d.questions.length}`;
    document.getElementById('statAccuracy').textContent = `${acc}%`;
  }

  renderCurrentView() {
    if (this.currentMode === 'study') {
      this.renderQuestions();
    } else if (this.currentMode === 'flashcards') {
      this.renderFlashcard();
    } else if (this.currentMode === 'bookmarks') {
      this.renderBookmarksView();
    }
  }

  renderQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container || !this.currentLessonData) return;
    container.innerHTML = '';

    let questions = this.currentLessonData.questions;

    if (this.activeTagFilter !== 'ALL') {
      questions = questions.filter(q => q.category.toUpperCase() === this.activeTagFilter);
    }

    if (this.quickQuery) {
      questions = questions.filter(q => 
        q.text.toLowerCase().includes(this.quickQuery) ||
        Object.values(q.options).some(opt => opt.toLowerCase().includes(this.quickQuery))
      );
    }

    if (questions.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 0.8rem;">🔍</span>
          <h3>No questions matched your filter</h3>
          <p style="font-size: 0.85rem; margin-top: 0.3rem;">Try selecting a different tag or clearing your search term.</p>
        </div>
      `;
      return;
    }

    questions.forEach(q => {
      const card = this.createQuestionCard(q, this.currentLessonData);
      container.appendChild(card);
    });
  }

  createQuestionCard(q, lessonContext) {
    const gid = `TM-R-${lessonContext.id.toString().padStart(2, '0')}-${q.num.toString().padStart(2, '0')}`;
    const userAnswer = this.userAnswers[gid];
    const isBookmarked = this.bookmarks.includes(gid);

    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = `card-${gid}`;

    let tagClass = 'tag-exam';
    if (q.category === 'Core') tagClass = 'tag-core';
    else if (q.category === 'Faculty') tagClass = 'tag-faculty';
    else if (q.category === 'Clinical') tagClass = 'tag-clinical';
    else if (q.category === 'Practical') tagClass = 'tag-practical';

    card.innerHTML = `
      <div class="question-card-header">
        <div class="q-badge-group">
          <span class="q-num-badge">Q${q.num.toString().padStart(2, '0')}</span>
          <span class="q-tag-badge ${tagClass}">${q.tag}</span>
        </div>
        <div class="card-actions">
          <button class="btn-star ${isBookmarked ? 'active' : ''}" title="Bookmark question" aria-label="Save Question">
            ${isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>
      <div class="question-text">${q.text}</div>
      <div class="options-list">
        ${['A', 'B', 'C', 'D', 'E'].map(optKey => {
          if (!q.options[optKey]) return '';
          let optClass = 'option-btn';
          if (userAnswer) {
            if (optKey === q.correct_option) {
              optClass += ' reveal-correct';
            } else if (optKey === userAnswer) {
              optClass += ' selected-wrong';
            }
          }
          return `
            <button class="${optClass}" data-key="${optKey}">
              <span class="opt-letter">${optKey}</span>
              <span class="opt-text">${q.options[optKey]}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="explanation-box" style="display: ${userAnswer ? 'flex' : 'none'};">
        <span class="correct-ans-label">✅ Correct Answer: [${q.correct_option}]</span>
        ${q.options[q.correct_option] ? `<span class="correct-ans-text">— ${q.options[q.correct_option]}</span>` : ''}
      </div>
    `;

    const optionBtns = card.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.userAnswers[gid]) return;
        const chosenKey = btn.dataset.key;
        this.handleAnswerSelection(gid, q, chosenKey, card);
      });
    });

    const starBtn = card.querySelector('.btn-star');
    starBtn?.addEventListener('click', () => {
      this.toggleBookmark(gid);
      starBtn.classList.toggle('active', this.bookmarks.includes(gid));
      starBtn.textContent = this.bookmarks.includes(gid) ? '★' : '☆';
    });

    return card;
  }

  handleAnswerSelection(gid, q, chosenKey, cardElement) {
    this.userAnswers[gid] = chosenKey;
    localStorage.setItem('tm_user_answers', JSON.stringify(this.userAnswers));

    const isCorrect = chosenKey === q.correct_option;
    if (isCorrect) {
      this.sound.playCorrect();
    } else {
      this.sound.playWrong();
    }

    const btns = cardElement.querySelectorAll('.option-btn');
    btns.forEach(b => {
      const k = b.dataset.key;
      if (k === q.correct_option) {
        b.classList.add('reveal-correct');
      } else if (k === chosenKey) {
        b.classList.add('selected-wrong');
      }
    });

    const expBox = cardElement.querySelector('.explanation-box');
    if (expBox) expBox.style.display = 'flex';

    this.updateBanner();
    this.renderLessonsList();
  }

  toggleBookmark(gid) {
    const idx = this.bookmarks.indexOf(gid);
    if (idx === -1) {
      this.bookmarks.push(gid);
    } else {
      this.bookmarks.splice(idx, 1);
    }
    localStorage.setItem('tm_bookmarks', JSON.stringify(this.bookmarks));
    this.sound.playClick();
    this.updateBookmarkCount();
  }

  updateBookmarkCount() {
    const el = document.getElementById('bookmarkCount');
    if (el) el.textContent = this.bookmarks.length;
  }

  // ================= High-Yield Notes Modal =================
  openNotesModal(lesson) {
    if (!lesson) return;
    const modal = document.getElementById('notesModal');
    const title = document.getElementById('notesModalTitle');
    const subtitle = document.getElementById('notesModalSubtitle');
    const body = document.getElementById('notesModalBody');

    title.textContent = lesson.matrix_title || `HIGH-YIELD MATRIX: ${lesson.title}`;
    subtitle.textContent = `${lesson.department} • Continuous Booklet ${lesson.booklet_pages}`;

    if (!lesson.summary_table || lesson.summary_table.length === 0) {
      body.innerHTML = `<p style="color: var(--text-muted); padding: 2rem; text-align: center;">Detailed comparison table available in the continuous print manual.</p>`;
    } else {
      body.innerHTML = `
        <table class="notes-table">
          <thead>
            <tr>
              <th style="min-width: 140px; width: 32%;">Domain / Topic</th>
              <th>High-Yield Examination Rules & Clinical Landmarks</th>
            </tr>
          </thead>
          <tbody>
            ${lesson.summary_table.map(row => `
              <tr>
                <td style="font-weight: 700; color: var(--text-main); vertical-align: top;">${row.domain}</td>
                <td style="color: var(--text-muted); line-height: 1.55;">${row.content}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    modal?.classList.add('open');
  }

  // ================= Global Search =================
  openGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    const input = document.getElementById('globalSearchInput');
    modal?.classList.add('open');
    setTimeout(() => input?.focus(), 120);
  }

  handleGlobalSearch(query) {
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;
    const q = query.toLowerCase().trim();

    if (q.length < 2) {
      resultsContainer.innerHTML = `<p class="search-placeholder-text">Type at least 2 characters to search across all 43 masterclasses...</p>`;
      return;
    }

    const matches = this.searchIndex.filter(item => 
      item.t.toLowerCase().includes(q) ||
      item.tag.toLowerCase().includes(q) ||
      item.dept.toLowerCase().includes(q)
    ).slice(0, 30);

    if (matches.length === 0) {
      resultsContainer.innerHTML = `<p class="search-placeholder-text">No questions found matching "${query}".</p>`;
      return;
    }

    resultsContainer.innerHTML = matches.map(m => `
      <div style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" class="search-result-item" data-mc="${m.mc}" data-num="${m.num}">
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.3rem;">
          <span style="color: var(--primary); font-weight: 700;">MC ${m.mc} • Q${m.num} (${m.dept})</span>
          <span style="color: var(--text-dim);">${m.tag}</span>
        </div>
        <div style="font-size: 0.88rem; color: var(--text-main); line-height: 1.4;">${m.t}...</div>
      </div>
    `).join('');

    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const mcId = parseInt(item.dataset.mc);
        document.getElementById('globalSearchModal')?.classList.remove('open');
        this.loadLesson(mcId).then(() => {
          this.switchMode('study');
        });
      });
    });
  }

  // ================= Reset Progress Logic =================
  openResetModal() {
    const modal = document.getElementById('resetModal');
    if (!modal) return;
    const nameEl = document.getElementById('resetLessonName');
    if (nameEl && this.currentLessonData) {
      nameEl.textContent = `${this.currentLessonData.id}. ${this.currentLessonData.title}`;
    }
    modal.classList.add('open');
  }

  closeResetModal() {
    const modal = document.getElementById('resetModal');
    if (!modal) return;
    modal.classList.remove('open');
  }

  resetCurrentLessonProgress() {
    if (!this.currentLessonData) return;
    const lessonId = this.currentLessonData.id;
    const padId = lessonId.toString().padStart(2, '0');
    const prefix = `TM-R-${padId}-`;

    // Remove all answers matching this lesson
    let clearedCount = 0;
    Object.keys(this.userAnswers).forEach(key => {
      if (key.startsWith(prefix)) {
        delete this.userAnswers[key];
        clearedCount++;
      }
    });

    localStorage.setItem('tm_user_answers', JSON.stringify(this.userAnswers));
    this.sound.playClick();
    this.closeResetModal();
    this.updateBanner();
    this.renderLessonsList();
    this.renderCurrentView();

    this.showToast(`Lesson ${lessonId} reset! Cleared ${clearedCount} answered MCQs (0/42).`);
  }

  resetAllProgress() {
    const totalCleared = Object.keys(this.userAnswers).length;
    this.userAnswers = {};
    localStorage.removeItem('tm_user_answers');
    this.sound.playClick();
    this.closeResetModal();
    this.updateBanner();
    this.renderLessonsList();
    this.renderCurrentView();

    this.showToast(`All progress reset! Cleared ${totalCleared} answers across all 43 classes.`);
  }

  showToast(message) {
    let toast = document.getElementById('tmToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tmToast';
      toast.className = 'tm-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // ================= Bookmarked Questions Mode =================
  async renderBookmarksView() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (this.bookmarks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1.5rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🔖</span>
          <h3>No Bookmarked Questions Yet</h3>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">Click the star icon (☆) on any question in Study Mode to pin it here for focused revision.</p>
        </div>
      `;
      return;
    }

    if (!this.allQuestionsCache) {
      const res = await fetch('data/all_questions.json');
      this.allQuestionsCache = await res.json();
    }

    const savedQuestions = this.allQuestionsCache.filter(q => this.bookmarks.includes(q.global_id));

    savedQuestions.forEach(q => {
      const dummyLesson = { id: q.mc_id, title: q.title, department: q.dept };
      const card = this.createQuestionCard({
        num: q.q_num,
        tag: q.tag,
        category: q.category,
        text: q.text,
        options: q.options,
        correct_option: q.answer,
        explanation: q.explanation
      }, dummyLesson);
      container.appendChild(card);
    });
  }

  // ================= Flashcards Mode =================
  initFlashcardsMode() {
    this.flashcardIndex = 0;
    this.flashcardFlipped = false;
    this.renderFlashcard();
  }

  renderFlashcard() {
    const stage = document.getElementById('flashcardsStage');
    if (!stage || !this.currentLessonData) return;

    const questions = this.currentLessonData.questions;
    if (questions.length === 0) return;

    const q = questions[this.flashcardIndex];

    stage.innerHTML = `
      <div style="max-width: 650px; margin: 1.5rem auto;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <span style="font-weight: 700; color: var(--primary);">Card ${this.flashcardIndex + 1} of ${questions.length}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${q.tag}</span>
        </div>
        
        <div id="flashcardBox" style="background: var(--bg-card); border: 2px solid var(--border-color); border-radius: var(--radius-xl); padding: 2rem 1.5rem; min-height: 280px; display: flex; flex-direction: column; justify-content: center; cursor: pointer; transition: all 0.3s ease; box-shadow: var(--shadow-lg);">
          ${!this.flashcardFlipped ? `
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-bottom: 0.75rem;">Question Prompt (Click to reveal answer)</div>
            <div style="font-size: 1.08rem; line-height: 1.55; font-weight: 500;">${q.text}</div>
            <div style="margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
              ${['A', 'B', 'C', 'D', 'E'].map(k => q.options[k] ? `<div style="font-size: 0.88rem; color: var(--text-muted);"><strong>[${k}]</strong> ${q.options[k]}</div>` : '').join('')}
            </div>
          ` : `
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--success); margin-bottom: 0.75rem; font-weight: 700;">Correct Answer</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--success); padding: 1.25rem; background: var(--success-light); border-radius: var(--radius-md); border: 1px solid var(--success-border);">Option [${q.correct_option}]: ${q.options[q.correct_option] || ''}</div>
          `}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1.25rem; gap: 0.5rem;">
          <button class="filter-btn" id="btnPrevCard" ${this.flashcardIndex === 0 ? 'disabled' : ''} style="flex: 1; justify-content: center;">← Previous</button>
          <button class="filter-btn" id="btnFlipCard" style="flex: 1.5; justify-content: center; background: var(--primary); color: white; border-color: var(--primary); font-weight: 700;">
            ${this.flashcardFlipped ? 'Show Question' : 'Flip Card ↻'}
          </button>
          <button class="filter-btn" id="btnNextCard" ${this.flashcardIndex === questions.length - 1 ? 'disabled' : ''} style="flex: 1; justify-content: center;">Next →</button>
        </div>
      </div>
    `;

    document.getElementById('flashcardBox')?.addEventListener('click', () => {
      this.flashcardFlipped = !this.flashcardFlipped;
      this.sound.playClick();
      this.renderFlashcard();
    });

    document.getElementById('btnFlipCard')?.addEventListener('click', () => {
      this.flashcardFlipped = !this.flashcardFlipped;
      this.sound.playClick();
      this.renderFlashcard();
    });

    document.getElementById('btnPrevCard')?.addEventListener('click', () => {
      if (this.flashcardIndex > 0) {
        this.flashcardIndex--;
        this.flashcardFlipped = false;
        this.sound.playClick();
        this.renderFlashcard();
      }
    });

    document.getElementById('btnNextCard')?.addEventListener('click', () => {
      if (this.flashcardIndex < questions.length - 1) {
        this.flashcardIndex++;
        this.flashcardFlipped = false;
        this.sound.playClick();
        this.renderFlashcard();
      }
    });
  }

  // ================= Exam Mode =================
  initExamMode() {
    const stage = document.getElementById('examStage');
    if (!stage || !this.currentLessonData) return;

    stage.innerHTML = `
      <div class="exam-summary-card" style="text-align: left; max-width: 650px;">
        <h2 style="font-size: 1.4rem; margin-bottom: 0.5rem; color: var(--text-main);">⏱️ Timed Examination Mode</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.4rem;">Simulate real faculty and board testing conditions with countdown timing, neutral radio choices without spoilers, and a full diagnostic breakdown at the end.</p>
        
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <label style="font-size: 0.80rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Examination Scope</label>
            <select id="examScopeSelect" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main); font-size: 0.90rem; margin-top: 0.4rem;">
              <option value="lesson">Current Lesson (${this.currentLessonData.title}) • 42 MCQs</option>
              <option value="quick10">Quick Sprint (10 Random MCQs)</option>
              <option value="quick25">Standard Mock (25 Random MCQs)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.80rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Time Allowance</label>
            <select id="examTimeSelect" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main); font-size: 0.90rem; margin-top: 0.4rem;">
              <option value="42">1 minute per question (Standard Board Pace)</option>
              <option value="30">Speed Run (45 seconds per question)</option>
              <option value="0">Untimed Practice</option>
            </select>
          </div>
        </div>

        <button class="nav-tab-btn active" id="btnStartExam" style="width: 100%; justify-content: center; padding: 0.85rem; font-size: 1rem; border-radius: var(--radius-md);">
          Start Examination Now
        </button>
      </div>
    `;

    document.getElementById('btnStartExam')?.addEventListener('click', () => {
      this.sound.playClick();
      this.startExamSession();
    });
  }

  startExamSession() {
    const scope = document.getElementById('examScopeSelect')?.value || 'lesson';
    let examQuestions = [...this.currentLessonData.questions];

    if (scope === 'quick10') {
      examQuestions = examQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
    } else if (scope === 'quick25') {
      examQuestions = examQuestions.sort(() => 0.5 - Math.random()).slice(0, 25);
    }

    this.examState = {
      questions: examQuestions,
      answers: {},
      currentIndex: 0,
      startTime: Date.now(),
      submitted: false
    };

    this.renderExamInterface();
  }

  renderExamInterface() {
    const stage = document.getElementById('examStage');
    if (!stage || !this.examState) return;

    if (this.examState.submitted) {
      this.renderExamResults();
      return;
    }

    const q = this.examState.questions[this.examState.currentIndex];
    const selected = this.examState.answers[q.id];

    stage.innerHTML = `
      <div style="max-width: 800px; margin: 0.5rem auto;">
        <!-- Exam Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 0.85rem 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
          <div>
            <span style="font-weight: 700; color: var(--primary);">Question ${this.examState.currentIndex + 1} of ${this.examState.questions.length}</span>
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.15rem;">Answered: ${Object.keys(this.examState.answers).length}/${this.examState.questions.length}</div>
          </div>
          <button class="filter-btn" id="btnFinishExam" style="background: var(--danger-light); color: var(--danger); border-color: var(--danger-border); font-weight: 700;">
            Submit Exam
          </button>
        </div>

        <!-- Question Card -->
        <div class="question-card" style="margin-bottom: 1.25rem;">
          <div class="q-badge-group">
            <span class="q-num-badge">Q${q.num.toString().padStart(2, '0')}</span>
            <span class="q-tag-badge tag-exam">${q.tag}</span>
          </div>
          <div class="question-text">${q.text}</div>
          <div class="options-list">
            ${['A', 'B', 'C', 'D', 'E'].map(k => {
              if (!q.options[k]) return '';
              const isSel = selected === k;
              return `
                <button class="option-btn ${isSel ? 'active' : ''}" style="${isSel ? 'border-color: var(--primary); background: var(--primary-light);' : ''}" data-opt="${k}">
                  <span class="opt-letter" style="${isSel ? 'background: var(--primary); color: white;' : ''}">${k}</span>
                  <span class="opt-text">${q.options[k]}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <button class="filter-btn" id="btnExamPrev" ${this.examState.currentIndex === 0 ? 'disabled' : ''}>← Previous</button>
            <button class="filter-btn" id="btnExamNext" ${this.examState.currentIndex === this.examState.questions.length - 1 ? 'disabled' : ''}>Next →</button>
          </div>
          <!-- Palette Grid / Scroll -->
          <div style="display: flex; gap: 0.35rem; overflow-x: auto; padding: 0.4rem 0.2rem; -webkit-overflow-scrolling: touch;" id="examPalette">
            ${this.examState.questions.map((item, idx) => `
              <button class="filter-btn" style="min-width: 34px; height: 34px; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; ${this.examState.answers[item.id] ? 'background: var(--primary-light); color: var(--primary); font-weight: 700;' : ''} ${idx === this.examState.currentIndex ? 'border-color: var(--primary);' : ''}" data-idx="${idx}">
                ${idx + 1}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = btn.dataset.opt;
        this.examState.answers[q.id] = opt;
        this.sound.playClick();
        this.renderExamInterface();
      });
    });

    stage.querySelectorAll('#examPalette button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.examState.currentIndex = parseInt(btn.dataset.idx);
        this.sound.playClick();
        this.renderExamInterface();
      });
    });

    document.getElementById('btnExamPrev')?.addEventListener('click', () => {
      if (this.examState.currentIndex > 0) {
        this.examState.currentIndex--;
        this.sound.playClick();
        this.renderExamInterface();
      }
    });

    document.getElementById('btnExamNext')?.addEventListener('click', () => {
      if (this.examState.currentIndex < this.examState.questions.length - 1) {
        this.examState.currentIndex++;
        this.sound.playClick();
        this.renderExamInterface();
      }
    });

    document.getElementById('btnFinishExam')?.addEventListener('click', () => {
      if (confirm('Are you ready to submit your exam and view your score report?')) {
        this.examState.submitted = true;
        this.sound.playCorrect();
        this.renderExamResults();
      }
    });
  }

  renderExamResults() {
    const stage = document.getElementById('examStage');
    if (!stage || !this.examState) return;

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    this.examState.questions.forEach(q => {
      const ans = this.examState.answers[q.id];
      if (!ans) unanswered++;
      else if (ans === q.correct_option) correct++;
      else incorrect++;
    });

    const total = this.examState.questions.length;
    const pct = Math.round((correct / total) * 100);

    stage.innerHTML = `
      <div class="exam-summary-card">
        <h2 style="font-size: 1.5rem; color: var(--text-main);">Exam Performance Report</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.3rem;">Standard Faculty Diagnostic Evaluation</p>
        
        <div class="score-circle" style="--percent: ${pct};">
          <span class="score-text">${pct}%</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin: 1.25rem 0;">
          <div style="background: var(--success-light); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--success-border);">
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--success);">${correct}</div>
            <div style="font-size: 0.72rem; color: var(--text-main); font-weight: 600;">Correct</div>
          </div>
          <div style="background: var(--danger-light); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--danger-border);">
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--danger);">${incorrect}</div>
            <div style="font-size: 0.72rem; color: var(--text-main); font-weight: 600;">Incorrect</div>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-dim);">${unanswered}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Skipped</div>
          </div>
        </div>

        <div style="display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap;">
          <button class="nav-tab-btn active" id="btnRetakeExam" style="border-radius: var(--radius-md); padding: 0.6rem 1.1rem;">
            Retake Exam
          </button>
          <button class="filter-btn" id="btnBackToStudy" style="border-radius: var(--radius-md); padding: 0.6rem 1.1rem;">
            Back to Study Mode
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnRetakeExam')?.addEventListener('click', () => {
      this.initExamMode();
    });

    document.getElementById('btnBackToStudy')?.addEventListener('click', () => {
      this.switchMode('study');
    });
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
