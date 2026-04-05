'use strict';
// ══ PingIN Campaign Tool JS ══════════════════════════════════════════════════

const COMPANIES = [
  'TCS','Infosys','Wipro','HCL Technologies','Tech Mahindra','LTIMindtree',
  'Cognizant','Accenture','Capgemini','IBM India','Mphasis','Hexaware',
  'Persistent Systems','Coforge','Freshworks','Zoho','Chargebee','BrowserStack',
  'Flipkart','Amazon India','Swiggy','Zomato','Ola','Paytm','PhonePe','Razorpay',
  'CRED','Meesho','Nykaa','Zerodha','Groww','Byju\'s','Unacademy','upGrad',
  'HDFC Bank','ICICI Bank','SBI','Axis Bank','Kotak Mahindra Bank','Yes Bank',
  'Bajaj Finance','Goldman Sachs','JPMorgan','Deutsche Bank','Morgan Stanley',
  'Deloitte','PwC','EY','KPMG','McKinsey','BCG','Bain & Company',
  'Google India','Microsoft India','Oracle India','SAP India','Adobe India',
  'Cisco India','Intel India','Qualcomm India','Salesforce India',
  'Shell India','Honeywell India','GE India','Siemens India','Bosch India',
  'Tata Motors','Mahindra & Mahindra','Maruti Suzuki','Larsen & Toubro',
  'Reliance Industries','Jio','Airtel','Genpact','EXL Service','WNS',
];

const GEO = {
  'Hyderabad':'105556105','Mumbai':'106164952','Bengaluru':'105214831',
  'Delhi NCR':'100458144','Chennai':'106151043','Pune':'104869687',
  'Kolkata':'104536289','Noida':'106199869','Gurgaon':'102140765',
  'Ahmedabad':'106785562','Jaipur':'102671845',
};

const AV_COLORS = [
  ['rgba(0,119,181,.25)','#1A9ADE'],['rgba(29,158,117,.25)','#5DCAA5'],
  ['rgba(186,117,23,.25)','#EF9F27'],['rgba(212,83,126,.25)','#ED93B1'],
  ['rgba(0,212,170,.2)','#00D4AA'],  ['rgba(226,75,74,.2)','#F09595'],
];

let ST = {
  profiles: [], filter: 'all', currentPage: 1, lastParams: null,
  campaign: { running: false, paused: false },
};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  wireCompanyDD();
  wireCollegeDD();
  wireDegreeDD();
  wireMessage();
  wireBoolChips();
  wireFilters();

  // Enable profile type when keyword entered
  document.getElementById('s-keywords')?.addEventListener('input', e => {
    const pt = document.getElementById('s-profile-type');
    if (pt) pt.disabled = !e.target.value.trim();
  });
});

// ── Storage ───────────────────────────────────────────────────────────────────
function loadFromStorage() {
  try {
    ST.profiles = JSON.parse(localStorage.getItem('pingin_profiles') || '[]');
    const msg = localStorage.getItem('pingin_message');
    if (msg) {
      const ta = document.getElementById('c-message');
      if (ta) { ta.value = msg; updateCharCount(); updatePreview(); }
    }
    if (ST.profiles.length) showProfilesSection();
    renderProfiles();
    updateStats();
  } catch(e) { console.error(e); }
}
function save() { localStorage.setItem('pingin_profiles', JSON.stringify(ST.profiles)); }

// ── Company dropdown ──────────────────────────────────────────────────────────
function wireCompanyDD() {
  const inp = document.getElementById('s-company');
  const dd  = document.getElementById('dd-company');
  if (!inp || !dd) return;
  inp.addEventListener('input',  () => renderDD(dd, filterList(COMPANIES, inp.value), inp.value, v => inp.value = v));
  inp.addEventListener('focus',  () => renderDD(dd, filterList(COMPANIES, inp.value, 12), inp.value, v => inp.value = v));
  inp.addEventListener('click',  () => renderDD(dd, filterList(COMPANIES, inp.value, 12), inp.value, v => inp.value = v));
  inp.addEventListener('blur',   () => setTimeout(() => dd.style.display='none', 200));
}

// ── College dropdown ──────────────────────────────────────────────────────────
function wireCollegeDD() {
  const inp = document.getElementById('college-search');
  const dd  = document.getElementById('dd-college');
  const sel = document.getElementById('s-college');
  if (!inp || !dd || !sel) return;
  inp.addEventListener('input',  () => renderSelectDD(dd, sel, inp.value, v => { sel.value = v; inp.value = v; }));
  inp.addEventListener('focus',  () => renderSelectDD(dd, sel, inp.value, v => { sel.value = v; inp.value = v; }));
  inp.addEventListener('click',  () => renderSelectDD(dd, sel, inp.value, v => { sel.value = v; inp.value = v; }));
  inp.addEventListener('blur',   () => setTimeout(() => dd.style.display='none', 200));
}

// ── Degree dropdown ───────────────────────────────────────────────────────────
function wireDegreeDD() {
  const inp = document.getElementById('degree-search');
  const dd  = document.getElementById('dd-degree');
  const sel = document.getElementById('s-degree-type');
  if (!inp || !dd || !sel) return;
  inp.addEventListener('input',  () => renderSelectDD(dd, sel, inp.value, v => { sel.value = v; inp.value = v; }));
  inp.addEventListener('focus',  () => renderSelectDD(dd, sel, inp.value, v => { sel.value = v; inp.value = v; }));
  inp.addEventListener('click',  () => renderSelectDD(dd, sel, inp.value, v => { sel.value = v; inp.value = v; }));
  inp.addEventListener('blur',   () => setTimeout(() => dd.style.display='none', 200));
}

function renderDD(dd, items, query, onSelect) {
  if (!items.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = items.map(item => {
    const display = query
      ? item.replace(new RegExp('(' + escRe(query) + ')','gi'), '<mark>$1</mark>')
      : item;
    return `<div class="t-dd-item" data-val="${escAttr(item)}">${display}</div>`;
  }).join('');
  dd.style.display = 'block';
  dd.querySelectorAll('.t-dd-item').forEach(el => {
    el.addEventListener('mousedown', e => { e.preventDefault(); onSelect(el.dataset.val); dd.style.display = 'none'; });
  });
}

function renderSelectDD(dd, sel, query, onSelect) {
  const q = query.toLowerCase().trim();
  const opts = Array.from(sel.querySelectorAll('option'))
    .filter(o => o.value && (!q || o.text.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)))
    .slice(0, 12);
  if (!opts.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = opts.map(o => {
    const display = q ? o.text.replace(new RegExp('(' + escRe(q) + ')','gi'), '<mark>$1</mark>') : o.text;
    return `<div class="t-dd-item" data-val="${escAttr(o.value)}">${display}</div>`;
  }).join('');
  dd.style.display = 'block';
  dd.querySelectorAll('.t-dd-item').forEach(el => {
    el.addEventListener('mousedown', e => { e.preventDefault(); onSelect(el.dataset.val); dd.style.display = 'none'; });
  });
}

function filterList(arr, q, max = 12) {
  const ql = (q||'').toLowerCase().trim();
  const filtered = ql ? arr.filter(x => x.toLowerCase().includes(ql)) : arr.slice(0, max);
  return filtered.slice(0, max);
}

// ── Bool chips ────────────────────────────────────────────────────────────────
function wireBoolChips() {
  document.querySelectorAll('.t-chip[data-kw]').forEach(chip => {
    chip.addEventListener('click', () => {
      const inp = document.getElementById('s-keywords');
      if (!inp) return;
      const s = inp.selectionStart ?? inp.value.length;
      const e = inp.selectionEnd ?? inp.value.length;
      inp.value = inp.value.slice(0, s) + chip.dataset.kw + inp.value.slice(e);
      inp.focus();
    });
  });
  document.querySelectorAll('.t-chip[data-tag]').forEach(chip => {
    chip.addEventListener('click', () => {
      const ta = document.getElementById('c-message');
      if (!ta) return;
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + chip.dataset.tag + ta.value.slice(e);
      ta.selectionStart = ta.selectionEnd = s + chip.dataset.tag.length;
      ta.focus();
      updateCharCount(); updatePreview();
    });
  });
}

// ── Message ───────────────────────────────────────────────────────────────────
function wireMessage() {
  const ta = document.getElementById('c-message');
  if (!ta) return;
  ta.addEventListener('input', () => {
    updateCharCount(); updatePreview();
    localStorage.setItem('pingin_message', ta.value);
  });
  updateCharCount(); updatePreview();
}

function updateCharCount() {
  const ta = document.getElementById('c-message');
  const cc = document.getElementById('char-n');
  if (!ta || !cc) return;
  const n = ta.value.length;
  cc.textContent = n;
  cc.style.color = n > 300 ? '#E24B4A' : '#4A4E62';
}

function updatePreview() {
  const ta   = document.getElementById('c-message');
  const box  = document.getElementById('preview-box');
  const txt  = document.getElementById('preview-txt');
  if (!ta || !box || !txt) return;
  if (!ta.value.trim()) { box.style.display = 'none'; return; }
  const sample = ST.profiles.find(p => p.name) || { name:'Arjun Sharma', role:'Senior Product Manager', company:'Swiggy' };
  txt.textContent = personalize(ta.value, sample);
  box.style.display = 'block';
}

// ── Search ────────────────────────────────────────────────────────────────────
function doSearch() {
  const kw = document.getElementById('s-keywords')?.value?.trim();
  if (!kw) { showStatus('Enter keywords or a job title first.', 'warning'); return; }

  const params = {
    keywords:    kw,
    company:     document.getElementById('s-company')?.value?.trim() || '',
    location:    document.getElementById('s-location')?.value || '',
    degree:      document.getElementById('s-degree')?.value || '123',
    experience:  document.getElementById('s-experience')?.value || '',
    profileType: document.getElementById('s-profile-type')?.value || '',
    college:     document.getElementById('s-college')?.value || '',
    degreeType:  document.getElementById('s-degree-type')?.value || '',
  };
  ST.lastParams = params;
  ST.currentPage = 1;
  ST.profiles = []; // new search = clear
  save();

  const url = buildURL(params, 1);
  window.open(url, '_blank');

  // Show instruction + paste box
  const instr = document.getElementById('search-instr');
  const paste = document.getElementById('paste-box');
  const how   = document.getElementById('how-box');
  if (how)   how.style.display   = 'none';
  if (paste) paste.style.display = 'block';
  if (instr) {
    instr.style.display = 'block';
    instr.innerHTML = `<div style="background:rgba(0,119,181,.08);border:1px solid rgba(0,119,181,.18);border-radius:10px;padding:16px;font-size:13px;line-height:1.8;">
      <div style="font-weight:600;color:#F0F2F8;margin-bottom:8px;">✓ LinkedIn opened with your search filters!</div>
      <div style="color:#8B8FA8;">
        <b style="color:#F0F2F8">Option A — Chrome Extension (easiest):</b><br>
        The PingIN sidebar auto-appears on LinkedIn → profiles collect automatically → come back here to start campaign.<br><br>
        <b style="color:#F0F2F8">Option B — Paste URLs:</b><br>
        Copy profile URLs from LinkedIn and paste below.
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <a href="${escAttr(url)}" target="_blank" style="padding:7px 14px;background:#0077B5;color:white;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;">Open LinkedIn Again →</a>
        <a href="extension.html" style="padding:7px 14px;background:rgba(255,255,255,.06);color:#8B8FA8;border:1px solid rgba(255,255,255,.1);border-radius:7px;font-size:12px;text-decoration:none;">Get Extension</a>
      </div>
    </div>`;
  }
  renderProfiles();
  updateStats();
}

function nextPage() {
  if (!ST.lastParams) { showStatus('Run a search first.', 'warning'); return; }
  ST.currentPage++;
  const url = buildURL(ST.lastParams, ST.currentPage);
  window.open(url, '_blank');
  showStatus('Page ' + ST.currentPage + ' opened in new tab. Use extension to collect profiles.', 'info');
}

// ── Import pasted URLs ────────────────────────────────────────────────────────
function importURLs() {
  const raw = document.getElementById('paste-urls')?.value?.trim();
  if (!raw) { showStatus('Paste some LinkedIn profile URLs first.', 'warning'); return; }
  const urls = raw.split('\n').map(u => u.trim()).filter(u => u.includes('linkedin.com/in/'));
  if (!urls.length) { showStatus('No valid LinkedIn profile URLs found. URLs must contain linkedin.com/in/', 'warning'); return; }
  const existing = new Set(ST.profiles.map(p => p.profileUrl));
  const fresh = urls
    .map(u => u.split('?')[0])
    .filter(u => !existing.has(u))
    .map(u => ({
      name: nameFromURL(u), role:'', company:'', city:'',
      profileUrl: u, photo:'', status:'pending',
      keyword: ST.lastParams?.keywords || '', scrapedAt: new Date().toISOString(),
    }));
  ST.profiles = [...ST.profiles, ...fresh];
  save();
  showProfilesSection();
  renderProfiles();
  updateStats();
  showStatus('✓ ' + fresh.length + ' profiles added!', 'success');
  document.getElementById('paste-urls').value = '';
}

function nameFromURL(url) {
  const m = url.match(/\/in\/([^/?]+)/);
  if (!m) return 'LinkedIn Profile';
  return m[1].replace(/-\w+$/,'').split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

// ── Campaign ──────────────────────────────────────────────────────────────────
async function startCampaign() {
  const msg = document.getElementById('c-message')?.value?.trim();
  if (!msg) { showStatus('Write a message template first.', 'warning'); return; }
  const pending = ST.profiles.filter(p => p.status === 'pending');
  if (!pending.length) { showStatus('No pending profiles. Add profiles first.', 'warning'); return; }

  const limit   = parseInt(document.getElementById('c-limit')?.value) || 50;
  const toSend  = pending.slice(0, limit);
  const delayS  = parseInt(document.getElementById('c-delay')?.value) || 45;
  const random  = document.getElementById('c-random')?.checked;

  ST.campaign.running = true;
  ST.campaign.paused  = false;

  document.getElementById('btn-start').style.display = 'none';
  document.getElementById('btn-pause').style.display = 'inline-flex';
  document.getElementById('btn-stop').style.display  = 'inline-flex';
  document.getElementById('prog-wrap').style.display = 'block';

  showStatus('Campaign started! Sending to ' + toSend.length + ' profiles.', 'success');

  for (let i = 0; i < toSend.length; i++) {
    if (!ST.campaign.running) break;
    while (ST.campaign.paused && ST.campaign.running) await sleep(1000);
    if (!ST.campaign.running) break;

    const profile = toSend[i];
    const pct = Math.round(((i + 1) / toSend.length) * 100);
    setProg(pct, 'Sending to ' + profile.name + ' (' + (i+1) + '/' + toSend.length + ')');

    const idx = ST.profiles.findIndex(p => p.profileUrl === profile.profileUrl);
    if (idx >= 0) { ST.profiles[idx].status = 'sent'; ST.profiles[idx].sentAt = new Date().toISOString(); }
    save(); addFeedRow(profile.name, profile.role || '', 'sent');
    updateStats(); renderProfiles();

    const d = random ? Math.max(8, delayS + Math.floor(Math.random()*20 - 10)) : delayS;
    if (i < toSend.length - 1 && ST.campaign.running) await sleep(d * 1000);
  }

  finishCampaign();
}

function pauseCampaign() {
  ST.campaign.paused = !ST.campaign.paused;
  const btn = document.getElementById('btn-pause');
  if (btn) btn.textContent = ST.campaign.paused ? '▶ Resume' : '⏸ Pause';
  showStatus(ST.campaign.paused ? 'Campaign paused.' : 'Campaign resumed.', 'info');
}

function stopCampaign() {
  ST.campaign.running = false;
  finishCampaign();
}

function finishCampaign() {
  ST.campaign.running = false;
  document.getElementById('btn-start').style.display = 'inline-flex';
  document.getElementById('btn-pause').style.display = 'none';
  document.getElementById('btn-stop').style.display  = 'none';
  setProg(100, '✓ Campaign complete!');
  const sent = ST.profiles.filter(p => p.status==='sent').length;
  showStatus('✓ Campaign finished — ' + sent + ' sent.', 'success');
  save();
}

// ── Profiles ──────────────────────────────────────────────────────────────────
function wireFilters() {
  document.querySelectorAll('.t-fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.t-fbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ST.filter = btn.dataset.f;
      renderProfiles();
    });
  });
}

function showProfilesSection() {
  document.getElementById('how-box').style.display       = 'none';
  document.getElementById('profiles-section').style.display = 'block';
  document.getElementById('btn-start').style.display    = 'inline-flex';
}

function renderProfiles() {
  const grid  = document.getElementById('profiles-grid');
  const count = document.getElementById('prof-count');
  if (!grid) return;

  let list = ST.profiles;
  if (ST.filter !== 'all') list = list.filter(p => p.status === ST.filter);
  if (count) count.textContent = list.length + ' profiles';

  if (!list.length) {
    grid.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#4A4E62;grid-column:1/-1;font-size:13px;">
      <div style="font-size:32px;margin-bottom:10px;opacity:.3;">👥</div>
      ${ST.profiles.length ? 'No ' + ST.filter + ' profiles.' : 'No profiles yet. Use the Chrome Extension or paste URLs above.'}
    </div>`;
    return;
  }

  grid.innerHTML = list.slice(0, 100).map((p, i) => {
    const ini = (p.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const [bg, tc] = AV_COLORS[i % AV_COLORS.length];
    const role = (p.role||'').split(' at ')[0].slice(0,32);
    const avHtml = p.photo
      ? `<div class="t-pc-av"><img src="${escAttr(p.photo)}" alt="${ini}" onerror="this.parentNode.innerHTML='<span>${ini}</span>';this.parentNode.style.background='${bg}';this.parentNode.style.color='${tc}';"></div>`
      : `<div class="t-pc-av" style="background:${bg};color:${tc};">${ini}</div>`;
    return `<div class="t-pc">
      <div class="t-pc-top">
        ${avHtml}
        <div class="t-pc-info">
          <div class="t-pc-name">${escH(p.name||'')}</div>
          <div class="t-pc-role">${escH(role||p.company||'—')}</div>
          <div class="t-pc-city">${escH(p.city||'')}</div>
        </div>
      </div>
      <div class="t-pc-badges">
        <span class="t-badge ${p.status||'pending'}">${p.status||'pending'}</span>
        ${p.degree ? `<span class="t-badge degree">${escH(p.degree)}</span>` : ''}
        ${p.isOTW  ? `<span class="t-badge otw">OTW</span>`                 : ''}
      </div>
      <a class="t-pc-link" href="${escAttr(p.profileUrl||'#')}" target="_blank" rel="noopener">View on LinkedIn ↗</a>
    </div>`;
  }).join('') + (list.length > 100 ? `<div style="grid-column:1/-1;text-align:center;padding:16px;color:#4A4E62;font-size:12px;">+${list.length-100} more — export CSV to see all</div>` : '');
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function updateStats() {
  const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  set('sp-found',   ST.profiles.length);
  set('sp-sent',    ST.profiles.filter(p=>p.status==='sent').length);
  set('sp-pending', ST.profiles.filter(p=>p.status==='pending').length);
  set('sp-failed',  ST.profiles.filter(p=>p.status==='failed').length);
}

// ── Progress ───────────────────────────────────────────────────────────────────
function setProg(pct, txt) {
  const fill = document.getElementById('prog-fill');
  const ptxt = document.getElementById('prog-txt');
  const ppct = document.getElementById('prog-pct');
  if (fill) fill.style.width = pct + '%';
  if (ptxt) ptxt.textContent = txt;
  if (ppct) ppct.textContent = pct + '%';
}

function addFeedRow(name, role, status) {
  const feed = document.getElementById('live-feed');
  if (!feed) return;
  const row = document.createElement('div');
  row.className = 't-lf-row';
  row.innerHTML = `<div class="t-lf-dot ${status}"></div><span style="font-weight:600;color:#F0F2F8;flex-shrink:0;">${escH(name.split(' ')[0])}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 6px;">${escH(role.slice(0,28))}</span><span style="font-size:10px;flex-shrink:0;color:${status==='sent'?'#5DCAA5':'#F09595'}">${status}</span>`;
  feed.insertBefore(row, feed.firstChild);
  while (feed.children.length > 6) feed.removeChild(feed.lastChild);
}

// ── Status ────────────────────────────────────────────────────────────────────
function showStatus(msg, type) {
  const el = document.getElementById('t-status');
  if (!el) return;
  el.className = 't-status ' + type;
  el.textContent = msg;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => el.style.display='none', 5000);
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV() {
  if (!ST.profiles.length) { showStatus('No profiles to export.', 'warning'); return; }
  const hdr  = ['Name','Role','Company','City','Degree','Open To Work','LinkedIn URL','Status','Keyword','Scraped At'];
  const rows = ST.profiles.map(p => [p.name,p.role||'',p.company||'',p.city||'',p.degree||'',p.isOTW?'Yes':'No',p.profileUrl||'',p.status||'',p.keyword||'',p.scrapedAt||'']);
  const csv  = [hdr,...rows].map(r => r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
    download: 'pingin_' + new Date().toISOString().slice(0,10) + '.csv',
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function clearAll() {
  if (!confirm('Clear all ' + ST.profiles.length + ' profiles?')) return;
  ST.profiles = [];
  save();
  renderProfiles();
  updateStats();
  document.getElementById('profiles-section').style.display = 'none';
  document.getElementById('how-box').style.display          = 'block';
  document.getElementById('btn-start').style.display        = 'none';
  document.getElementById('prog-wrap').style.display        = 'none';
  const instr = document.getElementById('search-instr');
  const paste = document.getElementById('paste-box');
  if (instr) instr.style.display = 'none';
  if (paste) paste.style.display = 'none';
}

// ── Build LinkedIn URL ────────────────────────────────────────────────────────
function buildURL(p, page) {
  const NET = {'1':['F'],'2':['S'],'3':['O'],'12':['F','S'],'23':['S','O'],'123':['F','S','O']};
  const TYPE = {
    'open':'"open to work" OR "#opentowork"','immediate':'"immediate joiner" OR "available immediately"',
    'layoff':'"laid off" OR "#opentowork"','looking':'"looking for change" OR "open to opportunities"',
    'fresher':'"fresher" OR "entry level"','leadership':'CEO OR CTO OR "VP" OR "Director"',
    'gcc':'GCC OR "Global Capability Centre"','startup':'"startup" OR "funded"',
    'hiring':'"recruiter" OR "talent acquisition"',
  };
  const EXP  = {'1':'1','2':'2','3':'3','4':'4','5':'5'};
  const EXPKW= {'6':'"10+ years"','7':'"15+ years"','8':'"20+ years"'};

  let kw = p.keywords || '';
  if (p.profileType && TYPE[p.profileType]) kw = kw ? `(${kw}) AND (${TYPE[p.profileType]})` : TYPE[p.profileType];
  if (p.experience && EXPKW[p.experience])  kw = kw ? `(${kw}) AND (${EXPKW[p.experience]})` : EXPKW[p.experience];
  if (p.college)   kw = kw ? `(${kw}) AND "${p.college}"`   : `"${p.college}"`;
  if (p.degreeType)kw = kw ? `(${kw}) AND "${p.degreeType}"`: `"${p.degreeType}"`;
  if (p.company)   kw = kw ? `(${kw}) AND "${p.company}"`   : `"${p.company}"`;

  let url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(kw)}&network=${encodeURIComponent(JSON.stringify(NET[p.degree]||['F','S','O']))}&origin=FACETED_SEARCH`;
  if (p.location && GEO[p.location]) url += `&geoUrn=${encodeURIComponent('urn:li:geo:'+GEO[p.location])}`;
  if (p.experience && EXP[p.experience] && parseInt(p.experience) <= 5)
    url += `&yearsOfExperience=${encodeURIComponent(JSON.stringify([EXP[p.experience]]))}`;
  if (page > 1) url += `&page=${page}`;
  return url;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function personalize(t, p) {
  const role = (p.role||'').split(' at ')[0].trim() || 'your field';
  return t.replace(/{FirstName}/g,(p.name||'').split(' ')[0]||'there').replace(/{Role}/g,role).replace(/{Company}/g,p.company||'your company');
}
function escH(s)    { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function escRe(s)   { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function sleep(ms)  { return new Promise(r=>setTimeout(r,ms)); }
