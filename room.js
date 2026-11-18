(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const invite = (params.get('room') || '').toUpperCase();
  const transfer = /^#transfer=([a-f0-9-]{36})$/.exec(location.hash)?.[1];
  const boardCode = params.get('host');
  if (!invite && !boardCode && !params.has('online')) return;

  const CODE = /^\d{3}$/;
  const sessionKey = 'dem-lang-session-870';
  const phaseNames = {lobby:'Phòng chờ',dealt:'Đang nhận vai',day:'Ngày',night:'Đêm',finished:'Đã kết thúc'};
  const keys = Object.keys(ROLES).sort((a,b) => ROLES[a].name.localeCompare(ROLES[b].name,'vi'));
  const read = (key,permanent=false) => {
    try { return JSON.parse((permanent ? localStorage : sessionStorage).getItem(key)); } catch { return null; }
  };
  function store(key,value,permanent=false) {
    try {
      const storage = permanent ? localStorage : sessionStorage;
      if (value === null) storage.removeItem(key);
      else storage.setItem(key,JSON.stringify(value));
      return true;
    } catch { return false; }
  }

  let session = read(sessionKey);
  if (!CODE.test(session?.code || '') || (invite && invite !== session.code)) session = null;
  const savedSession = () => read(sessionKey+'-'+(invite || boardCode || read(sessionKey+'-last',true)),true);
  if (boardCode && !session) session = savedSession();
  let pane = 'people', confirmation = false, updatedCard = false;
  let roomMarkup = new Map();
  let view, shown, stamp, busy = false, syncing = false, board = false, blocked = false;
  let notice = '', query = '', roleLimitVisible = 20, refreshInFlight = false, revealAttempt = 0, syncReadback = false;
  let draft = session?.host ? read('dl-deck-'+session.code) : null;
  let chosenPreset = '';
  let localBoard;
  const status = () => document.getElementById('roomStatus');
  const roomPath = endpoint => 'rooms/'+session.code+'/'+endpoint;
  const boardKey = () => 'dl-board-'+session.token;

  async function request(path, payload) {
    const response = await fetch(new URL('api/'+path,location.href), {
      method:payload === undefined ? 'GET' : 'POST',
      cache:'no-store',
      headers:{
        ...(session?.token ? {Authorization:'Bearer '+session.token} : {}),
        ...(payload === undefined ? {} : {'Content-Type':'application/json'})
      },
      body:payload === undefined ? undefined : JSON.stringify(payload),
      signal:AbortSignal.timeout(10000)
    });
    const data = await response.json().catch(() => null);
    if (!data || !response.ok) {
      throw Object.assign(new Error(data?.error || 'Không kết nối được máy chủ phòng. Kiểm tra mạng và địa chỉ Cloudflare.'),{status:response.status});
    }
    return data;
  }
  function tell(message) {
    notice = message;
    if (status()) status().textContent = message;
  }
  function remember(value) {
    if (!value && session) {
      const key=sessionKey+'-'+session.code;
      if (read(key,true)?.token === session.token) {
        store(key,null,true);
        if (read(sessionKey+'-last',true) === session.code) store(sessionKey+'-last',null,true);
      }
    }
    session = value;
    store(sessionKey,value);
    if (value) {
      store(sessionKey+'-'+value.code,value,true);
      store(sessionKey+'-last',value.code,true);
    }
  }
  function setDraft(value) {
    draft = value;
    store('dl-deck-'+session.code,value);
  }
  function suggest(count,preset=recommendedPreset('new',count)) {
    return {count, counts:presetDeck(preset,count),rules:{},pool:[]};
  }
  function total() {
    return Object.values(draft?.counts || {}).reduce((sum,n) => sum+n,0);
  }

  function deckRows() {
    const count = total();
    const filtered = keys.filter(k => roleMatches(k,query,'all'));
    return filtered.slice(0,roleLimitVisible).map(k => {
      const role = ROLES[k], selected = draft.counts[k] || 0;
      return `<div class="role-row"><div class="role-symbol role-symbol-art">${roleArtwork(k)}</div>
        <div class="role-info"><button class="role-title" data-room="info" data-key="${k}">${esc(role.name)}</button><small>${esc(role.english)}</small>
        ${role.houseRule && selected ? `<label class="field"><span>Luật nhóm</span><textarea maxlength="1500" data-room-rule="${k}">${esc(draft.rules[k] || '')}</textarea></label>` : ''}
        ${role.english === 'Custom Random Role' && selected ? '<button class="secondary" data-room="pool">Chọn danh sách rút</button>' : ''}</div>
        <div class="room-stepper"><button class="secondary" data-room="minus" data-key="${k}" aria-label="Bớt ${esc(role.name)}" ${selected ? '' : 'disabled'}>−</button>
        <b>${selected}</b><button class="secondary" data-room="plus" data-key="${k}" aria-label="Thêm ${esc(role.name)}" ${count >= draft.count || selected >= roleLimit(k) ? 'disabled' : ''}>+</button></div></div>`;
    }).join('') || '<p>Không tìm thấy vai.</p>';
  }
  function updateMore() {
    const more = document.getElementById('roomMore');
    const remaining = keys.filter(k => roleMatches(k,query,'all')).length - roleLimitVisible;
    more.hidden = remaining <= 0;
    more.textContent = 'Xem thêm '+Math.min(20,remaining)+' vai';
  }
  function additions() {
    const missing=draft.count-total();
    if (missing <= 0) return null;
    const recommended=suggest(draft.count).counts;
    const counts={...draft.counts}, added={};
    function add(key,n) {if(n>0){counts[key]=(counts[key] || 0)+n;added[key]=n;}}
    const wolves=Object.entries(counts).reduce((n,[k,v])=>n+(ROLES[k]?.group==='wolf'?v:0),0);
    const moreWolves=Math.min(missing,Math.max(0,(recommended.wolf || 1)-wolves));
    add('wolf',moreWolves);
    add('villager',missing-moreWolves);
    return {counts,label:Object.entries(added).map(([key,n])=>n+' '+ROLES[key].name).join(', ')};
  }
  function additionButton() {
    const plan=additions();
    return plan ? `<button class="secondary" data-room="complete-deck">Bổ sung ${esc(plan.label)}</button>` : '';
  }
  function refreshDeck() {
    const rows = document.getElementById('roomDeckRows');
    const offset = rows.scrollTop;
    rows.innerHTML = deckRows();
    rows.scrollTop = offset;
    document.getElementById('roomDeckCount').textContent = total()+' / '+draft.count+' vai';
    document.getElementById('roomDeal').disabled = total() !== draft.count;
    document.getElementById('roomAdditions').innerHTML=additionButton();
    updateMore();
  }
  function picker(count) {
    if (count < 5) return '<p>Cần ít nhất 5 người chơi để chia vai.</p>';
    if (draft?.count !== count) {
      if (!draft) setDraft(suggest(count));
      else {
        const next = structuredClone(draft);
        next.count = count;
        next.counts = trimRoleSelection(next.counts,count).roles;
        setDraft(next);
      }
    }
    return `<section class="room-panel"><h2>Bộ vai</h2><p id="roomDeckCount">${total()} / ${count} vai</p>
      <label class="field"><span>Bộ vai theo nhóm</span><select id="roomPreset">
        ${Object.entries(SETUP_PROFILES).filter(([key]) => presetAvailable(key,count)).map(([key,preset]) =>
          `<option value="${key}" ${key === (chosenPreset || recommendedPreset('new',count)) ? 'selected' : ''}>${esc(preset.name)}</option>`).join('')}
      </select></label><button class="secondary" data-room="suggest">Áp dụng bộ vai</button>
      <label class="field"><span>Tìm vai theo tên Việt hoặc Anh</span><input id="roomRoleSearch" value="${esc(query)}" placeholder="Ví dụ: Thợ săn" autocomplete="off"></label>
      <div id="roomAdditions">${additionButton()}</div><div id="roomDeckRows" class="catalog-scroll">${deckRows()}</div>
      <div class="room-deck-actions"><button class="secondary" id="roomMore" data-room="more">Xem thêm 20 vai</button><button class="primary" id="roomDeal" data-room="deal" ${total() === count ? '' : 'disabled'}>Chia vai</button></div></section>`;
  }
  function showPool() {
    modal.innerHTML = `<div class="dialog-head"><h2>Vai có thể rút</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div>
      <div class="catalog-scroll">${keys.filter(k => !ROLES[k].random && !ROLES[k].houseRule).map(k =>
        `<label class="pool-row"><input type="checkbox" data-room-pool value="${k}" ${draft.pool?.includes(k) ? 'checked' : ''}>
        <span>${esc(ROLES[k].name)}<small>${esc(ROLES[k].english)}</small></span></label>`).join('')}</div>`;
    modal.showModal();
  }
  modal.addEventListener('change',event => {
    if (event.target.hasAttribute('data-room-pool')) {
      draft.pool = Array.from(modal.querySelectorAll('[data-room-pool]:checked'),input => input.value);
      setDraft(draft);
    }
  });
  function card() {
    if (!view.self?.hasCard) return '';
    if (!shown) return `<section class="room-panel room-card"><h2>Thẻ của bạn</h2>
      <label class="room-privacy"><input type="checkbox" id="roomPrivacy" ${confirmation ? 'checked' : ''}>Chỉ mình tôi đang nhìn màn hình.</label>
      <button class="primary" id="roomReveal" data-room="reveal" ${confirmation ? '' : 'disabled'}>${updatedCard ? 'Xem thẻ mới' : 'Xem vai của tôi'}</button></section>`;
    const role = ROLES[shown.role];
    return `<section class="room-panel room-card">${roleArtwork(shown.role,true)}
      <p>${esc(shown.team || role.team)}</p><h2>${esc(role.name)}</h2>
      <p>${esc(roleSummary(role))}</p><button class="secondary" data-room="info" data-key="${shown.role}">Xem chi tiết vai</button>
      ${shown.houseRule ? `<p class="room-message">${esc(shown.houseRule)}</p>` : ''}
      <button class="primary" data-room="hide">Che thẻ</button></section>`;
  }
  function patchRegions(container, sections, cache) {
    let cursor = container.firstElementChild;
    for (const [key,html] of Object.entries(sections)) {
      let region = cache.get(key)?.node;
      if (!region) {
        region = document.createElement('div');
        container.insertBefore(region,cursor);
      } else if (region !== cursor) {
        container.insertBefore(region,cursor);
      }
      cursor = region.nextElementSibling;
      if (cache.get(key)?.html === html) continue;
      const active = region.contains(document.activeElement) ? document.activeElement : null;
      const offset = region.querySelector('#roomDeckRows')?.scrollTop || 0;
      const template = document.createElement('template');
      template.innerHTML = html;
      for (const disclosure of template.content.querySelectorAll('details')) {
        const label=disclosure.querySelector('summary')?.textContent.split(' (')[0];
        const previous=[...region.querySelectorAll('details')].find(node =>
          node.querySelector('summary')?.textContent.split(' (')[0] === label);
        if (previous) disclosure.open=previous.open;
      }
      let preserved, start, end;
      if (active?.matches('input,textarea,select')) {
        start = active.selectionStart;
        end = active.selectionEnd;
        const marker = active.id ? '#'+CSS.escape(active.id) : active.dataset.roomRule ?
          '[data-room-rule="'+CSS.escape(active.dataset.roomRule)+'"]' : '[name="'+CSS.escape(active.name)+'"]';
        const replacement = template.content.querySelector(marker);
        if (replacement) {
          if (active.tagName === 'SELECT') {
            if ([...replacement.options].some(option => option.value === active.value)) replacement.value = active.value;
          } else {
            replacement.value = active.value;
            replacement.checked = active.checked;
          }
          preserved = replacement;
        }
      }
      region.replaceChildren(template.content);
      const rows = region.querySelector('#roomDeckRows');
      if (rows) rows.scrollTop = offset;
      if (preserved) {
        preserved.focus({preventScroll:true});
        if (start != null && end != null) preserved.setSelectionRange(start,end);
      }
      cache.set(key,{node:region,html});
    }
    for (const [key,entry] of cache) {
      if (!Object.hasOwn(sections,key)) {entry.node.remove();cache.delete(key);}
    }
  }
  function ballotOptions(players,choice) {
    return `<option value="">Bỏ qua</option>${players.filter(p => p.alive).map(p =>
      `<option value="${p.id}" ${p.id === choice ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}`;
  }
  function voteResult(ballot,players) {
    if (ballot?.status !== 'published') return '';
    const entries=Object.entries(ballot.tally).sort((a,b)=>b[1]-a[1]);
    return `<h3>Kết quả bỏ phiếu</h3>${entries.length ? '<ul>'+entries.map(([id,n]) =>
      '<li>'+esc(players.find(p=>p.id===id)?.name || '')+' · '+n+' phiếu</li>').join('')+'</ul>' : '<p>Không có phiếu hợp lệ.</p>'}`;
  }
  function playerVote(current) {
    const {ballot,players}=current;
    if (!ballot) return '';
    if (ballot.status === 'published') return `<section class="room-panel" aria-live="polite">${voteResult(ballot,players)}</section>`;
    if (ballot.status === 'locked') return '<section class="room-panel"><h2>Đã khóa phiếu</h2><p>Chờ quản trò công bố kết quả.</p></section>';
    return `<section class="room-panel"><h2>Bỏ phiếu</h2>${ballot.canVote ?
      `<form id="roomVote" data-ballot="${ballot.id}"><label class="field"><span>Chọn người bị loại</span>
      <select id="roomVoteTarget" name="target">${ballotOptions(players,ballot.choice)}</select></label>
      <button class="primary">${ballot.choice === undefined ? 'Gửi phiếu' : 'Cập nhật phiếu'}</button>
      ${ballot.choice === undefined ? '' : '<p>Đã gửi phiếu.</p>'}</form>` : '<p>Bạn không có quyền bỏ phiếu lượt này.</p>'}</section>`;
  }
  function peopleList(current) {
    const {host,phase,players,self}=current;
    const rows=players.map(p => `<li><div><strong>${esc(p.name)}${p.id === self?.id ? ' (bạn)' : ''}</strong>
      ${!p.alive ? '<small>Đã bị loại</small>' : ''}
      ${host ? `<small>${p.bot ? 'Bot thử nghiệm' : p.connected ? 'Đang kết nối' : 'Tạm mất kết nối'}${phase === 'lobby' ? '' : p.seen ? ' · Đã mở thẻ' : ' · Chưa mở thẻ'}</small>` : ''}</div>
      ${host ? `${p.bot ? '' : `<button class="secondary" data-room="transfer" data-id="${p.id}">Chuyển máy</button>`}
      ${phase === 'lobby' ? `<button class="secondary" data-room="remove" data-id="${p.id}">Xóa</button>` : ''}` : ''}</li>`).join('');
    return host ? `<section class="room-panel"><h2>Người chơi (${players.length}/24)</h2>
      ${phase === 'lobby' ? `<button class="secondary" data-room="add-bot" ${players.length + (current.waitingCount || 0) >= 24 ? 'disabled' : ''}>Thêm bot</button>` : ''}
      <ol class="room-players">${rows}</ol></section>` :
      `<details class="room-panel"><summary>Người chơi (${players.length}/24)</summary><ol class="room-players">${rows}</ol></details>`;
  }
  function rankings(current,expanded=false) {
    const rows=[...current.leaderboard].sort((a,b)=>b.wins-a.wins || a.name.localeCompare(b.name,'vi'));
    let rank=0;
    const list=rows.map((entry,i)=>{
      if (!i || entry.wins !== rows[i-1].wins) rank=i+1;
      return `<tr><td>${rank}</td><th scope="row">${esc(entry.name)}</th><td>${entry.wins}</td><td>${entry.played}</td></tr>`;
    }).join('');
    return `<details class="room-panel" ${expanded ? 'open' : ''}><summary>Bảng xếp hạng</summary>
      <p>${current.completedGames} ván đã tính kết quả</p>
      ${current.completedGames ? `<table class="room-rankings"><thead><tr><th scope="col">Hạng</th><th scope="col">Người chơi</th><th scope="col">Thắng</th><th scope="col">Đã chơi</th></tr></thead><tbody>${list}</tbody></table><button class="secondary" data-room="export-ranks">Tải bảng điểm CSV</button>` : '<p>Bảng điểm cập nhật khi quản trò công bố kết quả ván đầu tiên.</p>'}
    </details>`;
  }
  function waitingList(current) {
    if (!current.host || !current.waitingCount) return '';
    return `<section class="room-panel"><h2>Chờ ván sau (${current.waitingCount})</h2><ul class="room-players">
      ${current.waitingPlayers.map(p=>`<li><div>${esc(p.name)}</div><button class="secondary" data-room="remove-waiting"
        data-id="${p.id}" aria-label="Bỏ chỗ chờ của ${esc(p.name)}">Bỏ chỗ chờ</button></li>`).join('')}
    </ul></section>`;
  }
  function renderRoom() {
    page = 'online';
    document.querySelectorAll('.nav').forEach(el => el.classList.toggle('active',el.hasAttribute('href')));
    let container = document.getElementById('roomRegions');
    if (!container) {
      app.innerHTML = '<div class="room-wrap"><p class="room-status" id="roomStatus" role="status"></p><div id="roomRegions"></div></div>';
      container = document.getElementById('roomRegions');
      roomMarkup = new Map();
    }
    const sections = {};
    if (!session) {
      sections.entry = `<div class="page-heading"><h1>${CODE.test(invite) ? 'Vào phòng '+invite : 'Chơi nhiều máy'}</h1></div>
      <div class="room-entry">
      ${CODE.test(invite) ? '' : '<section class="room-panel"><h2>Quản trò</h2><button class="primary" data-room="create">Tạo phòng</button></section>'}
      <section class="room-panel"><form id="roomJoin">
      ${CODE.test(invite) ? '' : `<label class="field"><span>Mã phòng</span><input name="code" inputmode="numeric" pattern="[0-9]{3}" maxlength="3" required autocomplete="off"></label>`}
      <label class="field"><span>Tên người chơi</span><input name="name" maxlength="28" required autocomplete="off"></label>
      <button class="primary">Vào phòng</button></form>
      ${savedSession() ? '<button class="secondary" data-room="recover-local">Khôi phục phiên</button>' : ''}
      </section></div>`;
    } else if (!view) {
      sections.loading = '<p>Đang kết nối với phòng…</p>'+(boardCode ? '<a class="secondary" href="?online=1">Về phòng</a>' : '');
    } else if (view.waiting) {
      sections.head=`<section class="room-panel"><h1>Chờ ván sau</h1><p>Phòng <code class="room-code">${view.code}</code> · Ván ${view.gameNumber}</p>
        <p>Bạn đã giữ chỗ. Khi quản trò mở ván tiếp theo, bạn sẽ tự vào danh sách chơi.</p></section>`;
    } else {
      const {host,phase,round,players,message,report,code}=view;
      const url=new URL(location.pathname,location.origin);
      url.searchParams.set('room',code);
      sections.head = `<section class="room-panel"><h1>${phaseNames[phase]}${['day','night'].includes(phase) ? ' '+round : ''}</h1>
        <p>Mã phòng <code class="room-code">${code}</code> · Ván ${view.gameNumber}</p>
        ${host ? `<input id="roomInvite" aria-label="Link tham gia" readonly value="${esc(url.href)}"><div class="room-buttons">
          <button class="secondary" data-room="copy">Sao chép link</button><button class="secondary" data-room="qr">Hiện mã QR</button></div>` : ''}
        <p>Phòng hết hạn lúc ${new Date(view.expires).toLocaleString('vi-VN')}</p>
        ${host && phase === 'lobby' ? '<button class="secondary" data-room="transfer-host">Chuyển quản trò</button>' : ''}
        ${host && phase !== 'lobby' ? '<p>Mở bảng quản trò để chuyển quyền kèm trạng thái ván.</p>' : ''}
        ${message ? `<p class="room-message">${esc(message)}</p>` : ''}
        ${report && phase === 'day' ? `<p class="room-message">${esc(report)}</p>` : ''}
        ${!host && phase === 'lobby' ? '<p>Đang đợi quản trò chia vai.</p>' : ''}
        ${host && phase === 'finished' ? '<button class="primary" data-room="next-game">Chơi ván tiếp theo</button>' : ''}
        ${!host && phase === 'finished' ? '<p>Giữ trang này để vào ván tiếp theo cùng nhóm.</p>' : ''}
        ${host && phase !== 'lobby' ? `<p>${players.filter(p=>p.seen).length} / ${players.length} người đã mở thẻ.</p><a class="primary" href="?host=${code}">Mở bảng quản trò</a>` : ''}</section>`;
      if (view.waitingCount) sections.waiting=waitingList(view);
      sections[phase === 'finished' ? 'final-ranks' : 'ranks']=rankings(view,phase === 'finished');
      if (host && phase === 'lobby') {
        sections.tabs=`<div class="room-buttons" aria-label="Thiết lập phòng">
          <button class="secondary" data-room="pane" data-key="people" aria-pressed="${pane==='people'}">Người chơi (${players.length})</button>
          <button class="secondary" data-room="pane" data-key="deck" aria-pressed="${pane==='deck'}">Bộ vai</button></div>`;
        if (pane === 'deck') sections.deck=picker(players.length);
        else sections.people=peopleList(view);
      } else {
        if (!host) {sections.card=card();sections.vote=playerVote(view);}
        sections.people=peopleList(view);
      }
    }
    if (session) sections.leave=view?.waiting
      ? '<button class="text-btn" data-room="leave-waiting">Rời phòng chờ</button>'
      : '<button class="text-btn" data-room="leave">Quên phiên trên thiết bị</button>';
    patchRegions(container,sections,roomMarkup);
    tell(notice);
    if (document.getElementById('roomMore')) updateMore();
  }
  function hide() {
    revealAttempt++;
    const wasOpen=!!shown || confirmation;
    shown=null;
    confirmation=false;
    if (wasOpen && page === 'online') {
      if (modal.open) modal.close();
      renderRoom();
    }
  }

  let connectionError=false;
  async function refresh() {
    if (!session || board || refreshInFlight) return;
    const current = session;
    refreshInFlight = true;
    try {
      const next = await request(roomPath('state'));
      if (session !== current || page !== 'online') return;
      if (view?.gameNumber && next.gameNumber !== view.gameNumber) {hide();updatedCard=false;}
      if (view?.gameNumber === next.gameNumber && view?.self?.cardVersion && next.self?.cardVersion !== view.self.cardVersion) {
        updatedCard=true;
        hide();
      }
      if (connectionError) {connectionError=false;tell('');}
      const serialized = JSON.stringify(next);
      if (serialized === stamp) return;
      stamp = serialized;
      view = next;
      renderRoom();
    } catch(error) {
      if (session !== current) return;
      if ([401,404].includes(error.status)) {
        remember(null);
        view = null;
        stamp = undefined;
        hide();
        if (page === 'online') renderRoom();
      }
      connectionError=true;
      tell(error.message);
    } finally { refreshInFlight = false; }
  }

  function projection() {
    const g = state.game;
    const phase = g.stage === 'ready' ? 'dealt' : g.stage === 'manual-over' ? 'finished' : g.mod.phase;
    return {
      phase, round:phase === 'dealt' ? 0 : g.round,
      report:phase === 'day' ? g.mod.report.join('\n').slice(0,1500).trim() : '',
      winnerIds:phase === 'finished' ? g.mod.winnerIds.map(id=>g.players.find(p=>p.id===id)?.roomId).filter(Boolean) : [],
      result:phase === 'finished' ? g.mod.result.slice(0,300).trim() : '',
      players:g.players.map(p => ({id:p.roomId,role:p.role,alive:p.alive,team:p.modTeam,weight:Math.max(0,state.game.skills ? skillVotes(p) : Math.min(20,p.modVotes)),deadVotes:p.modDeadVotes}))
    };
  }
  function serverMatches(server,data) {
    return server.phase === data.phase && server.round === data.round && (server.report || '') === (data.report || '') &&
      (data.phase !== 'finished' || (server.message === (data.result || 'Quản trò đã kết thúc ván.') &&
        JSON.stringify(server.winnerIds) === JSON.stringify(data.winnerIds))) &&
      data.players.every((p,i) => {
        const s = server.players[i];
        return p.id === s?.id && p.alive === s.alive && p.role === s.role && p.team === s.team && p.weight === s.weight && p.deadVotes === !!s.deadVotes;
      });
  }
  function boardStatus(message) {
    document.getElementById('boardConnection').textContent = message;
  }
  async function sync() {
    if (!board || syncing || blocked) return;
    const next = projection(), fingerprint = JSON.stringify(next);
    if (localBoard.sent === fingerprint) return;
    syncing = true;
    try {
      if (syncReadback) {
        const server = await request(roomPath('state'));
        if (server.revision !== localBoard.revision &&
            (server.revision !== localBoard.revision+1 || !serverMatches(server,JSON.parse(localBoard.pending)))) {
          blocked = true;
          throw Error('Bảng này không còn là phiên điều khiển mới nhất. Đóng các tab quản trò khác rồi mở lại bảng.');
        }
        if (server.revision !== localBoard.revision) {
          localBoard.revision = server.revision;
          localBoard.sent = localBoard.pending;
        }
        syncReadback = false;
      }
      if (localBoard.sent !== fingerprint) {
        localBoard.pending = fingerprint;
        store(boardKey(),localBoard,true);
        const result = await request(roomPath('action'),{kind:'sync',revision:localBoard.revision,...next});
        localBoard.revision = result.revision;
        localBoard.sent = fingerprint;
      }
      localBoard.pending = null;
      store(boardKey(),localBoard,true);
      boardStatus('Đã đồng bộ với phòng '+session.code);
    } catch(error) {
      syncReadback = !blocked;
      if ([401,404].includes(error.status)) blocked = true;
      boardStatus('Chưa đồng bộ · '+error.message);
    } finally { syncing = false; }
  }
  function saveBoard() {
    localBoard.game = state.game;
    const saved = store(boardKey(),localBoard,true);
    if (!saved) boardStatus('Không lưu được bảng quản trò trên máy này. Giữ tab này mở.');
    void sync();
    return saved;
  }
  let boardReading=false, boardView;
  const boardMarkup=new Map(), boardRankMarkup=new Map();
  async function refreshBoard() {
    if (!board || boardReading || blocked) return;
    boardReading=true;
    try {
      boardView=await request(roomPath('state'));
      const {players,ballot,phase}=boardView;
      const submitted=ballot?.votes || {};
      const eligible=players.filter(p => p.canVote);
      document.getElementById('boardReadiness').textContent=
        players.filter(p=>p.seen).length+' / '+players.length+' đã mở thẻ'+(boardView.waitingCount ? ' · '+boardView.waitingCount+' chờ ván sau' : '');
      const waiting=players.filter(p=>!p.seen || !p.connected);
      const people=waiting.length ? '<ul>'+waiting.map(p=>'<li>'+esc(p.name)+
        (p.seen?'':' · Chưa mở thẻ')+(p.connected?'':' · Tạm mất kết nối')+'</li>').join('')+'</ul>' : '<p>Mọi người đã mở thẻ và đang kết nối.</p>';
      const counts=ballot ? `<p>${eligible.filter(p=>Object.hasOwn(submitted,p.id)).length} / ${eligible.length} người đã gửi phiếu.</p>` : '';
      const active=['open','locked'].includes(ballot?.status);
      const vote=phase==='day' ? `<div class="room-buttons">
        ${active ? '' : '<button class="primary" data-room="ballot-open">Mở lượt bỏ phiếu</button>'}
        ${ballot?.status==='open' ? '<button class="primary" data-room="ballot-lock">Khóa lượt</button>' : ''}
        ${ballot?.status==='locked' ? '<button class="primary" data-room="ballot-publish">Công bố kết quả</button>' : ''}
        ${active ? '<button class="secondary" data-room="ballot-discard">Hủy lượt</button>' : ''}</div>${counts}
        ${active ? `<details><summary>Ai đã gửi phiếu?</summary><ul>${eligible.map(p=>'<li>'+esc(p.name)+(Object.hasOwn(submitted,p.id)?' · Đã gửi':' · Chưa gửi')+'</li>').join('')}</ul></details>
        <form id="roomOverride"><label class="field"><span>Nhập phiếu hộ</span><select id="roomOverrideVoter" name="voter">${eligible.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Chọn người bị loại</span><select id="roomOverrideTarget" name="target">${ballotOptions(players)}</select></label>
        <button class="secondary" ${eligible.length ? '' : 'disabled'}>Lưu phiếu hộ</button></form>` : ''}
        ${voteResult(ballot,players)}
        ${ballot?.status==='published' ? '<button class="secondary" data-room="ballot-import">Đưa phiếu vào sổ quản trò</button>' : ''}` : '<p>Có thể mở lượt bỏ phiếu vào ban ngày.</p>';
      patchRegions(document.getElementById('boardRoomTools'),{people,waiting:waitingList(boardView),vote},boardMarkup);
      patchRegions(document.getElementById('boardRanks'),{
        next:phase === 'finished' ? '<button class="primary" data-room="next-game">Chơi ván tiếp theo</button>' : '',
        [phase === 'finished' ? 'final-ranks' : 'ranks']:rankings(boardView,phase === 'finished')
      },boardRankMarkup);
    } catch(error) {
      boardStatus('Không cập nhật được phòng · '+error.message);
    } finally {boardReading=false;}
  }
  async function openBoard() {
    if (!session?.host || session.code !== boardCode) return tell('Hãy mở bảng từ phiên quản trò đã tạo phòng.');
    try {
      const server = await request(roomPath('state'));
      if (!server.host || server.phase === 'lobby') return tell('Hãy chia vai trước khi mở bảng quản trò.');
      state = structuredClone(DEFAULT);
      state.settings.mode = 'moderator';
      state.houseRules = server.houseRules;
      localBoard = read(boardKey(),true);
      const reusable = (localBoard?.gameNumber || 1) === server.gameNumber && localBoard?.game?.players?.every((p,i) => p.roomId === server.players[i]?.id) &&
        localBoard.game.players.length === server.players.length;
      const recover = reusable && (localBoard.revision === server.revision ||
        (localBoard.revision + 1 === server.revision && localBoard.pending && serverMatches(server,JSON.parse(localBoard.pending))));
      if (recover) {
        state.game = localBoard.game;
        if (localBoard.revision !== server.revision) localBoard.sent = localBoard.pending;
        localBoard.revision = server.revision;
        localBoard.pending = null;
      } else {
        const stage = server.phase === 'dealt' ? 'ready' : server.phase === 'finished' ? 'manual-over' : 'moderator';
        state.game = makeGame(server.players.map((p,id) => ({
          id,roomId:p.id,name:p.name,role:p.role,initialRole:p.initialRole,alive:p.alive,modTeam:p.team,modVotes:p.weight,modDeadVotes:p.deadVotes
        })),true,stage);
        state.game.round = server.round || 1;
        state.game.mod.phase = server.phase === 'day' ? 'day' : 'night';
        if (stage === 'manual-over') {
          state.game.mod.result = server.message;
          state.game.mod.winnerIds = state.game.players.filter(p=>server.winnerIds.includes(p.roomId)).map(p=>p.id);
        }
        if (server.report) state.game.mod.report = [server.report];
        localBoard = {game:state.game,gameNumber:server.gameNumber,revision:server.revision,sent:null,pending:null};
      }
      board = true;
      const bar = document.createElement('div');
      bar.className = 'room-board-bar';
      bar.innerHTML = `<div class="room-buttons"><a class="secondary" href="?online=1">Phòng</a>
        <button class="secondary" data-room="transfer-host">Chuyển quản trò</button><span id="boardReadiness" aria-live="polite"></span><span id="boardConnection" role="status"></span></div>
        <details class="room-board-tools"><summary>Thông báo và bỏ phiếu trên điện thoại</summary>
        <form id="roomAnnounce"><label class="field"><span>Thông báo cả phòng</span><input id="roomAnnounceText" name="message" maxlength="300" required autocomplete="off"></label>
        <button class="secondary">Gửi thông báo</button></form><div id="boardRoomTools"></div></details><div id="boardRanks"></div>`;
      app.before(bar);
      boardStatus('Đã kết nối với phòng '+session.code);
      document.querySelector('.brand').setAttribute('href','?online=1');
      document.querySelector('[data-action="data-tools"]').hidden = true;
      page = 'game';
      veil();
      saveBoard();
      render();
      void refreshBoard();
    } catch (error) { tell(error.message); }
  }

  window.roomUI = {render:renderRoom,isBoard:() => board,saveBoard};
  async function task(fn) {
    if (busy) return;
    busy = true;
    tell('');
    try { await fn(); }
    catch (error) { tell(error.message); }
    finally { busy = false; }
  }
  const action = (kind,extra = {}) => request(roomPath('action'),{kind,...extra});
  document.addEventListener('submit',event => {
    if (!['roomJoin','roomVote','roomAnnounce','roomOverride'].includes(event.target.id)) return;
    event.preventDefault();
    const form = new FormData(event.target);
    void task(async () => {
      if (event.target.id === 'roomJoin') {
        const code = CODE.test(invite) ? invite : String(form.get('code') || '').trim();
        if (!CODE.test(code)) throw Error('Mã phòng gồm đúng 3 chữ số.');
        remember(await request('rooms/'+code+'/join',{name:form.get('name')}));
        renderRoom();
      } else if (event.target.id === 'roomVote') {
        const result=await request(roomPath('vote'),{id:event.target.dataset.ballot,target:form.get('target')});
        if(result.ok) tell('Đã gửi phiếu.');
      } else if (event.target.id === 'roomOverride') {
        await action('ballot-override',{id:form.get('voter'),target:form.get('target')});
      } else {
        await action('announce',{message:form.get('message')});
        event.target.reset();
        document.activeElement?.blur();
      }
      if (board) {await refreshBoard();boardStatus('Đã cập nhật phòng '+session.code);} else await refresh();
    });
  });
  app.addEventListener('input',event => {
    const target = event.target;
    if (target.id === 'roomRoleSearch') {
      query = target.value;
      roleLimitVisible = 20;
      document.getElementById('roomDeckRows').scrollTop = 0;
      refreshDeck();
    }
    if (target.dataset.roomRule) {
      draft.rules[target.dataset.roomRule] = target.value;
      setDraft(draft);
    }
  });
  app.addEventListener('change',event => {
    if (event.target.id === 'roomPreset') chosenPreset = event.target.value;
    if (event.target.id === 'roomPrivacy') {
      confirmation=event.target.checked;
      if (!event.target.checked) revealAttempt++;
      document.getElementById('roomReveal').disabled = !event.target.checked;
    }
  });
  document.addEventListener('click',event => {
    const button = event.target.closest('[data-room]');
    if (!button || (!board && page !== 'online')) return;
    const {room:kind,key,id} = button.dataset;
    if (kind === 'complete-deck') {
      const plan=additions();
      if(plan){setDraft({...draft,counts:plan.counts});refreshDeck();}
      return;
    }
    if (kind === 'export-ranks') {
      const current=board ? boardView : view;
      const cell=value=>'"'+String(value).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
      const rows=[...current.leaderboard].sort((a,b)=>b.wins-a.wins || a.name.localeCompare(b.name,'vi'));
      let rank=0;
      const lines=rows.map((p,i)=>{
        if(!i || p.wins!==rows[i-1].wins)rank=i+1;
        return [rank,p.name,p.wins,p.played].map(cell).join(',');
      });
      const url=URL.createObjectURL(new Blob(['\uFEFFHạng,Người chơi,Thắng,Đã chơi\r\n'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
      const link=document.createElement('a');
      link.href=url;link.download='Dem-Lang-'+current.code+'-bang-diem.csv';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      return;
    }
    if (kind === 'pane') {pane=key;renderRoom();return;}
    if (kind === 'qr') {
      modal.innerHTML=`<div class="dialog-head"><h2>Quét để vào phòng ${session.code}</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div>
        <img class="room-qr" src="api/qr/${session.code}" alt="Mã QR vào phòng ${session.code}"><p>Hoặc nhập mã ${session.code} trên trang Chơi nhiều máy.</p>`;
      modal.showModal();
      return;
    }
    if (kind === 'info') return showRoleInfo(key,true);
    if (kind === 'hide') return hide();
    if (kind === 'pool') return showPool();
    if (kind === 'more') { roleLimitVisible += 20; refreshDeck(); return; }
    if (kind === 'leave') {
      if (!confirm('Quên phiên sẽ mất quyền trở lại phòng bằng phiên này. Tiếp tục?')) return;
      hide();
      remember(null);
      location.href = '?online=1';
      return;
    }
    if (['plus','minus','suggest'].includes(kind)) {
      if (kind === 'suggest') setDraft(suggest(view.players.length,document.getElementById('roomPreset').value));
      else {
        const count = draft.counts[key] || 0;
        if (kind === 'plus' && total() < draft.count && count < roleLimit(key)) draft.counts[key] = count+1;
        if (kind === 'minus' && count > 0) draft.counts[key] = count-1;
        setDraft(draft);
      }
      refreshDeck();
      const replacement = document.querySelector(`[data-room="${kind}"][data-key="${key}"]`);
      if (replacement && !replacement.disabled) replacement.focus({preventScroll:true});
      return;
    }
    void task(async () => {
      switch(kind) {
        case 'next-game': {
          const current=board ? boardView : view;
          if (current?.phase !== 'finished') return;
          await action('next-game',{revision:current.revision});
          if (board) location.href='?online=1';
          else {pane='deck';await refresh();}
          return;
        }
        case 'leave-waiting':
          await request(roomPath('leave-waiting'),{});
          remember(null);
          location.href='?online=1';
          return;
        case 'remove-waiting':
          if (confirm('Bỏ chỗ chờ của người này?')) await action('remove-waiting',{id});
          break;
        case 'recover-local':
          remember(savedSession());
          renderRoom();
          break;
        case 'transfer-host': {
          if (board && syncing) throw Error('Đang đồng bộ. Hãy thử lại sau vài giây.');
          if (board) {
            await sync();
            if (localBoard.sent !== JSON.stringify(projection())) throw Error('Chưa đồng bộ được trạng thái ván.');
          }
          const snapshot=board ? structuredClone(localBoard) : null;
          const deck=read('dl-deck-'+session.code);
          const payload={revision:board ? localBoard.revision : view.revision,board:snapshot,draft:deck};
          if (JSON.stringify(payload).length>60000) throw Error('Nhật ký ván quá lớn để chuyển qua link.');
          const result=await action('transfer-host',payload);
          const url=new URL(location.pathname,location.origin);
          url.searchParams.set('room',session.code);
          url.hash='transfer='+result.key;
          modal.innerHTML=`<div class="dialog-head"><h2>Chuyển quản trò</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div>
            <p>Mở link trên máy mới trong 5 phút. Tạm dừng thao tác ở máy cũ cho đến khi máy mới tiếp nhận.</p>
            <label class="field"><span>Link chuyển quản trò</span><input id="roomInviteTransfer" readonly value="${esc(url.href)}"></label>
            <button class="primary" data-room="copy-transfer">Sao chép link</button>`;
          modal.showModal();
          return;
        }
        case 'transfer': {
          const result=await action('transfer',{id});
          const url=new URL(location.pathname,location.origin);
          url.searchParams.set('room',session.code);
          url.hash='transfer='+result.key;
          modal.innerHTML=`<div class="dialog-head"><h2>Chuyển chỗ sang máy mới</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div>
            <p>Chỉ gửi cho người giữ chỗ này. Link dùng một lần trong 5 phút. Khi máy mới nhận chỗ, máy cũ sẽ mất quyền mở thẻ.</p>
            <label class="field"><span>Link chuyển máy</span><input id="roomInviteTransfer" readonly value="${esc(url.href)}"></label>
            <button class="primary" data-room="copy-transfer">Sao chép link</button>`;
          modal.showModal();
          return;
        }
        case 'copy-transfer': {
          const field=document.getElementById('roomInviteTransfer');
          try {await navigator.clipboard.writeText(field.value);button.textContent='Đã sao chép';}
          catch {field.select();}
          return;
        }
        case 'ballot-import': {
          if (boardView?.ballot?.status !== 'published') return;
          const ids=new Map(state.game.players.map(p=>[p.roomId,p.id]));
          state.game.ballots=Object.fromEntries(Object.entries(boardView.ballot.votes).map(([voter,target])=>
            [ids.get(voter),target ? ids.get(target) : '']));
          saveBoard();
          render();
          boardStatus('Đã đưa phiếu điện thoại vào sổ quản trò.');
          return;
        }
        case 'ballot-open':
        case 'ballot-lock':
        case 'ballot-publish':
        case 'ballot-discard':
          if(kind==='ballot-discard' && !confirm('Bỏ lượt bỏ phiếu hiện tại?')) return;
          await action(kind);
          await refreshBoard();
          return;
        case 'create':
          remember(await request('create',{}));
          renderRoom();
          break;
        case 'copy': {
          const field = document.getElementById('roomInvite');
          try {
            await navigator.clipboard.writeText(field.value);
            tell('Đã sao chép link.');
          } catch {
            field.select();
            tell('Link đã được chọn. Hãy sao chép để gửi cho nhóm.');
          }
          return;
        }
        case 'add-bot':
          await action('add-bot');
          break;
        case 'remove':
          if (confirm('Xóa người chơi này khỏi phòng chờ?')) await action('remove',{id});
          break;
        case 'deal': {
          const invalid = Object.entries(draft.counts).find(([key,n]) =>
            n > 0 && ROLES[key].random && !randomPool(key,draft.pool || []).length);
          if (invalid) throw Error('Hãy chọn danh sách rút cho '+ROLES[invalid[0]].name+'.');
          const deck = buildDeck(draft.counts,draft.pool || [],counts => {
            const wolves = Object.entries(counts).reduce((sum,[key,n]) => sum + (ROLES[key].group === 'wolf' ? n : 0),0);
            return wolves > 0 && wolves*2 < draft.count;
          });
          if (!deck) throw Error('Không xếp được bộ vai. Hãy kiểm tra số Sói và danh sách các vai ngẫu nhiên.');
          if (confirm('Chia thẻ vai cho '+view.players.length+' người chơi?')) {
            await action('deal',{deck,houseRules:draft.rules});
          }
          break;
        }
        case 'reveal': {
          if (!document.getElementById('roomPrivacy')?.checked) return;
          const attempt = ++revealAttempt;
          const result = await request(roomPath('reveal'),{confirmed:true});
          if (document.hidden || page !== 'online' || attempt !== revealAttempt || !document.getElementById('roomPrivacy')?.checked) return;
          shown = result;
          confirmation=false;
          updatedCard=false;
          renderRoom();
          return;
        }
      }
      if (board) await refreshBoard(); else await refresh();
    });
  });

  document.addEventListener('visibilitychange',() => {
    if (document.hidden) hide();
    else if (board) void sync();
    else void refresh();
  });
  document.querySelector('.topbar').addEventListener('click',event => {
    if (event.target.closest('a,button') && page === 'online') hide();
  },true);
  window.addEventListener('pagehide',hide);
  window.addEventListener('offline',() => {
    if (board) boardStatus('Mất kết nối · Đang giữ thay đổi trên máy quản trò');
    else if (page === 'online') tell('Mất kết nối với phòng.');
  });
  window.addEventListener('online',() => {
    if (board) {void sync();void refreshBoard();}
    else if (page === 'online') {tell('');if(boardCode)void openBoard();else void refresh();}
  });
  renderRoom();
  if (transfer && CODE.test(invite)) {
    history.replaceState(null,'',location.pathname+location.search);
    void task(async () => {
      const {board:snapshot,draft:deck,...credentials}=await request('rooms/'+invite+'/recover',{key:transfer});
      remember(credentials);
      if (credentials.host) {
        if (deck) setDraft(deck);
        if (snapshot) {
          store(boardKey(),snapshot,true);
          location.replace('?host='+credentials.code);
          return;
        }
      }
      view=null;
      stamp=undefined;
      renderRoom();
      await refresh();
    });
  } else if (boardCode) void openBoard();
  else void refresh();
  setInterval(() => {
    if (board) {void sync();if(!document.hidden)void refreshBoard();}
    else if (!boardCode && page === 'online' && !document.hidden) void refresh();
  },2000);
})();
