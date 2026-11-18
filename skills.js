'use strict';
/* Assisted role actions. Automatic core remains independent. All outcomes below are
   explicit moderator operations, never an assertion of Wolvesville parity. */
const SKILL_PROFILES={};
const skillDef=(id,label,effect,min=1,max=min,options={})=>({id,label,effect,min,max,...options});
function skillProfile(names,actions,note=''){for(const n of names.split('|'))SKILL_PROFILES[fold(n)]= {actions,note};}
const SA=(id,label,effect,min=1,max=min,options={})=>skillDef(id,label,effect,min,max,options);
const Scheck=SA('role','Xem vai bí mật','role'), Saura=SA('aura','Xem phe / hào quang','aura'), Sattack=SA('attack','Tấn công đã được quản trò xét','attack'), Sprotect=SA('protect','Bảo vệ khỏi một đòn','shield');
skillProfile('Seer|Wolf Seer|Sorcerer',[Scheck]);
skillProfile('Aura Seer|Blind Werewolf|Gambler|Pumpkin Oracle',[Saura], 'Kiểm tra ngụy trang, xác suất và giới hạn riêng trước khi cung cấp kết quả.');
skillProfile('Detective|Analyst',[SA('compare','So sánh phe hai người','compare',2)]);
skillProfile('Regular Werewolf|Alpha Werewolf|Accomplice|Lone Wolf|Headless Horseman|Assassin',[Sattack], 'Chọn đúng nguồn tấn công. Mỗi bầy Sói chỉ có một đòn chung mỗi đêm. Assassin sử dụng luật nhóm riêng.');
skillProfile('Serial Killer',[SA('attack','Tấn công của Sát nhân','attack',1,1,{phase:'night',source:'solo'})]);
skillProfile('Doctor|Night Watchman|Butcher|Snow Angel|Watchdog|Locksmith',[Sprotect], 'Số lần và thời hạn bảo vệ khác nhau theo vai; kiểm tra mô tả, chọn thời hạn phù hợp. Khiên ở đây chặn một đòn, không tự thay thế mọi loại bảo vệ.');
skillProfile('Bodyguard|Tough Guy|Flagger',[SA('redirect','Đặt người đỡ / chuyển đòn','redirect',2)],'Thứ tự chọn: người được bảo vệ, rồi người nhận đòn thay. Sức bền, phản đòn và vết thương do quản trò xác nhận.');
skillProfile('Avenger|Junior Werewolf',[SA('revenge','Đặt / đổi mục tiêu khi chết','revenge')]);
skillProfile('Cupid|Evil Cupid|Split Wolf',[SA('bond','Liên kết chết theo','bond',2),...(false?[]:[])], 'Liên kết có hiệu lực ngay. Chọn cả người sử dụng nếu luật vai yêu cầu.');
skillProfile('Baker',[SA('bread','Tặng bánh: +1 phiếu đến hết ngày','voteAdd',1,1,{phase:'night',delta:1})]);
skillProfile('Mayor',[SA('reveal','Lộ vai: phiếu ×2','mayor',0,0,{phase:'day',uses:1})]);
skillProfile('Gunner',[SA('shoot','Bắn một viên đạn','attack',1,1,{phase:'day',uses:2,perRound:1,minRound:2})]);
skillProfile('Vigilante',[SA('shoot','Bắn công khai','attack',1,1,{phase:'day',uses:1,perRound:1}),SA('reveal','Công khai vai mục tiêu','reveal',1,1,{phase:'day',uses:1,perRound:1})]);
skillProfile('Priest',[SA('holy','Dùng nước thánh','holy',1,1,{phase:'day',uses:1})]);
skillProfile('Witch',[SA('heal','Dùng bình bảo vệ sau khi xét đòn đánh','shield',1,1,{phase:'night',uses:1}),SA('poison','Dùng bình độc','kill',1,1,{phase:'night',uses:1})]);
skillProfile('Marksman',[SA('mark','Đánh dấu mục tiêu','mark'),SA('shoot','Bắn mục tiêu đã đánh dấu','backfire',1,1,{uses:2})]);
skillProfile('Flower Child|Guardian Wolf',[SA('save','Chặn một lần treo cổ','lynchShield',1,1,{uses:1})]);
skillProfile('Rainmaker',[SA('rain','Tặng gậy mưa','rain',1,1,{phase:'night',uses:2,minRound:2})]);
skillProfile('Medium',[SA('revive','Hồi sinh một người phe Làng','reviveVillage',1,1,{phase:'night',uses:1,dead:true})]);
skillProfile('Wolf Summoner',[SA('revive','Hồi sinh Sói thành Sói thường','reviveWolf',1,1,{phase:'night',uses:1,dead:true})], 'Sau khi hồi sinh, quản trò đặt lịch loại lại vào đầu lượt bỏ phiếu.');
skillProfile('Grumpy Grandma',[SA('silence','Cấm nói và bỏ phiếu trong ngày sắp tới','silence',1,1,{phase:'night',minRound:2,duration:2})]);
skillProfile('Nightmare Werewolf',[SA('sleep','Khóa kỹ năng đêm kế tiếp','block',1,1,{phase:'day',uses:2})]);
skillProfile('Voodoo Werewolf',[SA('silence','Cấm nói và bỏ phiếu','silence',1,1,{phase:'day',uses:2}),SA('nightmare','Khóa kỹ năng một đêm','block',1,1,{uses:1})]);
skillProfile('Bully',[SA('rock','Ném đá / xử lý chấn động','concuss',1,1,{phase:'day',uses:4})]);
skillProfile('Jailer|Warden',[SA('jail','Giam và chặn tấn công','jail',1,2,{phase:'day'}),SA('execute','Thi hành đòn xử tử đã xét','kill',1,1,{phase:'night',uses:1})]);
skillProfile('Wolf Shaman',[SA('disguise','Đặt vai ngụy trang','disguise')]);
skillProfile('Wolf Scribe|Wolf Trickster|Illusionist|Shapeshifter',[SA('disguise','Đặt vai hiện ra khi bị kiểm tra','disguise'),Sattack], 'Chỉ áp dụng đòn đánh cho vai có quyền giết. Giả cáo phó và kỹ năng phụ được xác nhận trong bảng phân xử.');
skillProfile('Bandit',[SA('recruit','Chiêu mộ / giết Sói','recruit'),Sattack]);
skillProfile('Sect Leader',[SA('convert','Kết nạp giáo phái, giữ vai','sect')]);
skillProfile('Zombie',[SA('bite','Đặt lịch chuyển hóa zombie','zombie')], 'Chỉ chuyển sau đêm kế; hủy nếu zombie nguồn đã chết. Không áp dụng cho Sói hay sát thủ.');
skillProfile('Arsonist',[SA('douse','Tẩm xăng tối đa hai người','douse',1,2,{phase:'night'}),SA('ignite','Đốt tất cả người đã tẩm','ignite',0,0,{phase:'night'})]);
skillProfile('Deep Sea Terror',[SA('mark','Đánh dấu và khóa phiếu','seaMark',1,1,{phase:'night'}),SA('killMarked','Giết những người đã đánh dấu','killMarked',0,0,{phase:'night',minRound:2})]);
skillProfile('Cannibal',[SA('hunger','Tích một điểm đói','hunger',0,0,{phase:'night',perRound:1}),SA('eat','Ăn các mục tiêu theo điểm đói','eat',1,5,{phase:'night',perRound:1})]);
skillProfile('Evil Detective',[SA('compareKill','Loại nếu khác phe','evilCompare',2,2,{phase:'night'})]);
skillProfile('Astronomer',[SA('moon','Chặn đòn bầy Sói đêm này','newMoon',0,0,{phase:'night',uses:1}),SA('meteor','Mưa thiên thạch','meteor',1,1,{phase:'night',uses:1})]);
skillProfile('Pacifist|Wolf Pacifist',[SA('peace','Công khai vai và hủy bỏ phiếu','peace',1,1,{phase:'day',uses:1})]);
skillProfile('Shadow Wolf',[SA('shadow','Nhân đôi phiếu phe Sói hôm nay','shadow',0,0,{phase:'day',uses:1})]);
skillProfile('Ghost Wolf',[SA('ghostVote','Cho Sói ma bỏ phiếu sau chết','deadVote',0,0,{allowDead:true})]);
skillProfile('Loudmouth',[SA('revealDeath','Đặt mục tiêu lộ vai khi chết','loudmouth')]);
skillProfile('Bell-Ringer',[SA('bells','Liên kết chuông: nhận vai người còn lại','bells',2)]);
skillProfile('Soulbinder',[SA('chat','Đặt liên lạc bí mật','chat',1,1,{uses:2,targetAny:true})]);
skillProfile('Spirit Seer|Spy|Sheriff|Journalist|Mortician|Violinist',[SA('observe','Ghi nhận đối tượng điều tra','observe',1,3)], 'Quản trò đối chiếu lịch sử tấn công và chọn kết quả phù hợp ở bảng phân xử; máy không bịa người gây án.');
skillProfile('Red Lady|Ghost Lady|Dorothy|Easter Bunny',[SA('visit','Đặt người ghé thăm','visit')], 'Quản trò xác nhận chết theo, miễn tấn công trực tiếp và hiệu ứng riêng sau khi biết các đòn đêm.');
skillProfile('Beast Hunter|Trapper',[SA('trap','Đặt bẫy chờ kích hoạt','trap',1,1,{phase:'night'}),SA('activate','Kích hoạt các bẫy đã đặt','activateTraps',0,0,{phase:'night'})], 'Bẫy được ghi nhận riêng với khiên. Quản trò xét bẫy đã đủ thời gian và Sói yếu nhất trước khi áp dụng kết quả.');
skillProfile('Seer Apprentice|Grave Robber|Conjuror|Doppelganger|Wolf Magician',[SA('inherit','Nhận / sao chép một vai','transform',1,1,{targetAny:true})], 'Chọn vai mới trong ô Vai kết quả. Quản trò kiểm tra điều kiện kế thừa và thời điểm hoàn nguyên.');
skillProfile('Nutcracker',[SA('march','Bật Final March cho hôm nay','march',0,0,{phase:'day',uses:1})], 'Hai người cao phiếu bị treo; từ ba người đồng hạng nhất thì không ai bị treo. Đồng hạng nhì cần quản trò chọn luật trước.');
skillProfile('Resolutionist',[SA('resolve','Khởi tạo ba phiếu bí mật','resolution',0,0,{uses:1}),SA('broken','Mất vĩnh viễn quyền bỏ phiếu','noVote',0,0)], 'Quản trò kiểm tra mỗi cuối ngày, kể cả ngày bỏ phiếu bị hủy.');
skillProfile('Preacher|Cowardly Lion',[SA('gain','Tăng một phiếu sau khi xét điều kiện','gainVote',0,0)],'Không tự tăng nếu chưa có sự kiện hợp lệ. Sư tử cần chuyển sang bỏ phiếu khi chết theo luật riêng.');
skillProfile('President|Cursed|Werewolf Fan|Kitten Wolf|Stubborn Werewolf|Fool|Headhunter|Lurker|Leprous Human|Sect Hunter|Handsome Prince|Idiot|Little Girl|Drunk|Instigator|Naughty Boy|Sibling|Sister|Wise Man|Mad Scientist',[SA('passive','Phân xử kỹ năng thụ động / luật nhóm','adjudicate',0,0)], 'Kỹ năng phản ứng hoặc luật Classic cần quản trò xác nhận sự kiện. Dùng bảng kết quả để áp dụng chính xác người chết, vai mới, phe và phiếu.');
skillProfile('Villager',[], 'Vai này không có kỹ năng chủ động.');
skillProfile('Ritualist',[SA('ritual','Đặt dấu hồi sinh','ritual')]);
skillProfile('Candy Wolf',[SA('poison','Đặt độc chậm','poison',1,1,{phase:'night',uses:2,minRound:2})]);
skillProfile('Toxic Wolf',[SA('toxic','Đánh dấu bỏ qua bảo vệ','toxic',1,1,{phase:'night',uses:2,minRound:2})]);
skillProfile('Corruptor',[SA('glitch','Khóa nói, phiếu, kỹ năng và đặt chết cuối ngày','corrupt',1,1,{phase:'night'})]);
skillProfile('Blight',[SA('infect','Lây nhiễm mục tiêu','infect',1,1,{phase:'night'}),SA('kill','Giết người đã nhiễm','infectKill',1,1,{phase:'day'})]);
skillProfile('Bomber',[SA('bomb','Đặt ba mục tiêu bom cho đêm kế','bomb',3,3,{phase:'night',cooldown:1})], 'Kiểm tra ba ghế nằm trên một đường theo sơ đồ chỗ ngồi trước khi đặt.');
skillProfile('Siren',[SA('entrance','Mê hoặc ba người','entrance',3,3,{phase:'night'}),SA('kill','Giết tối đa hai người đã mê hoặc','entrancedKill',1,2,{phase:'night'})], 'Quản trò kiểm tra chu kỳ đêm trước khi cho phép giết; cái chết liên kết cần được phân xử.');
skillProfile('Admirer',[SA('target','Đặt người cần sống sót','admirer'),SA('guard','Bảo vệ người được ngưỡng mộ','shield',1,1,{uses:1})]);
skillProfile('Loudmouth',[SA('loudmouth','Đặt người sẽ lộ vai khi mình chết','loudmouth')]);
skillProfile('Gentlewolf',[SA('threshold','Tăng ngưỡng treo mục tiêu','threshold',1,1,{phase:'day',uses:2})]);
skillProfile('Jelly Wolf',[SA('jelly','Bảo hộ trước Làng: đặt dấu phân xử','jelly')]);
skillProfile('Snatcher Wolf',[SA('steal','Cướp một khiên đang có','steal',1,1,{phase:'night',uses:1})]);
skillProfile('Wolffluencer',[SA('influence','Ghi người sẽ bị điều khiển phiếu','influence',1,1,{phase:'night'})]);
skillProfile('Yule Wolf',[SA('yule','Khóa ba người đến khi được giải','yule',3,3,{uses:1})]);
skillProfile('Party Wolf|Firework Wolf',[SA('party','Đòn giết công khai','attack',1,1,{uses:1,minRound:2})]);
skillProfile('Werewolf Berserk',[SA('frenzy','Bật cuồng nộ cho bầy Sói','frenzy',0,0,{phase:'day',uses:1})], 'Khi đòn Sói trúng mục tiêu được bảo vệ, quản trò chọn nạn nhân và tất cả người bảo vệ trong bảng phân xử.');
skillProfile('Confusion Wolf',[SA('hide','Đặt cờ che vai người chết đêm này','hideDeaths',0,0,{phase:'night',uses:2})]);
skillProfile('Storm Wolf',[SA('shuffle','Đổi vị trí: xác nhận sơ đồ ghế mới','adjudicate',0,0,{uses:1}),SA('hideVotes','Đặt cờ giấu phiếu hôm nay','hideVotes',0,0,{phase:'day',uses:2})]);
skillProfile('Swamp Wolf',[SA('flood','Đặt luật ngập: hạn chế lời nói hôm nay','flood',0,0,{uses:1}),SA('fakeVotes','Ghi mục tiêu phiếu giả (không cộng phiếu)','fakeVotes',1,1,{phase:'day',uses:1})]);
skillProfile('Time Traveler',[SA('rewind','Tua về đầu ngày trước','rewind',0,0,{phase:'night',uses:1,minRound:3})]);
skillProfile('Wolf Time Traveler',[SA('rewind','Tua về đầu ngày trước','rewind',0,0,{phase:'both',uses:1,minRound:3})]);
skillProfile('Watchdog',[
  SA('watchWolf','Cử chó chặn Sói','watchWolf',1,1,{phase:'night',perRound:1}),
  SA('watchSolo','Cử chó chặn Sát nhân','watchSolo',1,1,{phase:'night',perRound:1})
], 'Hai chó có thể canh cùng một người. Khi xác nhận đòn Sói hoặc Sát nhân trong bảng, hệ thống chỉ ghi lượt cứu nếu đúng chó đã chặn đòn.');

skillProfile('Forger',[SA('shield','Trao khiên đã rèn','shield',1,1,{uses:2}),SA('sword','Trao kiếm: ghi người giữ','sword',1,1,{uses:1})], 'Phải rèn đủ một ngày, trao đủ hai khiên trước kiếm.');
skillProfile('Fortune Teller',[SA('card','Trao thẻ lộ vai','card',1,1,{phase:'night',uses:2})]);
skillProfile('Judge',[SA('convict','Kết án sau khi kiểm phiếu thất bại','judge',1,1,{phase:'day',uses:2})]);
skillProfile('Prayer',[SA('pray','Đặt người cầu nguyện','prayer'),SA('newPower','Áp dụng kỹ năng được kế thừa','adjudicate',0,0)]);
skillProfile('Ferryman',[SA('ferry','Ghi hai người được chở','ferry',1,2,{phase:'night'})]);
skillProfile('Alchemist',[SA('potions','Bình đen và bình đỏ (theo thứ tự chọn)','alchemist',2,2,{phase:'night'})]);
skillProfile('Pumpkin Dealer',[SA('deal','Ghi lời đề nghị; chờ mục tiêu đồng ý','deal')]);
skillProfile('Evil Santa',[SA('exchange','Đặt hai người đổi quà, chờ lựa chọn kín','exchange',2,2,{phase:'day'})]);
skillProfile('Anarchist|Wizard',[SA('special','Phân xử bỏ phiếu và điều kiện riêng','adjudicate',0,0)]);
skillProfile('Santa Claus|Pumpkin King',[SA('gift','Ghi nhận quà / trao đổi ngoài bàn','gift',0,3,{targetAny:true})], 'Quà sự kiện và trò chuyện thực hiện trực tiếp; không tự thêm đòn đánh hoặc lợi ích không có trong luật.');


skillProfile('Butcher',[SA('meat','Dùng một miếng thịt bảo vệ','shield',1,1,{phase:'night',uses:6})]);
skillProfile('Night Watchman',[SA('guard','Bảo vệ đêm này','shield',1,1,{phase:'night',uses:3,perRound:1})]);
skillProfile('Snow Angel',[SA('snow','Bảo vệ một đòn trong hai đêm','shield',1,1,{phase:'night',uses:3,duration:3,uniqueTargets:true})]);
skillProfile('Wolf Scribe|Wolf Trickster|Illusionist',[SA('disguise','Đặt vai ngụy trang đã phân xử','disguise')], 'Giả cáo phó và đòn giết tập thể của Illusionist được áp dụng sau khi quản trò phân xử.');
SKILL_PROFILES[fold('Evil Cupid')].actions.push(SA('kill','Giết một mục tiêu','attack',1,1,{phase:'night'}));
for(const [role,r] of Object.entries(ROLES)){if(r.random)continue;const profile=SKILL_PROFILES[fold(r.english)];if(r.group==='wolf'&&!['Sorcerer','Werewolf Fan'].includes(r.english)){profile.actions=profile.actions.filter(a=>a.id!=='attack');profile.actions.push(SA('pack','Áp dụng đòn chung của bầy Sói','packAttack',1,1,{phase:'night'}));}}

for(const r of Object.values(ROLES)){if(r.random)continue;const profile=SKILL_PROFILES[fold(r.english)];profile.actions=profile.actions.map(a=>({...a,phase:a.phase||(['night','day'].includes(r.phase)?r.phase:undefined),perRound:a.perRound??(['revenge','mark','adjudicate','noVote','deadVote','gainVote'].includes(a.effect)||r.english==='Butcher'?undefined:1)}));}
function skillsState(){const g=state.game;if(!g)return null;g.skills??={effects:[],uses:{},history:[],phaseSerial:0};return g.skills;}
function skillActions(role){return SKILL_PROFILES[fold(ROLES[role]?.english||'')]||{actions:[SA('adjudicate','Phân xử kỹ năng','adjudicate',0,0)],note:'Luật của vai này cần quản trò xác nhận trước khi áp dụng kết quả.'};}
function skillPanelButton(id){return `<button type="button" class="primary" data-action="skills-open" data-id="${id}">Dùng kỹ năng</button>`;}
const originalShowModPlayer=showModPlayer;
showModPlayer=function(id){originalShowModPlayer(id);modal.querySelector('.actions').insertAdjacentHTML('afterbegin',skillPanelButton(id));};
let skillActor=null,skillChoice=null;
function showSkills(id){const g=state.game,p=byId(id);if(!g?.manual||!secret||!p)return;skillActor=id;skillChoice=null;const profile=skillActions(p.role);modal.innerHTML=`<div class="dialog-head"><h2>Kỹ năng · ${esc(p.name)}</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div><h3>${esc(ROLES[p.role].name)}</h3><p>${esc(ROLES[p.role].desc)}</p>${rolePlayGuide(ROLES[p.role])}${g.houseRules[p.role]?`<p>Luật nhóm: ${esc(g.houseRules[p.role])}</p>`:''}<p class="hint">Bảng hỗ trợ quản trò: các kết quả được áp dụng khi bạn xác nhận. Tương tác phức tạp cần phân xử trước.</p>${ROLES[p.role].english==='Watchdog'?`<p>Đã cứu ${watchdogSaves(p).size} / 3 người khác nhau.</p>`:''}${profile.note?`<p class="assist-note">${esc(profile.note)}</p>`:''}<div class="skill-actions">${profile.actions.map(a=>{const reason=skillUnavailable(p,a);return `<button class="secondary" data-action="skills-choose" data-skill="${a.id}" ${reason?'disabled':''}>${esc(a.label)}${a.uses?` <small>(${Math.max(0,a.uses-skillUsed(p,a).total)} / ${a.uses})</small>`:''}${reason?`<small>${esc(reason)}</small>`:''}</button>`}).join('')||'<p>Không có kỹ năng chủ động.</p>'}<button class="secondary" data-action="skills-adjudicate">Phân xử & áp dụng kết quả khác</button></div><details><summary>Hiệu ứng & lịch sử riêng</summary>${skillsState().effects.filter(e=>e.actor===id||e.targets.includes(id)).map(e=>`<p>${esc(e.label)} · ${e.until==null?'Duy trì':`còn đến hết ${e.until}`}</p>`).join('')}${skillsState().history.filter(e=>e.actor===id).slice(-10).map(e=>`<p>${esc(e.text)}</p>`).join('')}</details>`;if(!modal.open)modal.showModal();}
function skillUsed(p,a){return skillsState().uses[`${p.id}:${p.role}:${a.id}`]||{total:0,round:0,count:0};}
function captureDayStart(game) {
  const checkpoints = (game.mod.dayStarts || []).filter(day => day.round < game.round);
  game.mod.dayStarts = [...checkpoints, captureModState(game)].slice(-3);
}

function rewindPlan(game) {
  const checkpoint = game.mod.dayStarts?.find(day => day.round === game.round - 1);
  if (!checkpoint) return null;
  const conversions = game.players.filter(player => {
    const previous = checkpoint.players.find(entry => entry.id === player.id);
    if (!previous || skillTeam(player) === 'Phe Làng' || skillTeam(player) === 'Chưa có phe') return false;
    return skillTeam(player) !== skillTeam(previous);
  });
  return { checkpoint, conversions };
}

function rewindPreview(game) {
  const plan = rewindPlan(game);
  if (!plan) return '<p>Chưa có mốc đầu ngày trước.</p>';
  const {checkpoint, conversions} = plan;
  const revived = checkpoint.players.filter(player => player.alive && !byId(player.id)?.alive);
  const removed = checkpoint.players.filter(player => !player.alive && byId(player.id)?.alive);
  const currentUses = skillsState().uses;
  const returned = Object.entries(currentUses).filter(([key, use]) => !key.includes(':watchdog:') && !key.endsWith(':rewind') && use.total > (checkpoint.skills?.uses[key]?.total || 0));
  const names = players => players.map(player => esc(player.name)).join(', ') || 'Không có';
  return `<p>Quay lại đầu ngày ${checkpoint.round}.</p>
    <p>Sống lại: ${names(revived)}.</p><p>Trở lại trạng thái đã bị loại: ${names(removed)}.</p>
    <p>Giữ phe mới: ${conversions.map(player => esc(player.name + ' (' + skillTeam(player) + ')')).join(', ') || 'Không có'}.</p>
    <p>Hoàn trả lượt đã dùng: ${returned.map(([key, use]) => {
      const [id, role, action] = key.split(':');
      const label = skillActions(role).actions.find(entry => entry.id === action)?.label || action;
      const count = use.total - (checkpoint.skills?.uses[key]?.total || 0);
      return esc((byId(Number(id))?.name || id) + ' · ' + label + ' ×' + count);
    }).join(', ') || 'Không có'}. Lượt tua vừa dùng vẫn bị trừ.</p>`;
}

function applyRewind(game, actor, action) {
  const plan = rewindPlan(game);
  if (!plan) throw Error('Chưa có mốc đầu ngày trước.');
  const before = structuredClone(game);
  const spent = `${actor.id}:${actor.role}:${action.id}`;
  const previousUses = Object.entries(skillsState().uses).filter(([key]) => key.endsWith(':rewind'));
  modSnapshot();
  restoreModState(game, plan.checkpoint);
  game.mod.draft = '';
  game.mod.draftTarget = '';
  for (const player of plan.conversions) {
    const restored = byId(player.id);
    restored.role = player.role;
    restored.modTeam = skillTeam(player);
  }
  const uses = skillsState().uses;
  for (const [key, use] of previousUses) if (use.total) uses[key] = use;
  uses[spent] = {total:1,round:game.round,count:1};
  const message = 'Đã quay lại đầu ngày ' + game.round + '.';
  skillRecord(byId(actor.id), action, message);
  if (!save()) {
    state.game = before;
    throw Error('Chưa lưu được ván. Việc tua chưa được áp dụng.');
  }
  return message;
}

const watchdogSaveKey = (actor, target) => `${actor}:watchdog:save-${target}`;

function watchdogSaves(actor) {
  const id = typeof actor === 'number' ? actor : actor.id;
  return new Set(state.game.players.filter(player => skillsState().uses[watchdogSaveKey(id, player.id)]?.total).map(player => player.id));
}

function blockWatchdogAttack(target, source) {
  const kind = {wolf:'watchWolf',solo:'watchSolo'}[source];
  if (!kind) return false;
  const dog = activeSkillEffects(target.id, kind).find(effect => watchdogSaves(effect.actor).size < 3);
  if (!dog) return false;
  skillRemove(dog);
  skillsState().uses[watchdogSaveKey(dog.actor, target.id)] = {total:1,round:state.game.round,count:1};
  skillRecord(byId(dog.actor), {id:'watchdog-save',label:dog.label,targets:[target.id]}, 'Đã cứu ' + target.name);
  return true;
}

function skillUnavailable(p,a){const g=state.game,u=skillUsed(p,a);if(a.effect==='rewind'&&!rewindPlan(g))return 'Chưa có mốc đầu ngày trước';if(['watchWolf','watchSolo'].includes(a.effect)&&watchdogSaves(p).size>=3)return 'Đã cứu đủ 3 người khác nhau';if(p.skillRestUntil>=g.round&&a.effect==='compare')return 'Đang nghỉ một đêm sau kết quả cùng hào quang';if(a.effect==='packAttack'&&skillsState().effects.some(e=>e.kind==='packSpent'))return 'Bầy Sói đã tấn công giai đoạn này';if(!p.alive&&!a.allowDead)return 'Người dùng đã chết';if((p.modBlocked||activeSkillEffects(p.id,'block').length||activeSkillEffects(p.id,'yule').some(e=>!skillWolf(p)))&&a.effect!=='adjudicate')return 'Đang bị khóa kỹ năng';if(a.phase&&a.phase!=='both'&&a.phase!==g.mod.phase)return a.phase==='night'?'Dùng ban đêm':'Dùng ban ngày';if(a.minRound&&g.round<a.minRound)return `Từ vòng ${a.minRound}`;if(a.uses&&u.total>=a.uses)return 'Đã hết lượt';if(a.perRound&&u.round===g.round&&u.count>=a.perRound)return 'Đã dùng trong vòng này';if(a.cooldown&&u.total&&g.round<=u.round+a.cooldown)return 'Đang chờ hồi';return '';}
function chooseSkill(id,custom=false){const p=byId(skillActor),a=custom?SA('custom','Phân xử kết quả','adjudicate',0,24,{allowDead:true,targetAny:true}):skillActions(p.role).actions.find(a=>a.id===id);if(!a)return;skillChoice=a;const targets=state.game.players.filter(t=>a.targetAny||(a.dead?!t.alive:t.alive));modal.innerHTML=`<div class="dialog-head"><h2>${esc(a.label)}</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div><form id="skillForm"><p>${esc(p.name)} · ${esc(ROLES[p.role].name)}</p>${a.effect==='rewind'?rewindPreview(state.game):''}<p class="hint">Chọn ${a.min===a.max?a.min:`${a.min} đến ${a.max}`} người${a.min===2?' (theo thứ tự ô bên dưới)':''}. Chưa có thay đổi cho đến khi nhấn Áp dụng.</p>${Array.from({length:a.effect==='adjudicate'?Math.min(4,a.max):a.max},(_,i)=>`<label class="field"><span>${['watchWolf','watchSolo'].includes(a.effect)?esc(a.label):'Mục tiêu '+(i+1)}</span><select name="target${i}" ${i<a.min?'required':''}><option value="">Không chọn</option>${targets.map(t=>`<option value="${t.id}">${esc(t.name)}${t.alive?'':' · đã chết'}</option>`).join('')}</select></label>`).join('')}${a.effect==='adjudicate'?`<button type="button" class="secondary" data-action="skills-add-target">Thêm ô mục tiêu</button><label class="field"><span>Kết quả đã phân xử</span><select name="outcome"><option value="note">Chỉ ghi nhận sự kiện</option><option value="kill">Loại các mục tiêu</option><option value="revive">Hồi sinh các mục tiêu</option><option value="transform">Đổi vai các mục tiêu</option><option value="team">Đổi phe, giữ vai</option><option value="shield">Trao một khiên</option><option value="block">Khóa kỹ năng</option><option value="silence">Cấm nói và bỏ phiếu</option><option value="clear">Xóa hiệu ứng hỗ trợ của mục tiêu</option></select></label>`:''}${['adjudicate','disguise','transform'].includes(a.effect)?`<label class="field"><span>Vai kết quả / ngụy trang</span><select name="role"><option value="">Chọn vai nếu cần</option>${modOptions('',null)}</select></label><label class="field"><span>Phe kết quả (nếu đổi phe)</span><input name="team" maxlength="60"></label>`:''}${a.duration===2?'<p class="hint">Hiệu ứng tự hết khi kết thúc ngày ngay sau đêm này.</p>':['shield','block','silence','jail','adjudicate','disguise','redirect'].includes(a.effect)?`<label class="field"><span>Thời hạn hiệu ứng</span><select name="duration"><option value="1">Đến hết giai đoạn này</option><option value="2">Đến hết giai đoạn kế tiếp</option><option value="3">Đến hết hai giai đoạn kế tiếp</option><option value="0">Duy trì đến khi dùng / xóa</option></select></label>`:''}${!a.source&&['attack','kill','meteor','backfire','holy'].includes(a.effect)?`<label class="field"><span>Nguồn tấn công</span><select name="source"><option value="skill">Kỹ năng / đòn đã phân xử</option><option value="wolf">Bầy Sói</option><option value="solo">Sát thủ</option><option value="lynch">Treo cổ</option><option value="pierce">Bỏ qua bảo vệ</option></select></label>`:''}<label class="field"><span>Ghi chú / kết quả gửi riêng</span><textarea name="note" maxlength="1000" rows="2" ${a.effect==='adjudicate'?'required':''}></textarea></label><p id="skillError" role="alert"></p><div class="actions"><button type="button" class="secondary" data-action="skills-open" data-id="${p.id}">Quay lại</button><button class="primary" type="submit">Áp dụng kỹ năng</button></div></form>`;}
function skillEffect(actor,a,targets,extra={}){const s=skillsState(),e={id:crypto.randomUUID(),actor:actor.id,targets:[...targets],kind:a.effect,label:a.label,created:s.phaseSerial,until:null,...extra};s.effects.push(e);return e;}
function activeSkillEffects(id,kind){return skillsState().effects.filter(e=>e.targets.includes(id)&&(!kind||e.kind===kind));}
function skillTeam(p){return p.modTeam||ROLES[p.role].team;}
function skillWolf(p){return ROLES[p.role].group==='wolf'||skillTeam(p)==='Phe Sói';}
function skillVillage(p){return ROLES[p.role].group==='village'&&skillTeam(p)==='Phe Làng';}
function skillRecord(p,a,text){const s=skillsState();const entry=`${state.game.mod.phase==='night'?'Đêm':'Ngày'} ${state.game.round} · ${p.name} · ${a.label}: ${text}`;s.history.push({actor:p.id,skillId:a.id||'',targets:a.targets||[],text:entry});state.game.mod.records.push(entry);addLog(entry);if(s.history.length>1000)s.history.shift();}
function skillRemove(e){const s=skillsState();s.effects=s.effects.filter(x=>x.id!==e.id);}
function skillDeath(ids,reason='kỹ năng',pierce=true,source='skill',visited=new Set()){
 const g=state.game,dead=[];for(const id of ids){const p=byId(id);if(!p?.alive||visited.has(id))continue;visited.add(id);
 if(source==='lynch'){const shield=activeSkillEffects(id,'lynchShield')[0]||activeSkillEffects(id,'rain')[0];if(shield){skillRemove(shield);continue;}}
 if(!pierce&&source!=='lynch'){if(source==='wolf'&&skillsState().effects.some(e=>e.kind==='newMoon'))continue;const redirect=activeSkillEffects(id,'redirect').find(e=>e.targets[0]===id);if(redirect){skillRemove(redirect);dead.push(...skillDeath([redirect.targets[1]],reason,false,source,visited));continue;}const jail=activeSkillEffects(id,'jail')[0],shield=activeSkillEffects(id,'shield')[0];if(jail)continue;if(shield){skillRemove(shield);continue;}if(blockWatchdogAttack(p,source))continue;}

 if(source==='wolf'&&['cursed','werewolf fan'].includes(fold(ROLES[p.role].english))){p.role='wolf';p.modTeam='Phe Sói';continue;}
 p.alive=false;p.modDeathCause=reason;dead.push(id);if(!g.mod.pending.includes(id))g.mod.pending.push(id);
 if(p.role==='hunter'&&!g.hunterUsed){g.hunterUsed=true;if(g.hunterTarget!=null)dead.push(...skillDeath([g.hunterTarget],'phát súng Thợ săn',true,'skill',visited));}
 if(g.lovers?.includes(id))dead.push(...skillDeath(g.lovers.filter(t=>t!==id),'tình nhân chết theo',true,'skill',visited));
 for(const e of [...skillsState().effects]){if(e.kind==='revenge'&&e.actor===id){skillRemove(e);dead.push(...skillDeath(e.targets,'kỹ năng trả thù',true,'skill',visited));}if(e.kind==='bond'&&e.targets.includes(id)){skillRemove(e);dead.push(...skillDeath(e.targets,'liên kết chết theo',true,'skill',visited));}if(e.kind==='loudmouth'&&e.actor===id){g.mod.report.push(...e.targets.map(t=>`${byId(t).name}: ${ROLES[byId(t).role].name}`));skillRemove(e);}if(e.kind==='bells'&&e.targets.includes(id)){const other=e.targets.find(t=>t!==id);if(other!=null)skillRecord(byId(e.actor),{label:'Kết quả chuông'},`${byId(other).name}: ${ROLES[byId(other).role].name}`);skillRemove(e);}if(e.kind==='ritual'&&e.targets.includes(id)){e.kind='reviveDue';e.due=skillsState().phaseSerial+2;}}
 }
 return dead;
}
function applySkill(actorId,action,ids,options={}){
 const g=state.game;if(!g?.manual||!secret)throw Error('Chỉ quản trò được dùng kỹ năng.');const p=byId(actorId),a=action;if(!p||!a)throw Error('Không có kỹ năng.');const denied=skillUnavailable(p,a);if(denied)throw Error(denied);if(new Set(ids).size!==ids.length||ids.length<a.min||ids.length>a.max||ids.some(id=>!byId(id)))throw Error('Chọn đủ mục tiêu khác nhau.');if(a.effect!=='adjudicate'&&ids.some(id=>a.dead?byId(id).alive:!a.targetAny&&!byId(id).alive))throw Error(a.dead?'Chọn người đã chết.':'Chọn người còn sống.');
 if(['revenge','holy','attack','backfire'].includes(a.effect)&&ids.includes(p.id))throw Error('Kỹ năng này cần chọn người khác.');
 if(a.effect==='rewind')return applyRewind(g,p,a);
 const outcome=a.effect==='adjudicate'?options.outcome||'note':a.effect;
 if(['transform','disguise'].includes(outcome)&&(!ROLES[options.role]||ROLES[options.role].random))throw Error('Chọn vai kết quả cụ thể.');
 if(a.effect==='adjudicate'&&outcome!=='note'&&!ids.length)throw Error('Chọn ít nhất một mục tiêu để thay đổi.');
 if(outcome==='team'&&!String(options.team||'').trim())throw Error('Nhập phe kết quả.');
 if(outcome==='reviveVillage'&&ids.some(id=>!skillVillage(byId(id))))throw Error('Chỉ hồi sinh người phe Làng.');if(outcome==='reviveWolf'&&ids.some(id=>!skillWolf(byId(id))))throw Error('Chỉ hồi sinh người phe Sói.');
 if(outcome==='sect'&&ids.some(id=>!skillVillage(byId(id))||['cursed'].includes(byId(id).role)))throw Error('Mục tiêu không thể kết nạp.');
 if(outcome==='zombie'&&ids.some(id=>!skillVillage(byId(id))))throw Error('Không thể cắn Sói hoặc sát thủ.');
 if(['infectKill','entrancedKill'].includes(outcome)&&ids.some(id=>!activeSkillEffects(id,outcome==='infectKill'?'infect':'entrance').some(e=>e.actor===p.id)))throw Error('Chưa đặt dấu hợp lệ trên mục tiêu.');
 const s=skillsState(),duration=Number(options.duration??1);if(![0,1,2,3].includes(duration))throw Error('Thời hạn không hợp lệ.');const effectiveDuration=a.duration??duration,until=effectiveDuration?s.phaseSerial+effectiveDuration-1:null;let result=ids.map(id=>byId(id).name).join(', ')||'đã xác nhận';
 if(outcome==='eat'&&ids.length>(p.skillHunger||1))throw Error('Không đủ điểm đói.');
 if(a.uniqueTargets&&ids.some(id=>s.history.some(h=>h.actor===p.id&&h.skillId===a.id&&h.targets?.includes(id))))throw Error('Vai này không được chọn lại người đã bảo vệ.');
 if(outcome==='steal'&&!activeSkillEffects(ids[0],'shield').length)throw Error('Mục tiêu chưa có khiên được ghi nhận.');
 if(outcome==='backfire'&&(!p.skillMark||p.skillMark.id!==ids[0]||p.skillMark.round>=g.round))throw Error('Mục tiêu phải được đánh dấu từ vòng trước.');
 const before=structuredClone(g);modSnapshot();
 const add=(kind=outcome,extra={})=>skillEffect(p,{...a,effect:kind},ids,extra);
 switch(outcome){
 case 'role':result=ids.map(id=>{const t=byId(id),mask=activeSkillEffects(id,'disguise').at(-1);return `${t.name}: ${ROLES[mask?.role||t.role].name}`}).join('; ');break;
 case 'aura':result=ids.map(id=>`${byId(id).name}: ${skillTeam(byId(id))}`).join('; ');break;
 case 'compare':{const same=skillTeam(byId(ids[0]))===skillTeam(byId(ids[1]));result=same?'Cùng phe theo hồ sơ hiện tại':'Khác phe theo hồ sơ hiện tại';if(ROLES[p.role].english==='Analyst'&&same)p.skillRestUntil=g.round+1;break;}
 case 'packAttack':case 'attack':case 'kill':case 'infectKill':case 'entrancedKill':case 'eat':{const dead=skillDeath(ids,a.label,outcome==='kill'||(!a.source&&options.source==='pierce'),outcome==='packAttack'?'wolf':a.source||options.source||'skill');if(outcome==='packAttack')skillEffect(p,{...a,effect:'packSpent'},[],{until:s.phaseSerial});result=dead.length?'Bị loại: '+dead.map(id=>byId(id).name).join(', '):'Không ai bị loại; đòn đã bị chặn.';if(outcome==='eat')p.skillHunger=1;break;}
 case 'holy':case 'backfire':case 'meteor':case 'judge':{const target=byId(ids[0]),bad=outcome==='holy'?!skillWolf(target):skillVillage(target);const victims=outcome==='meteor'&&bad?[p.id,target.id]:[bad?p.id:target.id];skillDeath(victims,a.label,true);if(outcome==='backfire')p.skillMark=null;result=victims.map(id=>byId(id).name).join(', ')+' bị loại.';break;}
 case 'evilCompare':{if(skillTeam(byId(ids[0]))!==skillTeam(byId(ids[1])))skillDeath(ids.filter(id=>id!==p.id),a.label,true);break;}
 case 'shield':case 'block':case 'silence':case 'disguise':case 'jail':case 'redirect':add(outcome,{until,role:options.role});if(outcome==='jail')add('block',{until});break;
 case 'lynchShield':case 'rain':add();break;
 case 'clear':s.effects=s.effects.filter(e=>!e.targets.some(id=>ids.includes(id)));break;
 case 'threshold':add('threshold',{delta:Math.floor(g.players.filter(p=>p.alive).length/4),until:s.phaseSerial});break;
 case 'yule':add();break;
 case 'activateTraps':s.effects.filter(e=>e.actor===p.id&&e.kind==='trap').forEach(e=>{e.active=true});break;
 case 'revenge':s.effects=s.effects.filter(e=>!(e.actor===p.id&&e.kind==='revenge'));add();if(p.role==='hunter')g.hunterTarget=ids[0];break;
 case 'loudmouth':case 'bells':s.effects=s.effects.filter(e=>!(e.actor===p.id&&e.kind===outcome));add();break;
 case 'bond':add();break;
 case 'reveal':g.mod.report.push(...ids.map(id=>`${byId(id).name}: ${ROLES[byId(id).role].name}`));break;
 case 'mayor':p.modVotes=2;g.mod.report.push(`${p.name} công khai vai ${ROLES[p.role].name}.`);break;
 case 'voteAdd':add('voteAdd',{until:s.phaseSerial+1,delta:a.delta||1});break;
 case 'gainVote':p.modVotes=Math.min(4,p.modVotes+1);break;
 case 'resolution':p.modVotes=3;break;
 case 'noVote':p.modVotes=0;break;
 case 'deadVote':p.modDeadVotes=true;break;
 case 'shadow':skillEffect(p,a,g.players.filter(skillWolf).map(p=>p.id),{until:s.phaseSerial});break;
 case 'revive':case 'reviveVillage':case 'reviveWolf':ids.forEach(id=>{const t=byId(id);t.alive=true;if(outcome==='reviveWolf'){t.role='wolf';t.modTeam='Phe Sói'}g.mod.pending=g.mod.pending.filter(x=>x!==id)});break;
 case 'transform':ids.forEach(id=>{byId(id).role=options.role;byId(id).modTeam=ROLES[options.role].team});break;
 case 'team':ids.forEach(id=>byId(id).modTeam=String(options.team).slice(0,60));break;
 case 'recruit':ids.forEach(id=>{const t=byId(id);if(skillWolf(t))skillDeath([id],a.label,true);else{t.role=Object.keys(ROLES).find(k=>ROLES[k].english==='Accomplice');t.modTeam='Phe Cướp'}});p.modTeam='Phe Cướp';break;
 case 'sect':ids.forEach(id=>byId(id).modTeam='Giáo phái '+p.id);add();break;
 case 'zombie':add('zombieDue',{due:s.phaseSerial+3});break;
 case 'ritual':case 'douse':case 'infect':case 'entrance':case 'visit':case 'observe':case 'trap':case 'influence':case 'prayer':case 'ferry':case 'toxic':case 'jelly':case 'admirer':case 'sword':case 'card':case 'deal':case 'exchange':case 'gift':case 'chat':case 'fakeVotes':add();break;
 case 'ignite':case 'killMarked':{const kind=outcome==='ignite'?'douse':'seaMark',marked=s.effects.filter(e=>e.actor===p.id&&e.kind===kind),targets=[...new Set(marked.flatMap(e=>e.targets))];skillDeath(targets,a.label,true);s.effects=s.effects.filter(e=>!marked.includes(e));result=targets.map(id=>byId(id).name).join(', ')||'Chưa có mục tiêu được đánh dấu.';break;}
 case 'seaMark':add();break;
 case 'newMoon':case 'hideDeaths':case 'hideVotes':case 'flood':case 'frenzy':case 'march':case 'peace':add(outcome,{until:outcome==='newMoon'?s.phaseSerial:s.phaseSerial+1});if(outcome==='peace')g.mod.report.push(...ids.map(id=>`${byId(id).name}: ${ROLES[byId(id).role].name}`));break;
 case 'hunger':p.skillHunger=Math.min(5,(p.skillHunger||1)+1);result='Điểm đói: '+p.skillHunger;break;
 case 'mark':p.skillMark={id:ids[0],round:g.round};break;
 case 'concuss':{const t=byId(ids[0]);if(t.skillConcussed)skillDeath(ids,a.label,true);else{t.skillConcussed=true;add('block',{until:s.phaseSerial+1})}break;}
 case 'poison':case 'bomb':case 'corrupt':case 'alchemist':{add(outcome==='bomb'?'bombDue':outcome==='alchemist'?'alchemistDue':outcome==='corrupt'?'corruptDue':'poisonDue',{due:s.phaseSerial+(outcome==='bomb'||outcome==='poison'?2:1)});if(outcome==='corrupt'){add('silence',{until:s.phaseSerial+1});add('block',{until:s.phaseSerial+1})}break;}
 case 'steal':skillRemove(activeSkillEffects(ids[0],'shield')[0]);skillEffect(p,{...a,effect:'shield'},[p.id]);break;
 case 'watchWolf':case 'watchSolo':add(outcome,{until:s.phaseSerial});break;
 case 'note':break;
 default:throw Error('Hiệu ứng chưa được hỗ trợ.');
 }
 const key=`${p.id}:${p.role}:${a.id}`,u=s.uses[key]||{total:0,round:0,count:0};s.uses[key]={total:u.total+1,round:g.round,count:u.round===g.round?u.count+1:1};
 if(outcome==='packAttack')skillEffect(p,{...a,effect:'packSpent'},[],{until:s.phaseSerial});if(options.resolveEffect){const resolved=s.effects.find(e=>e.id===options.resolveEffect&&e.actor===p.id);if(resolved)skillRemove(resolved);}
 skillRecord(p,{...a,targets:ids},result+(options.note?' · '+String(options.note).slice(0,1000):''));if(!save()){state.game=before;throw Error('Chưa lưu được kỹ năng. Dữ liệu trước thao tác được giữ nguyên.')}return result;
}
function skillAdvance(){const s=skillsState();s.phaseSerial++;s.effects=s.effects.filter(e=>e.until==null||e.until>=s.phaseSerial);}
function skillVotes(p){let n=p.modVotes;if(p.modMuted||activeSkillEffects(p.id,'silence').length||activeSkillEffects(p.id,'seaMark').length)return 0;for(const e of activeSkillEffects(p.id,'voteAdd'))n+=e.delta||1;if(activeSkillEffects(p.id,'shadow').length)n*=2;return n;}
const originalModTally=modTally;
modTally=function(){if(!state.game?.skills)return originalModTally();const tally={};for(const p of state.game.players.filter(p=>p.alive||p.modDeadVotes)){const raw=state.game.ballots[p.id],id=Number(raw);if(raw!=null&&raw!==''&&byId(id)?.alive)tally[id]=(tally[id]||0)+skillVotes(p);}return tally;};
const originalModeratorView=moderatorView;
moderatorView=function(){let html=originalModeratorView();if(!state.game?.manual||!secret||state.game.stage!=='moderator')return html;const g=state.game,s=skillsState(),due=s.effects.filter(e=>e.due!=null&&e.due<=s.phaseSerial);html=html.replace('<div class="mod-toolbar">',`<div class="mod-toolbar"><button class="primary" data-action="skills-roster">Dùng kỹ năng các vai</button><button class="secondary" data-action="skills-effects">Hiệu ứng đang có (${s.effects.length})${due.length?' · '+due.length+' đến hạn':''}</button>`);const current=g.mod.queue[g.mod.step];if(g.mod.phase==='night'&&current){const actors=g.players.filter(p=>p.role===current||p.initialRole===current);html=html.replace('<p class="english-name">',`<div class="actions">${actors.map(p=>`<button class="primary" data-action="skills-open" data-id="${p.id}">Dùng kỹ năng · ${esc(p.name)}</button>`).join('')}</div><p class="english-name">`);}
 html=html.replace('Quản trò tự xử lý kỹ năng và xét thắng.','Quản trò xác nhận tương tác và kết quả thắng.').replace('Bảng hỗ trợ ghi lựa chọn, đổi vai, loại/hồi sinh và tính phiếu.','Mở Dùng kỹ năng để áp dụng hiệu ứng, theo dõi lượt và mục tiêu.');return html;};
function showSkillRoster(){if(!state.game?.manual||!secret)return;modal.innerHTML=`<div class="dialog-head"><h2>Dùng kỹ năng</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div><p class="hint">Chọn người sử dụng. Vai và lịch sử chỉ hiển thị trên máy quản trò.</p><div class="skill-roster">${state.game.players.map(p=>`<button class="secondary" data-action="skills-open" data-id="${p.id}">${avatar(p)}<span>${esc(p.name)}<small>${ROLES[p.role].name} · ${p.alive?'Còn sống':'Đã chết'}</small></span></button>`).join('')}</div>`;if(!modal.open)modal.showModal();}
function showSkillEffects(){const s=skillsState();modal.innerHTML=`<div class="dialog-head"><h2>Hiệu ứng & việc đến hạn</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div><p class="hint">Lịch độc, bom, chuyển hóa và hồi sinh cần được xác nhận sau khi xét các bảo vệ, chết liên kết và điều kiện của vai.</p><div class="skill-effects">${s.effects.map(e=>`<article class="panel"><div class="panel-body"><b>${esc(e.label)}</b><p>${esc(byId(e.actor)?.name||'')} → ${e.targets.map(id=>esc(byId(id)?.name||'')).join(', ')||'Toàn bàn'}</p><small>${e.due!=null?(e.due<=s.phaseSerial?'ĐẾN HẠN · cần phân xử':'Còn '+(e.due-s.phaseSerial)+' giai đoạn'):e.until==null?'Duy trì':'Còn '+(e.until-s.phaseSerial+1)+' giai đoạn'}</small><div class="actions"><button class="secondary" data-action="skills-resolve" data-effect="${e.id}">Phân xử hiệu ứng</button><button class="text-btn" data-action="skills-remove" data-effect="${e.id}">Xóa hiệu ứng</button></div></div></article>`).join('')||'<p>Chưa có hiệu ứng.</p>'}</div>`;if(!modal.open)modal.showModal();}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!state.game?.manual||!secret)return;switch(b.dataset.action){case 'skills-add-target':{const form=document.getElementById('skillForm'),inputs=form.querySelectorAll('[name^="target"]');if(inputs.length>=24)return;const row=inputs[0].closest('label').cloneNode(true);row.querySelector('span').textContent='Mục tiêu '+(inputs.length+1);const select=row.querySelector('select');select.name='target'+inputs.length;select.value='';select.required=false;b.before(row);break;}case 'skills-open':showSkills(Number(b.dataset.id));break;case 'skills-roster':showSkillRoster();break;case 'skills-choose':chooseSkill(b.dataset.skill);break;case 'skills-adjudicate':chooseSkill('custom',true);break;case 'skills-effects':showSkillEffects();break;case 'skills-remove':{const effect=skillsState().effects.find(x=>x.id===b.dataset.effect);if(!effect)return;modSnapshot();skillRemove(effect);skillRecord(byId(effect.actor),{label:'Xóa hiệu ứng'},effect.label);save();showSkillEffects();break;}case 'skills-resolve':{const effect=skillsState().effects.find(x=>x.id===b.dataset.effect);if(!effect)return;skillActor=effect.actor;chooseSkill('custom',true);modal.querySelector('form').insertAdjacentHTML('beforeend',`<input type="hidden" name="resolveEffect" value="${effect.id}">`);modal.querySelector('textarea[name="note"]').value='Phân xử: '+effect.label;const inputs=[...modal.querySelectorAll('[name^="target"]')];effect.targets.forEach((id,i)=>{if(inputs[i])inputs[i].value=id});break;}}});
document.addEventListener('submit',e=>{if(e.target.id!=='skillForm')return;e.preventDefault();try{const data=new FormData(e.target),ids=[...data.entries()].filter(([k,v])=>k.startsWith('target')&&v!=='').map(([,v])=>Number(v));const result=applySkill(skillActor,skillChoice,ids,Object.fromEntries(data.entries()));modal.innerHTML=`<div class="dialog-head"><h2>Đã áp dụng</h2><button class="close" data-action="close" aria-label="Đóng">×</button></div><p>${esc(result)}</p><p class="hint">Thông tin bí mật, chỉ quản trò xem. Có thể hoàn tác ở bảng quản trò.</p><div class="actions"><button class="primary" data-action="skills-open" data-id="${skillActor}">Về kỹ năng người này</button><button class="secondary" data-action="close">Xong</button></div>`;render();}catch(err){document.getElementById('skillError').textContent=err.message;}});

render();

const originalValidateBackupGame=validateBackupGame;
validateBackupGame=function(raw){
 const g=originalValidateBackupGame(raw);
 if (g.mod?.dayStarts !== undefined) {
   if (!Array.isArray(g.mod.dayStarts) || g.mod.dayStarts.length > 3) throw Error('Mốc đầu ngày không hợp lệ.');
   const rounds = new Set();
   for (const day of g.mod.dayStarts) {
     if (day?.phase !== 'day' || !Number.isInteger(day.round) || day.round < 1 || rounds.has(day.round) ||
         !Array.isArray(day.players) || day.players.length !== g.players.length || typeof day.label !== 'string' ||
         day.label.length > 50) throw Error('Mốc đầu ngày không hợp lệ.');
     rounds.add(day.round);
     const check = structuredClone({...g, mod:{...g.mod, dayStarts:undefined, snapshots:[day]}});
     restoreModState(check, day);
     validateBackupGame(check);
   }
 }
 if(!g.skills)return g;const s=g.skills,validId=id=>Number.isInteger(id)&&g.players.some(p=>p.id===id),smallString=(v,n)=>typeof v==='string'&&v.length<=n;
 if(!s||!Array.isArray(s.effects)||s.effects.length>512||!Array.isArray(s.history)||s.history.length>1000||!s.uses||typeof s.uses!=='object'||Array.isArray(s.uses)||Object.keys(s.uses).length>3000||!Number.isInteger(s.phaseSerial)||s.phaseSerial<0||s.phaseSerial>30000)throw Error('Dữ liệu kỹ năng không hợp lệ.');
 for(const e of s.effects){if(!e||!smallString(e.id,100)||!/^[A-Za-z0-9_-]+$/.test(e.id)||!smallString(e.kind,60)||!smallString(e.label,200)||!validId(e.actor)||!Array.isArray(e.targets)||e.targets.length>24||e.targets.some(id=>!validId(id))||e.until!=null&&(!Number.isInteger(e.until)||e.until<0)||e.due!=null&&(!Number.isInteger(e.due)||e.due<0)||e.role!=null&&!ROLES[e.role]||e.delta!=null&&(!Number.isInteger(e.delta)||e.delta<0||e.delta>20))throw Error('Hiệu ứng kỹ năng không hợp lệ.');}
 for(const h of s.history)if(!h||!validId(h.actor)||!smallString(h.text,3000)||h.skillId!=null&&!smallString(h.skillId,80)||h.targets!=null&&(!Array.isArray(h.targets)||h.targets.some(id=>!validId(id))))throw Error('Lịch sử kỹ năng không hợp lệ.');
 for(const [k,u]of Object.entries(s.uses))if(k.length>150||!u||!['total','round','count'].every(key=>Number.isInteger(u[key])&&u[key]>=0&&u[key]<=30000))throw Error('Số lượt kỹ năng không hợp lệ.');
 for(const p of g.players){if(p.skillMark&&(!validId(p.skillMark.id)||!Number.isInteger(p.skillMark.round)))throw Error('Dấu kỹ năng không hợp lệ.');if(p.skillHunger!=null&&(!Number.isInteger(p.skillHunger)||p.skillHunger<1||p.skillHunger>5))throw Error('Điểm kỹ năng không hợp lệ.');}return g;
};
// Use the same death pipeline for direct moderator eliminations and action effects.
const originalModSetAlive=modSetAlive;
modSetAlive=function(id,alive){if(!state.game?.skills)return originalModSetAlive(id,alive);modSnapshot();if(alive){byId(id).alive=true;state.game.mod.pending=state.game.mod.pending.filter(t=>t!==id);skillRecord(byId(id),{label:'Hồi sinh'},byId(id).name);save();return[id];}const before=state.game.players.filter(p=>p.alive).map(p=>p.id),dead=skillDeath([id],'quản trò loại',true);skillRecord(byId(id),{label:'Loại người'},dead.map(t=>byId(t).name).join(', '));save();return before.filter(t=>!byId(t).alive);};
