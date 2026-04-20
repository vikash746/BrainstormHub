document.addEventListener('DOMContentLoaded', async () => {
  loadUserInfo();
  await loadAnalytics();
});

async function loadAnalytics() {
  try {
    const res = await fetch(`${API_URL}/analytics`, { headers: getHeaders() });
    const data = await res.json();
    
    document.getElementById('stat-total-votes').textContent = data.totalVotes;

    // Render Active Users
    const usersContainer = document.getElementById('active-users-list');
    usersContainer.innerHTML = '';
    
    if (data.activeUsers && data.activeUsers.length > 0) {
      data.activeUsers.forEach(u => {
        const idStr = u._id ? u._id.toString().substring(0,6) : 'Unknown';
        usersContainer.innerHTML += `
          <div class="activity-item">
            <div class="activity-user">
              <div class="avatar" style="width: 30px; height: 30px;">U</div>
              <div class="name">User (ID: ${idStr})</div>
            </div>
            <div class="activity-stat">${u.count} Ideas</div>
          </div>
        `;
      });
    } else {
      usersContainer.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">No active users yet.</div>';
    }

    // Render Category Popularity
    const catContainer = document.getElementById('category-chart');
    catContainer.innerHTML = '';
    
    if (data.categoryPopularity && data.categoryPopularity.length > 0) {
      const maxCat = Math.max(...data.categoryPopularity.map(c => c.count));

      data.categoryPopularity.forEach(cat => {
        const percentage = (cat.count / maxCat) * 100;
        const categoryLabel = cat._id ? cat._id : 'Uncategorized';
        catContainer.innerHTML += `
          <div class="bar-row">
            <div class="bar-label">${categoryLabel}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="bar-value">${cat.count}</div>
          </div>
        `;
      });
    } else {
      catContainer.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">No categories available yet.</div>';
    }

    // Render Top Ideas
    const ideasContainer = document.getElementById('top-ideas-grid');
    ideasContainer.innerHTML = '';
    
    if (data.topIdeas && data.topIdeas.length > 0) {
      data.topIdeas.forEach(idea => {
        ideasContainer.innerHTML += `
          <div class="card glass-panel" style="background: rgba(255,255,255,0.02);">
            <div style="display:flex; justify-content: space-between;">
               <span class="badge">${idea.category || 'Uncategorized'}</span>
               <span class="vote-count" style="color:var(--primary); font-size:14px;">${idea.votes} Votes</span>
            </div>
            <div class="card-title" style="margin-top: 8px;">${idea.title}</div>
            <div class="card-desc">${idea.description || ''}</div>
          </div>
        `;
      });
    } else {
      ideasContainer.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">No ideas created yet.</div>';
    }

  } catch (err) {
    console.error(err);
  }
}
