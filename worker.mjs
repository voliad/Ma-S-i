import QRCode from './vendor/QRCode/index.js';
import roles from './roles.json' with {type:'json'};

const DAY = 86400000;
const teamNames={village:'Phe Làng',wolf:'Phe Sói',solo:'Phe riêng',neutral:'Chưa có phe'};
const codePattern = /^\d{3}$/;
const token = () => crypto.randomUUID();
const json = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
const fail = (message, status = 400) => json({error:message}, status);
const canVote = p => !!p && (p.alive || p.deadVotes) && p.weight > 0;
const validChoice = (room,id) => id === '' || room.players.some(p => p.id === id && p.alive);
const clean = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

export default {
  async fetch(request, env) {
    const {pathname} = new URL(request.url);
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (pathname === '/api/create' && request.method === 'POST') {
      const start = crypto.getRandomValues(new Uint32Array(1))[0] % 1000;
      for (let offset=0;offset<1000;offset++) {
        const code = String((start+offset)%1000).padStart(3,'0');
        const result = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(
          new Request('https://room/create/'+code,{method:'POST'})
        );
        if (result.status !== 409) return result;
      }
      return fail('Tất cả mã phòng đang được sử dụng. Hãy thử lại sau.',503);
    }
    const qr = pathname.match(/^\/api\/qr\/(\d{3})$/);
    if (qr && request.method === 'GET') {
      const url = new URL('/',request.url);
      url.searchParams.set('room',qr[1]);
      const matrix = new QRCode(-1,1);
      matrix.addData(url.href);
      matrix.make();
      const size = matrix.getModuleCount();
      const squares = [];
      for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
        if(matrix.isDark(y,x)) squares.push(`M${x+4} ${y+4}h1v1h-1z`);
      }
      return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size+8} ${size+8}" shape-rendering="crispEdges"><path fill="white" d="M0 0h${size+8}v${size+8}H0z"/><path d="${squares.join('')}"/></svg>`,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store'}});
    }
    const match = pathname.match(/^\/api\/rooms\/(\d{3})\/(join|state|action|reveal|recover|vote|leave-waiting)$/);
    if (!match) return fail('Đường dẫn không hợp lệ.', 404);
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  }
};

export class Room {
  constructor(ctx) { this.storage = ctx.storage; }
  async alarm() {
    await this.storage.transaction(async tx => {
      const room = await tx.get('room');
      if (room && room.expires <= Date.now()) await tx.delete('room');
    });
  }

  async fetch(request) {
    const parts = new URL(request.url).pathname.split('/');
    const endpoint = parts.at(-1);
    const creating = parts[1] === 'create' && codePattern.test(endpoint);
    if (creating && request.method === 'POST') {
      const created = await this.storage.transaction(async tx => {
        if ((await tx.get('room'))?.expires > Date.now()) return null;
        const room = {revision:0, gameNumber:1, completedGames:0, scores:{}, winnerIds:[], houseRules:{}, transfers:{}, ballot:null, code:endpoint, host:token(), phase:'lobby', round:0, players:[], waiting:[], message:'', expires:Date.now()+DAY};
        await tx.put('room', room);
        await tx.setAlarm(room.expires);
        return room;
      });
      return created ? json({code:created.code, token:created.host, host:true},201) : fail('Trùng mã. Tạo lại phòng.',409);
    }

    const read = endpoint === 'state' && request.method === 'GET';
    if (!read && !(request.method === 'POST' && ['join','action','reveal','recover','vote','leave-waiting'].includes(endpoint))) return fail('Thao tác không hợp lệ.',405);
    const credential = request.headers.get('Authorization')?.replace(/^Bearer /,'');
    let input;
    if (!read) {
      try {
        const text = await request.text();
        if (text.length > 65536) return fail('Dữ liệu quá dài.',413);
        input = JSON.parse(text);
        if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('Dữ liệu không hợp lệ.');
      } catch { return fail('Dữ liệu không hợp lệ.'); }
    }
    if (read) {
      const room = await this.storage.transaction(async tx => {
        const current = await tx.get('room');
        const player = current && [...current.players,...(current.waiting || [])].find(p => p.token === credential);
        if (player && current.expires > Date.now() && Date.now() - (player.lastSeen || 0) >= 12000) {
          player.lastSeen = Date.now();
          await tx.put('room',current);
        }
        return current;
      });
      if (!room || room.expires <= Date.now()) return fail('Phòng đã đóng hoặc hết hạn.',404);
      const host = credential === room.host;
      const player = room.players.find(p => p.token === credential);
      const waiting = room.waiting || [];
      const queued = waiting.find(p => p.token === credential);
      if (queued) return json({code:room.code,host:false,waiting:true,gameNumber:room.gameNumber || 1});
      if (!host && !player) return fail('Phiên tham gia không hợp lệ.',401);
      const ballot = room.ballot;
      const ballotView = ballot && {
        id:ballot.id, status:ballot.status,
        ...(ballot.status === 'published' ? {tally:ballot.tally} : {}),
        ...(host ? {votes:ballot.votes} : {choice:ballot.votes[player.id], canVote:canVote(player)})
      };
      const scores = {...room.scores};
      for (const p of room.players) scores[p.id] ??= {name:p.name,wins:0,played:0};
      return json({expires:room.expires, waitingCount:waiting.length, waitingPlayers:host ? waiting.map(({id,name})=>({id,name})) : undefined, leaderboard:Object.values(scores), gameNumber:room.gameNumber || 1,
        completedGames:room.completedGames || 0, winnerIds:room.phase === 'finished' ? room.winnerIds || [] : undefined,
        ballot:ballotView,code:room.code, host, phase:room.phase, round:room.round, message:room.message, report:room.report || '',
        revision:host ? room.revision : undefined, houseRules:host ? room.houseRules : undefined,
        self:player ? {id:player.id, hasCard:!!player.role, cardVersion:player.cardVersion, alive:player.alive} : null,
        players:room.players.map(p => ({id:p.id,name:p.name,alive:p.alive,bot:!!p.bot,...(host?{
          role:p.role, initialRole:p.initialRole, team:p.team, seen:!!p.seen, connected:!!p.bot || Date.now() - (p.lastSeen || 0) < 36000, canVote:canVote(p), weight:p.weight, deadVotes:!!p.deadVotes
        }:{})}))});
    }
    return this.storage.transaction(async tx => {
      const room = await tx.get('room');
      if (!room || room.expires <= Date.now()) return fail('Phòng đã đóng hoặc hết hạn.',404);
      if (endpoint === 'recover') {
        const key = clean(input.key,36);
        const transfer = room.transfers && Object.hasOwn(room.transfers,key) ? room.transfers[key] : null;
        if (!transfer || transfer.expires <= Date.now()) return fail('Link chuyển máy đã hết hạn hoặc đã dùng.',410);
        if (transfer.host) {
          if (transfer.revision !== room.revision) return fail('Ván đã thay đổi. Hãy tạo link quản trò mới.',409);
          delete room.transfers[key];
          room.host=token();
          room.revision++;
          await tx.put('room',room);
          return json({code:room.code,token:room.host,host:true,board:transfer.board,draft:transfer.draft});
        }
        const player = room.players.find(p => p.id === transfer.id);
        if (!player) return fail('Chỗ chơi đã bị xóa.',404);
        delete room.transfers[key];
        player.token=token();
        player.lastSeen=Date.now();
        await tx.put('room',room);
        return json({code:room.code,token:player.token,host:false});
      }
      if (endpoint === 'vote') {
        const player = room.players.find(p => p.token === credential);
        if (!player) return fail('Phiên tham gia không hợp lệ.',401);
        if (!canVote(player)) return fail('Bạn không có quyền bỏ phiếu lượt này.',403);
        if (room.phase !== 'day' || room.ballot?.status !== 'open' || room.ballot.id !== input.id) return fail('Lượt bỏ phiếu đã đóng.',409);
        if (!validChoice(room,input.target)) return fail('Mục tiêu bỏ phiếu không hợp lệ.');
        room.ballot.votes[player.id] = input.target;
        await tx.put('room',room);
        return json({ok:true});
      }
      if (endpoint === 'leave-waiting') {
        const waiting=room.waiting || [];
        const index=waiting.findIndex(p=>p.token===credential);
        if (index < 0) return fail('Bạn không còn ở phòng chờ ván sau.',409);
        waiting.splice(index,1);
        await tx.put('room',room);
        return json({ok:true});
      }
      if (endpoint === 'join') {
        const name = clean(input.name,28).normalize('NFC');
        if (!name) return fail('Nhập tên người chơi.');
        room.waiting ??= [];
        const seats=[...room.players,...room.waiting];
        if (seats.length >= 24) return fail('Phòng đã đủ 24 chỗ.',409);
        if (seats.some(p => p.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) return fail('Tên này đã được dùng.',409);
        const player = {id:token(),token:token(),name,alive:true,role:null,lastSeen:Date.now(),weight:1};
        const waiting=room.phase !== 'lobby';
        (waiting ? room.waiting : room.players).push(player);
        await tx.put('room',room);
        return json({code:room.code,token:player.token,host:false,waiting},201);
      }
      if (endpoint === 'reveal') {
        const player = room.players.find(p => p.token === credential);
        if (!player) return fail('Phiên tham gia không hợp lệ.',401);
        if (!player.role || input.confirmed !== true) return fail('Hãy xác nhận trước khi xem thẻ.',409);
        if (!player.seen) {
          player.seen = true;
          await tx.put('room',room);
        }
        return json({role:player.role, team:player.team, cardVersion:player.cardVersion,
          houseRule:room.houseRules[player.role] || ''});
      }
      if (credential !== room.host) return fail('Chỉ quản trò được làm việc này.',403);
      switch (input.kind) {
        case 'transfer-host': {
          if (input.revision !== room.revision) return fail('Hãy đồng bộ ván trước khi chuyển quản trò.',409);
          if (room.phase !== 'lobby' && (!input.board?.game || input.board.gameNumber !== (room.gameNumber || 1))) {
            return fail('Thiếu trạng thái ván của quản trò.',400);
          }
          room.transfers ??= {};
          for (const [key,entry] of Object.entries(room.transfers)) {
            if (entry.host || entry.expires <= Date.now()) delete room.transfers[key];
          }
          const key=token();
          room.transfers[key]={host:true,revision:room.revision,expires:Date.now()+300000,
            board:input.board ? {...input.board,revision:room.revision+1} : null,draft:input.draft || null};
          await tx.put('room',room);
          return json({key});
        }
        case 'add-bot': {
          if (room.phase !== 'lobby') return fail('Chỉ thêm bot trong phòng chờ.',409);
          const seats = [...room.players,...(room.waiting || [])];
          if (seats.length >= 24) return fail('Phòng đã đủ 24 chỗ.',409);
          const names = new Set(seats.map(p => p.name.toLocaleLowerCase('vi')));
          let number = 1;
          while (names.has('bot '+number)) number++;
          room.players.push({id:token(),token:null,name:'Bot '+number,bot:true,alive:true,role:null,weight:1});
          break;
        }
        case 'transfer': {
          if (!room.players.some(p => p.id === input.id && !p.bot)) return fail('Không tìm thấy người chơi.',404);
          room.transfers ??= {};
          for (const [key,entry] of Object.entries(room.transfers)) {
            if (entry.id === input.id || entry.expires <= Date.now()) delete room.transfers[key];
          }
          const key = token();
          room.transfers[key]={id:input.id,expires:Date.now()+300000};
          await tx.put('room',room);
          return json({key});
        }
        case 'ballot-open':
          if (room.phase !== 'day' || ['open','locked'].includes(room.ballot?.status)) return fail('Hãy kết thúc lượt đang có trước.',409);
          room.ballot={id:token(),status:'open',votes:{}};
          break;
        case 'ballot-lock':
          if (room.ballot?.status !== 'open') return fail('Không có lượt đang mở.',409);
          room.ballot.status='locked';
          break;
        case 'ballot-override': {
          const voter=room.players.find(p => p.id === input.id);
          if (!canVote(voter) || !['open','locked'].includes(room.ballot?.status) || !validChoice(room,input.target)) return fail('Không thể nhập phiếu này.',409);
          room.ballot.votes[voter.id]=input.target;
          break;
        }
        case 'ballot-publish': {
          if (room.ballot?.status !== 'locked') return fail('Khóa lượt trước khi công bố.',409);
          const tally={};
          for (const p of room.players) {
            const target=room.ballot.votes[p.id];
            if (canVote(p) && target && validChoice(room,target)) tally[target]=(tally[target] || 0)+p.weight;
          }
          room.ballot.tally=tally;
          room.ballot.status='published';
          break;
        }
        case 'ballot-discard':
          if (room.phase !== 'day') return fail('Chỉ quản lý phiếu ban ngày.',409);
          room.ballot=null;
          break;
        case 'next-game': {
          if (room.phase !== 'finished' || room.revision !== input.revision) {
            return fail('Hãy chờ kết quả ván được lưu trước khi chơi tiếp.',409);
          }
          room.gameNumber=(room.gameNumber || 1)+1;
          room.revision++;
          room.phase='lobby';
          room.round=0;
          room.message='';
          room.report='';
          room.houseRules={};
          room.ballot=null;
          room.winnerIds=[];
          room.players.push(...(room.waiting || []));
          room.waiting=[];
          for (const p of room.players) {
            p.role=null;
            p.initialRole=null;
            p.team=undefined;
            p.alive=true;
            p.seen=false;
            p.weight=1;
            p.deadVotes=false;
            p.cardVersion=(p.cardVersion || 0)+1;
          }
          break;
        }
        case 'deal': {
          if (room.phase !== 'lobby' || room.players.length < 5) return fail('Cần ít nhất 5 người trong phòng chờ.',409);
          const deck = input.deck;
          if (!Array.isArray(deck) || deck.length !== room.players.length ||
              deck.some(key => typeof key !== 'string' || !Object.hasOwn(roles,key) || roles[key].random)) {
            return fail('Chọn đúng một vai cụ thể cho mỗi người.');
          }
          const counts = new Map();
          for (const key of deck) {
            const count = (counts.get(key) || 0) + 1;
            if (count > roles[key].maxCount) return fail('Một vai đã vượt số bản sao cho phép.');
            counts.set(key,count);
          }
          if (!deck.some(k => roles[k].group === 'wolf')) return fail('Bộ vai cần ít nhất một Sói.');
          if (deck.filter(k => roles[k].group === 'wolf').length * 2 >= deck.length) {
            return fail('Phe Sói phải ít hơn một nửa số người.');
          }
          room.houseRules = {};
          for (const key of counts.keys()) {
            if (!roles[key].houseRule) continue;
            const rule = clean(input.houseRules?.[key],1500);
            if (!rule) return fail('Điền luật nhóm cho các vai tùy chỉnh.');
            room.houseRules[key] = rule;
          }
          for (let i=deck.length-1;i>0;i--) {
            const count = i+1, ceiling = 2**32 - (2**32 % count);
            let value;
            do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= ceiling);
            const j = value % count;
            [deck[i],deck[j]] = [deck[j],deck[i]];
          }
          room.players.forEach((p,i) => {
            p.initialRole=p.role=deck[i];
            if (p.bot) p.seen=true;
            p.team=teamNames[roles[p.role].group];
            p.cardVersion=(p.cardVersion || 0)+1;
          });
          room.phase='dealt';
          for (const [key,entry] of Object.entries(room.transfers || {})) if (entry.host) delete room.transfers[key];
          break;
        }
        case 'sync': {
          if (room.phase === 'lobby' || input.revision !== room.revision) {
            return fail('Bảng quản trò đã thay đổi. Hãy tải lại và mở lại bảng.',409);
          }
          if (room.phase === 'finished' && input.phase === 'finished') return json({ok:true,revision:room.revision});
          if (!['dealt','night','day','finished'].includes(input.phase) ||
              (room.phase !== 'dealt' && input.phase === 'dealt') ||
              (room.phase === 'finished' && input.phase !== 'finished') ||
              !Number.isInteger(input.round) || input.round < 0 || input.round > 10000 ||
              (input.phase === 'dealt' ? input.round !== 0 : input.round < 1) ||
              !Array.isArray(input.players) || input.players.length !== room.players.length) {
            return fail('Trạng thái ván không hợp lệ.');
          }
          if (input.phase === 'finished' &&
              (!Array.isArray(input.winnerIds) || input.winnerIds.length > room.players.length ||
               input.winnerIds.some(id => !room.players.some(p => p.id === id)))) {
            return fail('Danh sách người thắng không hợp lệ.');
          }
          const updates = new Map(input.players.map(p => [p?.id,p]));
          for (const p of room.players) {
            const next = updates.get(p.id);
            if (!next || !Object.hasOwn(roles,next.role) || roles[next.role].random ||
                typeof next.alive !== 'boolean' || typeof next.team !== 'string' || next.team.length > 60) {
              return fail('Trạng thái người chơi không hợp lệ.');
            }
            if (p.role !== next.role || p.team !== next.team) {p.cardVersion++;p.seen=false;}
            p.role=next.role;
            p.team=next.team;
            p.alive=next.alive;
            p.weight=Number.isFinite(next.weight)?Math.max(0,Math.min(100,next.weight)):1;
            p.deadVotes=next.deadVotes===true;
          }
          if (input.phase !== 'day' || room.round !== input.round) room.ballot=null;
          if (input.phase === 'finished') {
            const winners=new Set(input.winnerIds);
            room.winnerIds=[...winners];
            room.scores ??= {};
            for (const p of room.players) {
              const score=room.scores[p.id] ??= {name:p.name,wins:0,played:0};
              score.played++;
              if (winners.has(p.id)) score.wins++;
            }
            room.completedGames=(room.completedGames || 0)+1;
          }
          room.phase=input.phase;
          room.round=input.round;
          room.report=input.phase === 'day' ? clean(input.report,1500) : '';
          room.message=input.phase==='finished' ? clean(input.result,300) || 'Quản trò đã kết thúc ván.' : room.message;
          room.revision++;
          break;
        }
        case 'remove-waiting':
          room.waiting=(room.waiting || []).filter(p=>p.id!==input.id);
          break;
        case 'remove':
          if (room.phase !== 'lobby') return fail('Chỉ xóa người trong phòng chờ.',409);
          room.players=room.players.filter(p=>p.id!==input.id);
          break;
        case 'announce':
          if (room.phase === 'finished') return fail('Ván đã kết thúc.',409);
          room.message=clean(input.message,300);
          break;
        default: return fail('Thao tác không hợp lệ.');
      }
      await tx.put('room',room);
      return json({ok:true,revision:room.revision});
    });
  }
}
