const STORAGE_KEY = 'skoonize_paiements_v1';

function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function formatF(n) {
  return Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' F';
}

let overrides = loadOverrides();

function getEffective(student) {
  const o = overrides[student.id];
  if (!o) return { paye: student.paye, reste: student.reste, statut: student.statut };
  return o;
}

function getState() {
  return STUDENTS.map(s => ({ ...s, ...getEffective(s) }));
}

function populateClasseFilter() {
  const sel = document.getElementById('filter-classe');
  const classes = [...new Set(STUDENTS.map(s => s.classe))].sort();
  classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function applyHeader() {
  document.getElementById('school-name').textContent = CONFIG.schoolName;
  document.getElementById('annee-scolaire').textContent = 'Année scolaire ' + CONFIG.anneeScolaire;
  document.title = 'Registre de recouvrement — ' + CONFIG.schoolName;
}

function renderStats(data) {
  const totalEleves = data.length;
  const totalPaye = data.reduce((a, s) => a + s.paye, 0);
  const totalReste = data.reduce((a, s) => a + s.reste, 0);
  const totalPotentiel = totalPaye + totalReste;
  const tauxRecouvrement = totalPotentiel > 0 ? (100 * totalPaye / totalPotentiel) : 0;
  const nonSoldes = data.filter(s => s.reste > 0).length;

  document.getElementById('hero-amount').textContent = formatF(totalReste);
  document.getElementById('hero-sub').textContent =
    `${nonSoldes} élève${nonSoldes > 1 ? 's' : ''} sur ${totalEleves} n'${nonSoldes > 1 ? 'ont' : 'a'} pas soldé`;

  document.getElementById('stats').innerHTML = `
    <div class="ledger-item">
      <div class="num">${totalEleves}</div>
      <div class="lbl">Élèves</div>
    </div>
    <div class="ledger-item accent">
      <div class="num">${tauxRecouvrement.toFixed(1)}%</div>
      <div class="lbl">Recouvré</div>
    </div>
    <div class="ledger-item">
      <div class="num">${formatF(totalPaye)}</div>
      <div class="lbl">Encaissé</div>
    </div>
    <div class="ledger-item">
      <div class="num">${formatF(totalReste)}</div>
      <div class="lbl">Reste dû</div>
    </div>
  `;
}

function renderList() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  const niveau = document.getElementById('filter-niveau').value;
  const classe = document.getElementById('filter-classe').value;
  const statut = document.getElementById('filter-statut').value;

  const all = getState();
  renderStats(all);

  let filtered = all.filter(s => {
    if (query && !s.nom.toLowerCase().includes(query)) return false;
    if (niveau && s.niveau !== niveau) return false;
    if (classe && s.classe !== classe) return false;
    if (statut && s.statut !== statut) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (a.reste !== b.reste) return b.reste - a.reste;
    return a.nom.localeCompare(b.nom);
  });

  const list = document.getElementById('student-list');
  const empty = document.getElementById('empty-state');

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = filtered.map(s => {
    const pct = s.total > 0 ? Math.min(100, Math.round(100 * s.paye / s.total)) : 100;
    const isSoldee = s.reste <= 0;
    return `
      <div class="student-row" data-id="${s.id}">
        <div class="row-top">
          <span class="name">${s.nom}</span>
          <span class="dots"></span>
          <span class="classe">${s.classe}</span>
        </div>
        <div class="row-bottom">
          <div class="amounts"><b>${formatF(s.paye)}</b> / ${formatF(s.total)}</div>
          <div class="meter"><div class="meter-fill ${isSoldee ? 'full' : ''}" style="width:${pct}%"></div></div>
          <span class="stamp ${isSoldee ? 'soldee' : 'due'}">${isSoldee ? 'SOLDÉE' : 'DOIT ' + formatF(s.reste)}</span>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.student-row').forEach(row => {
    row.addEventListener('click', () => openModal(parseInt(row.dataset.id)));
  });
}

function openModal(id) {
  const base = STUDENTS.find(s => s.id === id);
  const student = { ...base, ...getEffective(base) };
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  modal.innerHTML = `
    <h2>${student.nom}</h2>
    <div class="modal-classe">${student.niveau.toUpperCase()} · ${student.classe}</div>
    <div class="modal-row"><span>Total scolarité</span><span>${formatF(student.total)}</span></div>
    <div class="modal-row"><span>Déjà payé</span><span>${formatF(student.paye)}</span></div>
    <div class="modal-row"><span>Reste dû</span><span>${formatF(student.reste)}</span></div>
    <div class="modal-form">
      <label for="payment-input">Enregistrer un versement (F CFA)</label>
      <input type="number" id="payment-input" min="0" max="${student.reste}" placeholder="ex : 10000">
      <div class="modal-actions">
        <button class="btn btn-ghost" id="close-modal">Annuler</button>
        <button class="btn btn-primary" id="record-payment">Enregistrer</button>
      </div>
      ${student.reste > 0 ? `<div class="modal-actions" style="margin-top:10px;">
        <button class="btn btn-success" id="mark-soldee">Marquer comme soldée</button>
      </div>` : ''}
    </div>
  `;

  overlay.hidden = false;

  document.getElementById('close-modal').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.getElementById('record-payment').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('payment-input').value);
    if (!val || val <= 0) return;
    const newPaye = Math.min(student.total, student.paye + val);
    const newReste = student.total - newPaye;
    overrides[id] = { paye: newPaye, reste: newReste, statut: newReste <= 0 ? 'Soldée' : 'Non Soldée' };
    saveOverrides(overrides);
    closeModal();
    renderList();
  });

  const markBtn = document.getElementById('mark-soldee');
  if (markBtn) {
    markBtn.addEventListener('click', () => {
      overrides[id] = { paye: student.total, reste: 0, statut: 'Soldée' };
      saveOverrides(overrides);
      closeModal();
      renderList();
    });
  }
}

function closeModal() {
  document.getElementById('modal-overlay').hidden = true;
}

document.getElementById('search').addEventListener('input', renderList);
document.getElementById('filter-niveau').addEventListener('change', renderList);
document.getElementById('filter-classe').addEventListener('change', renderList);
document.getElementById('filter-statut').addEventListener('change', renderList);
document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Effacer tous les paiements enregistrés localement ? Cette action est irréversible.')) {
    overrides = {};
    saveOverrides(overrides);
    renderList();
  }
});

applyHeader();
populateClasseFilter();
renderList();
