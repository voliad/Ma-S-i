import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import worker,{Room} from './worker.mjs';

export function testEnv() {
  const instances=new Map();
  return {ROOMS:{
    idFromName(code) { return code; },
    get(code) {
      if (!instances.has(code)) {
        const data=new Map();
        const storage={
          get:async key => structuredClone(data.get(key)),
          put:async (key,value) => { data.set(key,structuredClone(value)); },
          setAlarm:async ()=>{},
          delete:async key=>data.delete(key),
          deleteAll:async ()=>data.clear()
        };
        let queue=Promise.resolve();
        storage.transaction=fn=>{
          const result=queue.then(()=>fn(storage));
          queue=result.catch(()=>{});
          return result;
        };
        instances.set(code,new Room({storage}));
      }
      return instances.get(code);
    }
  }};
}

async function check() {
  const env=testEnv();
  async function call(path,body,token) {
    const r=await worker.fetch(new Request('https://example.test/api/'+path,{
      method:body===undefined?'GET':'POST',
      headers:token?{Authorization:'Bearer '+token}:{},
      body:body===undefined?undefined:JSON.stringify(body)
    }),env);
    assert.equal(r.headers.get('cache-control'),'no-store');
    return {status:r.status,...await r.json()};
  }

  const host=await call('create',{});
  assert.equal(host.status,201);
  assert.match(host.code,/^\d{3}$/);
  const extra=await Promise.all(Array.from({length:10},()=>call('create',{})));
  assert.equal(new Set([host,...extra].map(p=>p.code)).size,11);
  const qr=await worker.fetch(new Request('https://example.test/api/qr/'+host.code),env);
  assert.equal(qr.headers.get('content-type'),'image/svg+xml');
  assert.match(await qr.text(),/<svg/);
  const path='rooms/'+host.code+'/';
  const players=[];
  for(let i=0;i<5;i++)players.push(await call(path+'join',{name:'Người '+i}));
  assert.ok(players.every(p=>p.status===201));
  assert.equal((await call(path+'join',{name:'Người 0'})).status,409);
  const deck=['wolf','villager','hunter','seer','villager'];
  assert.equal((await call(path+'action',{kind:'deal',deck},players[0].token)).status,403);
  assert.equal((await call(path+'action',{kind:'deal',deck:['bogus',...deck.slice(1)]},host.token)).status,400);
  assert.equal((await call(path+'action',{kind:'deal',deck},host.token)).status,200);
  const roster=await call(path+'state',undefined,host.token);
  assert.deepEqual(roster.players.map(p=>p.role).sort(),[...deck].sort());
  assert.equal(roster.phase,'dealt');
  for(const player of players) {
    const state=await call(path+'state',undefined,player.token);
    assert.ok(state.self.hasCard && !Object.hasOwn(state.self,'role'));
    assert.ok(state.players.every(p=>!Object.hasOwn(p,'role') && !Object.hasOwn(p,'token')));
    assert.ok(!JSON.stringify(state).includes(host.token));
    assert.equal((await call(path+'reveal',{},player.token)).status,409);
    const reveal=await call(path+'reveal',{confirmed:true,id:roster.players.find(p=>p.id!==state.self.id).id},player.token);
    assert.equal(reveal.role,roster.players.find(p=>p.id===state.self.id).role);
  }
  assert.equal((await call(path+'state',undefined,host.token)).players.filter(p=>p.seen).length,5);
  assert.equal((await call(path+'state')).status,401);
  assert.equal((await call(path+'reveal',{confirmed:true},host.token)).status,401);
  const update=roster.players.map((p,i)=>({id:p.id,role:i===0?'guard':p.role,alive:i>0,team:i===0?'Phe Làng':p.team,weight:i===1?2:i===2?0:1}));
  const sync={kind:'sync',phase:'day',round:1,revision:0,report:'Trời sáng',players:update};
  assert.equal((await call(path+'action',sync,players[0].token)).status,403);
  assert.equal((await call(path+'action',sync,host.token)).revision,1);
  const afterSync=await call(path+'state',undefined,host.token);
  assert.ok(afterSync.players.slice(1).every(p=>p.seen));
  assert.equal(afterSync.players[0].seen,roster.players[0].role==='guard');
  assert.equal((await call(path+'action',sync,host.token)).status,409);
  const state=await call(path+'state',undefined,players[0].token);
  assert.equal(state.phase,'day');
  assert.equal(state.report,'Trời sáng');
  assert.equal(state.players.find(p=>p.id===state.self.id).alive,false);
  assert.ok(state.self.cardVersion>1);
  assert.equal((await call(path+'reveal',{confirmed:true},players[0].token)).role,'guard');
  const late=await call(path+'join',{name:'Người 6'});
  assert.equal(late.status,201);
  assert.equal(late.waiting,true);
  const queued=await call(path+'state',undefined,late.token);
  assert.deepEqual(queued,{status:200,code:host.code,host:false,waiting:true,gameNumber:1});
  assert.equal((await call(path+'reveal',{confirmed:true},late.token)).status,401);
  assert.equal((await call(path+'vote',{target:roster.players[0].id},late.token)).status,401);
  assert.equal((await call(path+'join',{name:'Người 6'})).status,409);
  const leaving=await call(path+'join',{name:'Người rời'});
  assert.equal((await call(path+'leave-waiting',{},leaving.token)).status,200);
  const removal=await call(path+'join',{name:'Người bị bỏ chỗ'});
  const beforeRemoval=await call(path+'state',undefined,host.token);
  const removeId=beforeRemoval.waitingPlayers.find(p=>p.name==='Người bị bỏ chỗ').id;
  assert.equal((await call(path+'action',{kind:'remove-waiting',id:removeId},host.token)).status,200);
  assert.equal((await call(path+'state',undefined,removal.token)).status,401);
  const transfer=await call(path+'action',{kind:'transfer',id:roster.players[1].id},host.token);
  const newDevice=await call(path+'recover',{key:transfer.key});
  assert.equal(newDevice.status,200);
  assert.equal((await call(path+'recover',{key:transfer.key})).status,410);
  assert.equal((await call(path+'state',undefined,players[1].token)).status,401);
  players[1]=newDevice;
  assert.equal((await call(path+'state',undefined,newDevice.token)).self.id,roster.players[1].id);
  assert.equal((await call(path+'action',{kind:'ballot-open'},players[4].token)).status,403);
  assert.equal((await call(path+'action',{kind:'ballot-open'},host.token)).status,200);
  const ballot=(await call(path+'state',undefined,newDevice.token)).ballot;
  const target=roster.players[3].id;
  const input={id:ballot.id,target};
  assert.equal((await call(path+'vote',input,players[2].token)).status,403);
  assert.equal((await call(path+'vote',input,newDevice.token)).status,200);
  assert.equal((await call(path+'state',undefined,players[4].token)).ballot.votes,undefined);
  assert.equal((await call(path+'action',{kind:'ballot-lock'},host.token)).status,200);
  assert.equal((await call(path+'vote',input,players[4].token)).status,409);
  assert.equal((await call(path+'action',{kind:'ballot-override',id:roster.players[4].id,target},host.token)).status,200);
  assert.equal((await call(path+'action',{kind:'ballot-publish'},host.token)).status,200);
  assert.equal((await call(path+'state',undefined,players[4].token)).ballot.tally[target],3);
  const finish={...sync,phase:'finished',revision:1,result:'Làng thắng',winnerIds:[roster.players[0].id,roster.players[1].id]};
  assert.equal((await call(path+'action',{...finish,winnerIds:['unknown']},host.token)).status,400);
  assert.equal((await call(path+'action',finish,host.token)).revision,2);
  assert.equal((await call(path+'action',{...finish,revision:2},host.token)).revision,2);
  const result=await call(path+'state',undefined,players[4].token);
  assert.equal(result.message,'Làng thắng');
  assert.equal(result.ballot,null);
  assert.equal(result.completedGames,1);
  assert.deepEqual(result.leaderboard.map(p=>p.wins),[1,1,0,0,0]);
  assert.ok(result.leaderboard.every(p=>p.played===1));
  const next={kind:'next-game',revision:2};
  assert.equal((await call(path+'action',next,players[4].token)).status,403);
  assert.equal((await call(path+'action',next,host.token)).revision,3);
  const lobby=await call(path+'state',undefined,newDevice.token);
  assert.equal(lobby.self.id,roster.players[1].id);
  assert.equal(lobby.gameNumber,2);
  assert.equal(lobby.phase,'lobby');
  assert.equal(lobby.self.hasCard,false);
  assert.deepEqual(lobby.leaderboard,[...result.leaderboard,{name:'Người 6',wins:0,played:0}]);
  const promoted=await call(path+'state',undefined,late.token);
  assert.equal(promoted.phase,'lobby');
  assert.equal(promoted.self.hasCard,false);
  assert.equal(promoted.waitingCount,0);
  assert.equal((await call(path+'reveal',{confirmed:true},newDevice.token)).status,409);
  assert.equal((await call(path+'action',{kind:'deal',deck:[...deck,'villager']},host.token)).status,200);
  assert.equal((await call(path+'reveal',{confirmed:true},late.token)).status,200);
  const second=await call(path+'state',undefined,host.token);
  assert.equal(second.gameNumber,2);
  const snapshot={gameNumber:2,game:{round:1,mod:{records:[{note:'Nhật ký của quản trò'}]}}};
  const change={kind:'transfer-host',revision:second.revision,board:snapshot,draft:{count:6}};
  assert.equal((await call(path+'action',change,late.token)).status,403);
  const handoff=await call(path+'action',change,host.token);
  assert.equal(handoff.status,200);
  const moved=await call(path+'recover',{key:handoff.key});
  assert.equal(moved.host,true);
  assert.equal(moved.board.revision,4);
  assert.deepEqual(moved.board.game,snapshot.game);
  assert.deepEqual(moved.draft,{count:6});
  assert.equal((await call(path+'state',undefined,host.token)).status,401);
  assert.equal((await call(path+'recover',{key:handoff.key})).status,410);
  assert.equal((await call(path+'state',undefined,moved.token)).revision,4);
  assert.equal((await call(path+'state',undefined,late.token)).board,undefined);

  assert.equal((await call(path+'action',finish,moved.token)).status,409);
  assert.equal((await call(path+'action',{...finish,revision:4,result:'Hòa',winnerIds:[],players:second.players},moved.token)).status,200);
  const draw=await call(path+'state',undefined,newDevice.token);
  assert.equal(draw.completedGames,2);
  assert.deepEqual(draw.leaderboard.map(p=>p.wins),[1,1,0,0,0,0]);
  assert.deepEqual(draw.leaderboard.map(p=>p.played),[2,2,2,2,2,1]);
  console.log('PASS: phòng, bỏ phiếu, chuyển máy, đồng điểm, chống cộng trùng, ván mới và ván hòa.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await check();
