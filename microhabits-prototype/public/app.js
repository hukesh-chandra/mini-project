const socket = io();
let currentUser = null;
let currentHabitId = null;

async function fetchMe() {
  const r = await fetch('/api/me');
  const data = await r.json();
  currentUser = data.user;
  if (currentUser) {
    document.getElementById('login').style.display = 'none';
    document.getElementById('logout').style.display = 'inline';
    // register socket
    socket.emit('register', currentUser._id);
  } else {
    document.getElementById('login').style.display = 'inline';
    document.getElementById('logout').style.display = 'none';
  }
}

async function loadHabits() {
  const r = await fetch('/api/habits');
  const data = await r.json();
  const container = document.getElementById('habits');
  container.innerHTML = '';
  data.habits.forEach(h => {
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.innerHTML = `
      <h3>${h.title}</h3>
      <p>${h.description || ''}</p>
      <small>By ${h.creator ? h.creator.displayName : 'Unknown'}</small>
      <div class="actions">
        <button onclick='joinHabit("${h._id}")'>Join</button>
        <button onclick='openProofs("${h._id}", "${h.title}")'>View/Upload Proofs</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function createHabit() {
  const title = document.getElementById('habit-title').value;
  const description = document.getElementById('habit-desc').value;
  const r = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  if (r.ok) {
    await loadHabits();
    alert('Created');
  } else {
    alert('Please login to create a habit');
  }
}

async function joinHabit(id) {
  const r = await fetch(`/api/habits/${id}/join`, { method: 'POST' });
  if (r.ok) {
    alert('Joined');
    await loadHabits();
  } else {
    alert('Login required');
  }
}

function openProofs(id, title) {
  currentHabitId = id;
  document.getElementById('current-habit-title').innerText = title;
  document.getElementById('proofs').style.display = 'block';
  loadProofs(id);
}

document.getElementById('create-btn').addEventListener('click', createHabit);
document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentHabitId) return alert('Select a habit first');
  const fileInput = document.getElementById('media');
  if (!fileInput.files.length) return alert('Choose a file');
  const form = new FormData();
  form.append('media', fileInput.files[0]);
  const r = await fetch(`/api/habits/${currentHabitId}/proof`, {
    method: 'POST',
    body: form
  });
  if (r.ok) {
    alert('Proof uploaded');
    loadProofs(currentHabitId);
  } else {
    const err = await r.json();
    alert('Upload failed: ' + (err.error || ''));
  }
});

async function loadProofs(habitId) {
  const r = await fetch(`/api/habits/${habitId}/proofs`);
  const data = await r.json();
  const list = document.getElementById('proofs-list');
  list.innerHTML = '';
  data.proofs.forEach(p => {
    const el = document.createElement('div');
    el.className = 'proof';
    el.innerHTML = `
      <div>
        <strong>${p.user.displayName}</strong> - ${new Date(p.createdAt).toLocaleString()}
      </div>
      <div class="media-preview">
        ${p.mediaType === 'image' ? `<img src="${p.mediaUrl}" alt="proof" />` : `<a href="${p.mediaUrl}" target="_blank">Open file</a>`}
      </div>
      <div>
        Verified: ${p.verifiedBy.length} | Rejected: ${p.rejectedBy.length}
        <button onclick='verifyProof("${p._id}", "verify")'>Verify</button>
        <button onclick='verifyProof("${p._id}", "reject")'>Reject</button>
      </div>
    `;
    list.appendChild(el);
  });
}

async function verifyProof(proofId, action) {
  const r = await fetch(`/api/proofs/${proofId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  if (r.ok) {
    loadProofs(currentHabitId);
  } else {
    alert('Login required');
  }
}

// realtime updates
socket.on('new-proof', data => {
  // notify user and reload if viewing same habit
  alert('New proof uploaded in a habit you are a member of');
  if (data.habitId === currentHabitId) loadProofs(currentHabitId);
});

socket.on('proof-verified', data => {
  alert('One of your proofs was verified/rejected');
  if (currentHabitId) loadProofs(currentHabitId);
});

// init
(async function init(){
  await fetchMe();
  await loadHabits();
})();
