const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('id');

if (!sessionId) window.location.href = 'dashboard.html';

const socket = io('http://localhost:5000');
let ideasData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = loadUserInfo();
  await fetchSessionDetails();
  await fetchIdeas();

  socket.emit('join-session', sessionId);
  
  socket.on('new-idea', (idea) => {
    ideasData.push(idea);
    renderIdeas();
  });

  socket.on('vote-update', ({ ideaId, votes }) => {
    const ideaInfo = ideasData.find(i => i._id === ideaId);
    if (ideaInfo) {
      ideaInfo.votes = votes;
      renderIdeas();
    }
  });

  socket.on('new-comment', (comment) => {
    // If the comment section is open, append it
    const commentsList = document.getElementById(`comments-list-${comment.ideaId}`);
    if (commentsList) {
      commentsList.insertAdjacentHTML('beforeend', createCommentHTML(comment));
    }
  });

  socket.on('notification', (notif) => {
    alert(`Notification: ${notif.message}`); // Basic notification
  });

  // Modal
  const modal = document.getElementById('idea-modal');
  document.getElementById('btn-add-idea').addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('close-idea-modal').addEventListener('click', () => modal.classList.remove('active'));

  // Filters and Sorting
  document.getElementById('category-filter').addEventListener('change', renderIdeas);
  document.getElementById('sort-select').addEventListener('change', async () => {
    await fetchIdeas(); // Refetch with sort backend logic
  });

  // Form submit
  document.getElementById('form-idea').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('idea-title').value;
    const category = document.getElementById('idea-category').value;
    const tags = document.getElementById('idea-tags').value;
    const desc = document.getElementById('idea-desc').innerHTML;
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('category', category);
    formData.append('tags', tags);

    const fileInput = document.getElementById('idea-attachments');
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('attachments', fileInput.files[i]);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/ideas/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // FormData sets Content-Type boundary automatically
        body: formData
      });
      if (res.ok) {
        modal.classList.remove('active');
        document.getElementById('form-idea').reset();
        document.getElementById('idea-desc').innerHTML = '';
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('Error adding idea');
    }
  });
});

function formatDoc(cmd, value=null) {
  document.execCommand(cmd, false, value);
}

function addLink() {
  const url = prompt('Insert url');
  if (url) formatDoc('createLink', url);
}

async function fetchSessionDetails() {
  try {
    const res = await fetch(`${API_URL}/sessions/${sessionId}`, { headers: getHeaders() });
    const session = await res.json();
    document.getElementById('session-header-title').textContent = session.title;
    document.getElementById('session-header-desc').textContent = session.description || '';
    document.getElementById('nav-session-title').textContent = session.title;
  } catch (err) { console.error(err); }
}

async function fetchIdeas() {
  try {
    const sort = document.getElementById('sort-select').value;
    const res = await fetch(`${API_URL}/ideas/session/${sessionId}?sort=${sort}`, { headers: getHeaders() });
    ideasData = await res.json();
    renderIdeas();
  } catch (err) { console.error(err); }
}

function renderIdeas() {
  const container = document.getElementById('ideas-container');
  const filter = document.getElementById('category-filter').value;
  
  const filteredIdeas = filter === 'All' 
    ? ideasData 
    : ideasData.filter(idea => idea.category === filter);

  container.innerHTML = '';
  if (filteredIdeas.length === 0) {
    container.innerHTML = `<div class="empty-state glass-panel" style="grid-column: 1 / -1;">
        <h3>No ideas yet</h3><p>Be the first to share your thoughts!</p>
      </div>`;
    return;
  }

  const maxVotes = Math.max(...ideasData.map(i => i.votes));
  const user = JSON.parse(localStorage.getItem('user'));

  filteredIdeas.forEach(idea => {
    const card = document.createElement('div');
    const isTopIdea = idea.votes === maxVotes && idea.votes > 0;
    
    card.className = `card glass-panel idea-card animate-fade-in ${isTopIdea ? 'top-idea' : ''}`;
    
    const hasVoted = idea.voters.includes(user.id);
    const voteBtnStyle = hasVoted ? `background: var(--primary); color: white; cursor: default;` : '';
    const voteDisabled = hasVoted ? 'disabled' : '';

    let tagsHtml = idea.tags ? idea.tags.map(t => `<span class="tag-badge">#${t}</span>`).join('') : '';
    
    let statusClass = 'status-under';
    if (idea.status === 'Approved') statusClass = 'status-approved';
    if (idea.status === 'Rejected') statusClass = 'status-rejected';

    let attachmentsHtml = '';
    if (idea.attachments && idea.attachments.length > 0) {
      attachmentsHtml = '<div style="margin-top: 12px; font-size: 12px;"><strong>Attachments:</strong><br>';
      idea.attachments.forEach(att => {
        const fileUrl = 'http://localhost:5000/' + att.replace(/\\/g, '/');
        attachmentsHtml += `<a href="${fileUrl}" target="_blank" style="color: var(--primary); margin-right:8px;">View File</a>`;
      });
      attachmentsHtml += '</div>';
    }

    let adminControls = '';
    if (user.role === 'Admin' || user.role === 'Moderator') {
      adminControls = `
        <div style="margin-top: 12px; font-size: 12px;">
          Set Status: 
          <select class="glass-input" style="width: auto; padding: 4px 8px; margin: 0; font-size: 12px;" onchange="updateStatus('${idea._id}', this.value)">
            <option value="Under Review" ${idea.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
            <option value="Approved" ${idea.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Rejected" ${idea.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      `;
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span class="badge" style="margin-right: 8px;">${idea.category || 'Uncategorized'}</span>
          <span class="status-badge ${statusClass}">${idea.status}</span>
        </div>
        <div class="vote-controls">
          <span class="vote-count">${idea.votes}</span>
          <button class="vote-btn" ${voteDisabled} style="${voteBtnStyle}" onclick="voteIdea('${idea._id}', event)">▲</button>
        </div>
      </div>
      <div class="card-title" style="margin-top: 8px;">${idea.title}</div>
      <div style="margin-bottom: 8px;">${tagsHtml}</div>
      <div class="card-desc" style="display:block; -webkit-line-clamp:none;">${idea.description || ''}</div>
      ${attachmentsHtml}
      ${adminControls}
      <button class="btn btn-secondary" style="margin-top: 16px; width: 100%;" onclick="toggleComments('${idea._id}')">View Comments</button>
      <div id="comments-section-${idea._id}" class="comments-section" style="display:none;">
         <div id="comments-list-${idea._id}">Loading...</div>
         <div style="margin-top: 12px; display: flex; gap: 8px;">
            <input type="text" id="comment-input-${idea._id}" class="glass-input" style="margin-bottom: 0;" placeholder="Add comment... @mention allowed">
            <button class="btn btn-primary" onclick="postComment('${idea._id}')">Post</button>
         </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function voteIdea(ideaId, e) {
  e.stopPropagation();
  try {
    const res = await fetch(`${API_URL}/ideas/${ideaId}/vote`, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else {
        const idea = ideasData.find(i => i._id === ideaId);
        if (idea) idea.voters.push(JSON.parse(localStorage.getItem('user')).id);
    }
  } catch (err) { console.error(err); }
}

async function updateStatus(ideaId, status) {
  try {
    const res = await fetch(`${API_URL}/ideas/${ideaId}/status`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) fetchIdeas(); // Refetch
    else alert(data.error);
  } catch(err) { console.error(err); }
}

async function toggleComments(ideaId) {
  const section = document.getElementById(`comments-section-${ideaId}`);
  const list = document.getElementById(`comments-list-${ideaId}`);
  if (section.style.display === 'none') {
    section.style.display = 'block';
    // Fetch comments
    const res = await fetch(`${API_URL}/comments/idea/${ideaId}`, { headers: getHeaders() });
    const comments = await res.json();
    list.innerHTML = comments.map(c => createCommentHTML(c)).join('');
  } else {
    section.style.display = 'none';
  }
}

function createCommentHTML(c) {
  const mentionFormatted = c.content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  const date = new Date(c.createdAt).toLocaleString();
  return `
    <div class="comment ${c.parentId ? 'reply' : ''}">
      <div class="comment-header">
        <span class="comment-author">${c.userId.name || c.userId}</span>
        <span class="comment-time">${date}</span>
      </div>
      <div class="comment-body">${mentionFormatted}</div>
    </div>
  `;
}

async function postComment(ideaId) {
  const input = document.getElementById(`comment-input-${ideaId}`);
  const content = input.value;
  if (!content.trim()) return;

  try {
    const res = await fetch(`${API_URL}/comments/idea/${ideaId}`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ content })
    });
    if (res.ok) {
      input.value = '';
      // Event handling does append automatically via socket, but if not we can manually fetch
    }
  } catch(err) { console.error(err); }
}
