/* ═══════════════════════════════════════════════════════
   SymptomSense — AI-Powered Symptom Analysis Engine
   Powered by Groq (Aurex AI) + Supabase
   ═══════════════════════════════════════════════════════ */

// ── API Call ─────────────────────────────────────────────
async function analyzeWithAI(userInput) {
  const email = localStorage.getItem('symptomsense_user');

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: userInput, email: email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Analysis request failed (${response.status})`);
  }

  const result = await response.json();

  if (!result) {
    throw new Error('No response received from AI');
  }

  if (!result.severity || !result.causes || !result.care || !result.doctor || !result.tips) {
    throw new Error('AI response missing required fields');
  }

  return {
    severity: result.severity,
    matchedCount: result.matchedNames?.length || 0,
    matchedNames: result.matchedNames || [],
    comboAlerts: result.comboAlerts || [],
    causes: result.causes.slice(0, 3),
    care: result.care.slice(0, 3),
    doctor: result.doctor.slice(0, 3),
    tips: result.tips.slice(0, 2),
  };
}

// ── DOM Elements ─────────────────────────────────────────
const symptomInput = document.getElementById('symptom-input');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingOverlay = document.getElementById('loading');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const severityBadge = document.getElementById('severity-badge');
const validationMsg = document.getElementById('validation-msg');
const validationText = document.getElementById('validation-text');
const newAnalysisBtn = document.getElementById('new-analysis-btn');
const exampleChips = document.querySelectorAll('.example-chip');

// App Views & Nav Elements
const navItems = document.querySelectorAll('.nav-item');
const appViews = document.querySelectorAll('.app-view');
const viewAuth = document.getElementById('view-auth');
const viewChecker = document.getElementById('view-checker');
const historyContainer = document.getElementById('history-container');

// Auth Elements
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authBtn = document.getElementById('auth-btn');
const authSwapMode = document.getElementById('auth-swap-mode');
let isSignUpMode = false;

// Profile Elements
const profileName = document.getElementById('profile-name');
const profileAge = document.getElementById('profile-age');
const profileConditions = document.getElementById('profile-conditions');
const saveProfileBtn = document.getElementById('save-profile-btn');
const logoutBtn = document.getElementById('logout-btn');

// ── Initialization ───────────────────────────────────────
function initApp() {
  const user = localStorage.getItem('symptomsense_user');
  if (user) {
    document.body.classList.remove('auth-active');
    appViews.forEach(v => v.classList.remove('active'));
    viewChecker.classList.add('active');
    navItems.forEach(n => n.classList.remove('active'));
    navItems[0].classList.add('active');
    loadProfile();
    renderHistory();
  } else {
    document.body.classList.add('auth-active');
    appViews.forEach(v => v.classList.remove('active'));
    viewAuth.classList.add('active');
  }
}

// ── Event Listeners ──────────────────────────────────────

// Auth Logic
authBtn.addEventListener('click', () => {
  const email = authEmail.value.trim();
  const pass = authPassword.value.trim();

  if (!email || !pass) {
    alert('Please enter both email and password.');
    return;
  }

  authBtn.textContent = 'Authenticating...';
  setTimeout(() => {
    localStorage.setItem('symptomsense_user', email);
    authEmail.value = '';
    authPassword.value = '';
    authBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    initApp();
  }, 800);
});

authSwapMode.addEventListener('click', (e) => {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  document.querySelector('.auth-title').textContent = isSignUpMode ? 'Create Account' : 'Welcome Back';
  document.querySelector('.auth-subtitle').textContent = isSignUpMode ? 'Sign up to safely store your health logs' : 'Sign in to access your health data';
  authBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
  authSwapMode.textContent = isSignUpMode ? 'Sign in instead' : 'Sign up';
  const toggleText = authSwapMode.previousSibling;
  if (toggleText && toggleText.nodeType === 3) {
    toggleText.textContent = isSignUpMode ? 'Already have an account? ' : "Don't have an account? ";
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('symptomsense_user');
  initApp();
});

// Navigation Tabs
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    appViews.forEach(v => v.classList.remove('active'));
    item.classList.add('active');
    const targetId = item.dataset.target;
    document.getElementById(targetId).classList.add('active');
    if (targetId === 'view-history') renderHistory();
    window.scrollTo(0, 0);
  });
});

// Profile Saving
saveProfileBtn.addEventListener('click', () => {
  const profile = {
    name: profileName.value.trim(),
    age: profileAge.value.trim(),
    conditions: profileConditions.value.trim()
  };
  localStorage.setItem('symptomsense_profile', JSON.stringify(profile));

  const originalText = saveProfileBtn.textContent;
  saveProfileBtn.textContent = 'Saved!';
  saveProfileBtn.style.color = '#fff';
  saveProfileBtn.style.background = 'rgba(94, 234, 212, 0.4)';
  setTimeout(() => {
    saveProfileBtn.textContent = originalText;
    saveProfileBtn.style.color = '';
    saveProfileBtn.style.background = '';
  }, 2000);
});

function loadProfile() {
  const saved = localStorage.getItem('symptomsense_profile');
  if (saved) {
    try {
      const profile = JSON.parse(saved);
      profileName.value = profile.name || '';
      profileAge.value = profile.age || '';
      profileConditions.value = profile.conditions || '';
    } catch (e) { }
  }
}

// ── History Management (Supabase) ────────────────────────
async function renderHistory() {
  const email = localStorage.getItem('symptomsense_user');
  if (!email) return;

  historyContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>Loading your history...</p>
    </div>`;

  try {
    const response = await fetch(`/api/history?email=${encodeURIComponent(email)}`);
    const history = await response.json();

    if (!history || history.length === 0) {
      historyContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <p>No symptom history yet.</p>
        </div>`;
      return;
    }

    historyContainer.innerHTML = history.map(item => `
      <div class="history-card">
        <div class="history-header">
          <span class="severity-badge ${item.severity_level}" style="font-size: 0.65rem; padding: 2px 8px;">
            <span class="severity-dot"></span>${item.severity_label}
          </span>
          <span class="history-date">${new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="history-query">"${item.query}"</div>
        <div class="history-causes">Possible causes: ${item.causes.slice(0, 2).map(c => c.split('—')[0].trim()).join(', ')}...</div>
      </div>
    `).join('');

  } catch (e) {
    historyContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Could not load history.</p>
      </div>`;
  }
}

// Example chips
exampleChips.forEach(chip => {
  chip.addEventListener('click', () => {
    symptomInput.value = chip.dataset.text;
    symptomInput.focus();
    hideValidation();
  });
});

// Analyze button
analyzeBtn.addEventListener('click', handleAnalyze);

// Enter key (Ctrl+Enter to submit)
symptomInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    handleAnalyze();
  }
});

// New analysis
newAnalysisBtn.addEventListener('click', () => {
  resultsSection.classList.remove('active');
  resultsSection.style.display = 'none';
  symptomInput.value = '';
  symptomInput.focus();
  document.getElementById('input-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Hide validation on input
symptomInput.addEventListener('input', () => {
  if (symptomInput.value.trim().length >= 10) {
    hideValidation();
  }
});

// ── Main Analysis Handler ────────────────────────────────
async function handleAnalyze() {
  const input = symptomInput.value.trim();

  if (input.length < 10) {
    showValidation('Please describe your symptoms in more detail (at least 10 characters).');
    return;
  }

  hideValidation();
  analyzeBtn.disabled = true;
  loadingOverlay.classList.add('active');
  resultsSection.classList.remove('active');
  resultsSection.style.display = 'none';

  try {
    const result = await analyzeWithAI(input);
    loadingOverlay.classList.remove('active');
    analyzeBtn.disabled = false;
    showResults(result);
    renderHistory(); // ✅ Refresh history from Supabase after new analysis
  } catch (error) {
    loadingOverlay.classList.remove('active');
    analyzeBtn.disabled = false;
    console.error('Analysis error:', error);
    showErrorResults(error.message);
  }
}

// ── Show Results ─────────────────────────────────────────
function showResults(result) {
  const { severity, causes, care, doctor, tips, comboAlerts, matchedNames } = result;

  severityBadge.innerHTML = `
    <span class="severity-badge ${severity.level}">
      <span class="severity-dot"></span>
      ${severity.label} — ${severity.description}
    </span>
  `;

  const comboHTML = comboAlerts && comboAlerts.length > 0
    ? comboAlerts.map(ca => `
      <div class="result-card combo-alert-card">
        <div class="card-header">
          <div class="card-icon combo-alert">${ca.icon}</div>
          <h3 class="card-title">Critical Pattern Detected</h3>
        </div>
        <div class="combo-alert-body">
          <p>${ca.alert}</p>
        </div>
      </div>
    `).join('')
    : '';

  const detectedHTML = matchedNames && matchedNames.length > 0
    ? `<div class="detected-symptoms">
         <span class="detected-label">Detected:</span>
         ${matchedNames.map(n => `<span class="detected-chip">${n}</span>`).join('')}
       </div>`
    : '';

  resultsGrid.innerHTML = `
    ${comboHTML}
    ${detectedHTML}
    <div class="result-card">
      <div class="card-header">
        <div class="card-icon causes">🔍</div>
        <h3 class="card-title">Possible Causes</h3>
      </div>
      <ul class="card-list">
        ${causes.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
    <div class="result-card">
      <div class="card-header">
        <div class="card-icon care">💊</div>
        <h3 class="card-title">Self-Care Suggestions</h3>
      </div>
      <ul class="card-list">
        ${care.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
    <div class="result-card doctor-card">
      <div class="card-header">
        <div class="card-icon doctor">🚨</div>
        <h3 class="card-title">When to See a Doctor</h3>
      </div>
      <ul class="card-list">
        ${doctor.map(d => `<li>${d}</li>`).join('')}
      </ul>
    </div>
    <div class="result-card">
      <div class="card-header">
        <div class="card-icon tips">💡</div>
        <h3 class="card-title">Helpful Tips</h3>
      </div>
      <ul class="card-list">
        ${tips.map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>
    <div class="result-card disclaimer-card">
      <div class="card-header">
        <div class="card-icon disclaimer-icon-card">⚕️</div>
        <h3 class="card-title">Medical Disclaimer</h3>
      </div>
      <ul class="card-list">
        <li>This analysis is AI-generated and is <strong>not a medical diagnosis</strong>.</li>
        <li>Only a licensed healthcare provider can accurately diagnose and treat medical conditions.</li>
        <li>If you are experiencing a medical emergency, <strong>call 911 (US) or your local emergency number immediately</strong>.</li>
      </ul>
    </div>
  `;

  resultsSection.style.display = 'block';
  void resultsSection.offsetWidth;
  resultsSection.classList.add('active');

  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ── Error Results ────────────────────────────────────────
function showErrorResults(errorMessage) {
  severityBadge.innerHTML = '';

  resultsGrid.innerHTML = `
    <div class="result-card combo-alert-card">
      <div class="card-header">
        <div class="card-icon combo-alert">⚠️</div>
        <h3 class="card-title">Analysis Error</h3>
      </div>
      <div class="combo-alert-body">
        <p>We were unable to analyze your symptoms at this time.</p>
        <p style="margin-top: 8px; opacity: 0.8; font-weight: 400; font-size: 0.85rem;">${errorMessage}</p>
      </div>
    </div>
    <div class="result-card doctor-card">
      <div class="card-header">
        <div class="card-icon doctor">🩺</div>
        <h3 class="card-title">What You Can Do</h3>
      </div>
      <ul class="card-list">
        <li>Try again in a few moments — the AI service may be temporarily unavailable.</li>
        <li>Describe your symptoms in more detail for better analysis.</li>
        <li>If you're experiencing symptoms that concern you, always consult a healthcare professional.</li>
        <li>For emergencies, call your local emergency number (911 in the US) immediately.</li>
      </ul>
    </div>
  `;

  resultsSection.style.display = 'block';
  void resultsSection.offsetWidth;
  resultsSection.classList.add('active');

  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ── Validation Helpers ───────────────────────────────────
function showValidation(message) {
  validationText.textContent = message;
  validationMsg.classList.add('active');
  symptomInput.focus();
}

function hideValidation() {
  validationMsg.classList.remove('active');
}

// Initialize on load
initApp();
