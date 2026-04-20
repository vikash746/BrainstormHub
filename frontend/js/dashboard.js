document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  fetchSessions();

  // Modal logic
  const modal = document.getElementById('session-modal');
  document.getElementById('btn-create-session').addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('close-session-modal').addEventListener('click', () => modal.classList.remove('active'));

  // Form submit
  document.getElementById('form-session').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('session-title').value;
    const description = document.getElementById('session-desc').value;
    const category = document.getElementById('session-category').value;

    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, description, category })
      });
      if (res.ok) {
        modal.classList.remove('active');
        document.getElementById('form-session').reset();
        fetchSessions();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create session');
      }
    } catch (err) {
      alert('Error creating session');
    }
  });
});

async function fetchSessions() {
  const container = document.getElementById('sessions-container');
  try {
    const res = await fetch(`${API_URL}/sessions`, { headers: getHeaders() });
    const sessions = await res.json();
    
    container.innerHTML = '';
    if (sessions.length === 0) {
      container.innerHTML = `<div class="empty-state glass-panel" style="grid-column: 1 / -1; margin-top: 24px;">
        <h3>No sessions yet</h3>
        <p>Create your first brainstorming session and start capturing ideas!</p>
      </div>`;
      return;
    }

    sessions.forEach(session => {
      const card = document.createElement('div');
      card.className = 'card glass-panel animate-fade-in';
      card.onclick = () => window.location.href = `session.html?id=${session._id}`;
      
      const date = new Date(session.date).toLocaleDateString();
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="card-title">${session.title}</div>
          <span class="badge">${session.category || 'General'}</span>
        </div>
        <div class="card-desc">${session.description || 'No description provided.'}</div>
        <div class="card-footer">
          <span>By: ${session.createdBy.name}</span>
          <span>${date}</span>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}
