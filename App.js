const $=s=>document.querySelector(s);
const TYPES={dtt:'Tentativa Discreta',ta:'Análise de Tarefas',nat:'Ensino Naturalístico'};
const HELPS=['Física total','Física parcial','Gestual','Verbal','Visual','Modelo','Variadas'];
const BEH=['Agressão','Autolesão','Fuga','Birra','Estereotipia'];
const REI=['Elogio','Brinquedo','Lanche','Tablet','Música','Abraço'];
const LAB={i:'Independente',a:'Com ajuda',e:'Erro'};
const ADMIN={k:'tiatay',show:'TiaTay',name:'Tia Tay',admin:true,ph:['579f4ad1d916f964b1c2152cf599ef02091928fc7b46df6bf1de609677fab0c9','f1428089565']};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'').toLowerCase();
const uid=()=>Math.random().toString(36).slice(2,9);
const dkey=v=>{const d=new Date(v);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const hm=v=>new Date(v).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const TOL=15;
function aMatch(a,dx){
 const sa=(dx.agenda||[]).filter(x=>x.pid===a.pid&&x.date===a.date),ss=dx.sessions.filter(x=>x.pid===a.pid&&dkey(x.date)===a.date),pr=[];
 sa.forEach(x=>ss.forEach(s=>pr.push({x,s,d:Math.abs(new Date(s.date)-new Date(x.date+'T'+x.time+':00'))})));
 pr.sort((p,q)=>p.d-q.d);const ux=new Set(),us=new Set();
 for(const p of pr){if(ux.has(p.x.id)||us.has(p.s))continue;ux.add(p.x.id);us.add(p.s);if(p.x.id===a.id)return p.s}
 return null;
}
function aStat(a,dx){
 dx=dx||db;const sc=new Date(a.date+'T'+a.time+':00'),now=new Date();
 const s=aMatch(a,dx);
 if(s){const m=Math.round((new Date(s.date)-sc)/60000);return m>TOL?{c:'rt',t:'Realizada com atraso de '+m+' min'}:{c:'ok',t:'Realizada no horário'}}
 if(now<sc)return{c:'ag',t:'Agendada'};
 const m=Math.round((now-sc)/60000);
 if(m<=TOL)return{c:'ag',t:'Aguardando início'};
 return dkey(now)===a.date?{c:'at',t:'Atrasada: '+m+' min sem registro'}:{c:'no',t:'Não realizada'};
}
const EMPTY=()=>({patients:[],sessions:[]});
const dk=k=>'abacoleta_'+k;
const load=k=>{try{return JSON.parse(localStorage.getItem(dk(k)))||EMPTY()}catch(e){return EMPTY()}};
const users=()=>{try{return JSON.parse(localStorage.getItem('abausers'))||[]}catch(e){return[]}};
const allUsers=()=>[ADMIN,...users()];
let user=null,vk='',db=EMPTY(),view='pac',cur=null,eg=null,ses=null,gp='',gg='',msg='',delAsk='',finMsg=null,cth='',rf0=false;
let cd=dkey(new Date()),cm={y:new Date().getFullYear(),m:new Date().getMonth()};
const save=()=>{try{localStorage.setItem(dk(vk),JSON.stringify(db))}catch(e){}};
const P=id=>db.patients.find(p=>p.id===id);

async function hash(s){
 try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('aba:'+s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 catch(e){let h=5381;for(const c of 'aba:'+s)h=(h*33^c.charCodeAt(0))>>>0;return'f'+h}
}
function cpfOk(c){
 if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;
 for(const n of[9,10]){let s=0;for(let i=0;i<n;i++)s+=c[i]*(n+1-i);if((s*10%11)%10!=c[n])return false}
 return true;
}
function pct(s){let t={i:0,a:0,e:0};Object.values(s.trials).forEach(a=>a.forEach(c=>t[c[0]]++));const n=t.i+t.a+t.e;return{n,i:n?Math.round(t.i/n*100):0,a:n?Math.round(t.a/n*100):0,e:n?Math.round(t.e/n*100):0}}

/* ---------- Login ---------- */
function vAuth(){
 return '<span class="logo hero" role="img" aria-label="Tia Tay, Desenvolvimento Infantil e Neurodivergências"></span><h2 style="text-align:center">Tia Tay Coleta</h2><div class="card"><label for="lu">Usuário (nome sem espaços)</label><input id="lu" autocomplete="username"><label for="lp">Senha</label><input id="lp" type="password" autocomplete="current-password"><p class="am" id="am"></p><button class="btn pr big" data-a="login">Entrar</button><p class="mu">Não tem acesso? Peça à Tia Tay para criar seu usuário.</p></div>'+instCard();
}
function enter(x){user=x;vk=x.k;db=roleOf(x)==='p'?EMPTY():load(vk);view=roleOf(x)==='p'?'cal':'pac';cur=null;eg=null;ses=null;cth='';finMsg=null;try{localStorage.setItem('abasessao',x.k)}catch(e){}render()}
async function doLogin(){
 const k=norm($('#lu').value),p=$('#lp').value.replace(/\D/g,''),x=allUsers().find(z=>z.k===k);
 const h=await hash(p);
 if(!x||!(x.admin?x.ph.includes(h):x.ph===h)){$('#am').textContent='Usuário ou senha incorretos.';return}
 enter(x);
}
async function doAddUser(){
 const name=$('#un').value.trim().replace(/\s+/g,' '),cpf=$('#uc').value.replace(/\D/g,''),am=$('#am');
 if(name.length<3)return am.textContent='Digite o nome completo.';
 if(!cpfOk(cpf))return am.textContent='CPF inválido.';
 const ph=await hash(cpf),us=users(),k=norm(name);
 if(k===ADMIN.k||us.some(z=>z.k===k))return am.textContent='Já existe um usuário com esse nome.';
 if(us.some(z=>z.ph===ph))return am.textContent='Este CPF já tem usuário.';
 us.push({k,show:name.replace(/\s+/g,''),name,ph,role:'func'});
 try{localStorage.setItem('abausers',JSON.stringify(us))}catch(e){return am.textContent='Não foi possível salvar.'}
 render();$('#am').style.color='var(--ok)';$('#am').textContent='Usuário criado: '+name.replace(/\s+/g,'')+'. A senha é o CPF.';
}

/* ---------- Telas ---------- */
function vPac(){
 if(!cur)return '<h2>Pacientes</h2><div class="card"><input id="pn" placeholder="Nome do paciente"><button class="btn pr big" data-a="addp">Adicionar paciente</button></div>'+(db.patients.map(p=>`<div class="card row2"><span><b>${esc(p.name)}</b><br><span class="mu">${p.programs.length} programa(s)</span></span><button class="btn" data-a="open" data-id="${p.id}">Abrir</button></div>`).join('')||'<p class="mu">Nenhum paciente ainda. Adicione o primeiro acima.</p>');
 const p=P(cur);if(!p){cur=null;return vPac()}
 if(eg)return vGForm(p);
 return `<button class="lnk" data-a="back">‹ Pacientes</button><h2>${esc(p.name)}</h2>`+p.programs.map(g=>`<div class="card"><b>${esc(g.name)}</b><div class="mu">${TYPES[g.type]}, ${g.items.length} itens${(g.helps||[]).length?'. Ajuda: '+g.helps.join(', ')+(g.helpsNote?' ('+esc(g.helpsNote)+')':''):''}</div>${g.desc?`<p class="mu">${esc(g.desc)}</p>`:''}<div class="row"><button class="btn pr" data-a="start" data-id="${g.id}">Iniciar sessão</button><button class="btn" data-a="gedit" data-id="${g.id}">Editar</button></div></div>`).join('')+'<button class="btn pr big" data-a="gnew">Novo programa</button>';
}
function vGForm(p){
 const g=eg==='new'?{name:'',type:'dtt',desc:'',helps:[],items:[]}:p.programs.find(x=>x.id===eg);
 if(!g){eg=null;return vPac()}
 return `<button class="lnk" data-a="gcancel">‹ Voltar</button><h2>${eg==='new'?'Novo programa':'Editar programa'}</h2><div class="card"><label for="gn">Nome</label><input id="gn" value="${esc(g.name)}"><label for="gt">Tipo de ensino</label><select id="gt">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${k===g.type?'selected':''}>${v}</option>`).join('')}</select><label for="gd">Descrição do programa</label><textarea id="gd" rows="3">${esc(g.desc||'')}</textarea><label>Tipos de ajuda usados</label><div style="margin-bottom:10px">${HELPS.map(h=>`<button class="chip ${(g.helps||[]).includes(h)?'on':''}" data-a="gh" data-k="${h}">${h}</button>`).join('')}</div><div id="gvw" style="margin-bottom:10px" ${(g.helps||[]).includes('Variadas')?'':'hidden'}><label for="gv">Quais ajudas variadas? Escreva aqui</label><input id="gv" value="${esc(g.helpsNote||'')}" placeholder="Ex.: toque no ombro, apontar, dica sonora"></div><label for="gi">Alvos ou passos (um por linha)</label><textarea id="gi" rows="5">${esc(g.items.join('\n'))}</textarea><button class="btn pr big" data-a="gsave">Salvar programa</button>${eg==='new'?'':`<div class="row"><button class="btn ce" data-a="gdel">${delAsk==='g'+eg?'Confirmar exclusão':'Excluir programa'}</button></div>`}</div>`;
}
function vSes(){
 if(!ses)return '<h2>Sessão</h2><p class="mu">Abra um paciente e toque em “Iniciar sessão”.</p>';
 const p=P(ses.pid),hs=ses.prog.helps||[];
 return `<h2>${esc(p?p.name:'Paciente')}</h2><div class="mu" style="margin-bottom:12px">${esc(ses.prog.name)}, ${TYPES[ses.prog.type]}<br>Início: ${hm(ses.date)}${ses.prog.desc?'<br>'+esc(ses.prog.desc):''}</div>`+
 (hs.length?`<div class="card"><h3>Tipo de ajuda desta sessão</h3>${hs.map(h=>`<button class="chip ${ses.h===h?'on':''}" data-a="sh" data-k="${h}">${h}</button>`).join('')}${ses.h==='Variadas'&&ses.prog.helpsNote?`<div class="mu">${esc(ses.prog.helpsNote)}</div>`:''}</div>`:'')+
 ses.prog.items.map((it,n)=>`<div class="card"><b>${esc(it)}</b><div class="dots">${ses.trials[it].map(c=>`<i class="d${c[0]}" title="${esc(c)}"></i>`).join('')}</div><div class="row">${['i','a','e'].map(c=>`<button class="btn c${c}" data-a="t" data-n="${n}" data-c="${c}">${LAB[c]}</button>`).join('')}<button class="btn" data-a="undo" data-n="${n}" aria-label="Desfazer">↶</button></div></div>`).join('')+
 '<div class="card"><h3>Comportamentos inadequados</h3>'+BEH.map(b=>`<div class="row2"><span>${b}</span><span><button class="btn" data-a="bm" data-k="${b}">−</button> <b>${ses.beh[b]||0}</b> <button class="btn" data-a="bp" data-k="${b}">+</button></span></div>`).join('')+'</div>'+
 '<div class="card"><h3>Reforçadores usados</h3>'+REI.map(r=>`<button class="chip ${ses.rf.includes(r)?'on':''}" data-a="rf" data-k="${r}">${r}</button>`).join('')+'</div>'+
 `<div class="card"><h3>Fatores externos e observações</h3><textarea id="ob" rows="3">${esc(ses.obs)}</textarea></div><button class="btn pr big" data-a="fin">Finalizar e salvar</button>`;
}
function vGra(){
 const pt=P(gp),pr=pt&&pt.programs.find(g=>g.id===gg);
 let h='<h2>Gráficos</h2><div class="card"><select id="sp"><option value="">Escolha o paciente</option>'+db.patients.map(p=>`<option value="${p.id}" ${p.id===gp?'selected':''}>${esc(p.name)}</option>`).join('')+'</select>';
 if(pt)h+='<select id="sg"><option value="">Escolha o programa</option>'+pt.programs.map(g=>`<option value="${g.id}" ${g.id===gg?'selected':''}>${esc(g.name)}</option>`).join('')+'</select>';
 h+='</div>';
 if(!pr)return h+'<p class="mu">Escolha um paciente e um programa para ver a evolução.</p>';
 const ss=db.sessions.filter(s=>s.pid===gp&&s.prog.id===gg).sort((a,b)=>a.date<b.date?-1:1);
 if(!ss.length)return h+'<p class="mu">Ainda não há sessões deste programa.</p>';
 const W=320,H=160,x=i=>ss.length>1?30+i*(W-50)/(ss.length-1):W/2,y=v=>H-25-v*(H-45)/100;
 const pts=ss.map((s,i)=>`${x(i)},${y(pct(s).i)}`).join(' ');
 h+=`<div class="card"><h3>% de respostas independentes</h3><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolução por sessão">`+
 [0,50,100].map(v=>`<line x1="26" x2="${W-10}" y1="${y(v)}" y2="${y(v)}" stroke="var(--bd)"/><text x="2" y="${y(v)+4}" font-size="10" fill="var(--mu)">${v}%</text>`).join('')+
 `<polyline points="${pts}" fill="none" stroke="var(--pr)" stroke-width="2.5"/>`+
 ss.map((s,i)=>`<circle cx="${x(i)}" cy="${y(pct(s).i)}" r="4" fill="var(--pr)"/><text x="${x(i)}" y="${H-8}" font-size="9" text-anchor="middle" fill="var(--mu)">${new Date(s.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</text>`).join('')+'</svg></div>';
 h+='<div class="card sc"><table><tr><th>Data</th><th>Indep.</th><th>Ajuda</th><th>Erro</th><th>Comport.</th></tr>'+ss.map(s=>{const p=pct(s);return `<tr><td>${new Date(s.date).toLocaleDateString('pt-BR')}</td><td>${p.i}%</td><td>${p.a}%</td><td>${p.e}%</td><td>${Object.values(s.beh).reduce((a,b)=>a+b,0)}</td></tr>`}).join('')+'</table></div>';
 return h;
}
function vCal(){
 const {y,m}=cm,off=new Date(y,m,1).getDay(),nd=new Date(y,m+1,0).getDate(),bs={},ba={},ad=user.admin;
 db.sessions.forEach(s=>{(bs[dkey(s.date)]=bs[dkey(s.date)]||[]).push(s)});
 (db.agenda||[]).forEach(a=>{(ba[a.date]=ba[a.date]||[]).push(a)});
 let cells='<span></span>'.repeat(off);
 for(let d=1;d<=nd;d++){const k=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),as=ba[k]||[],bad=as.some(a=>['at','no'].includes(aStat(a).c));cells+=`<button class="day ${(bs[k]||[]).length?'has':''} ${as.length?'ap':''} ${bad?'bad':''} ${k===cd?'sel':''}" data-a="day" data-k="${k}">${d}${as.length?`<i>${as.length}</i>`:''}</button>`}
 const pn=id=>{const p=P(id);return p?p.name:'Paciente removido'};
 const ags=(ba[cd]||[]).sort((a,b)=>a.time<b.time?-1:1).map(a=>{const st=aStat(a);return `<div class="card st-${st.c}"><div class="row2"><b>${a.time} - ${esc(pn(a.pid))}</b><span class="tag ${st.c}">${st.t}</span></div>${a.note?`<div class="mu">${esc(a.note)}</div>`:''}<div class="row"><button class="btn" data-a="aopen" data-id="${a.pid}">Abrir paciente</button>${ad?`<button class="btn ce" data-a="adel" data-id="${a.id}">${delAsk==='a'+a.id?'Confirmar remoção':'Remover'}</button>`:''}</div></div>`}).join('');
 const ses_=(bs[cd]||[]).map(s=>{const p=pct(s),mins=s.end?Math.round((new Date(s.end)-new Date(s.date))/60000):0;return `<div class="card"><b>${esc(pn(s.pid))}</b><div class="mu">${esc(s.prog.name)}<br>${p.i}% independente em ${p.n} registros${ad?`<br>Início ${hm(s.date)}${s.end?`, fim ${hm(s.end)} (${mins} min)`:''}${s.end?` <span class="tag ${mins>=MIN_SESSAO?'ok':'at'}">${mins>=MIN_SESSAO?'Completa':'Incompleta'}</span>`:''}`:''}</div>${s.obs?`<div class="mu">${esc(s.obs)}</div>`:''}</div>`}).join('');
 const vn=(allUsers().find(u=>u.k===vk)||{}).name||'';
 const form=ad?(db.patients.length?`<div class="card"><h3>Agendar atendimento</h3><label for="ad">Dia</label><input id="ad" type="date" value="${cd}"><label for="ah">Horário</label><input id="ah" type="time"><label for="ap">Paciente</label><select id="ap">${db.patients.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><label for="an">Observação</label><input id="an"><p class="am" id="am"></p><button class="btn pr big" data-a="aadd">Adicionar à agenda de ${esc(vn)}</button></div>`:'<p class="mu">Para agendar, cadastre um paciente na aba Pacientes desta pessoa.</p>'):'';
 return `${finMsg?`<div class="card fin ${finMsg.ok?'st-ok':'st-at'}"><b>Sessão finalizada</b><br>Duração: ${finMsg.mn} min<br>${finMsg.ok?'Sessão completa.':'Sessão incompleta: menos de '+MIN_SESSAO+' min.'}</div>`:''}<h2>Agenda</h2><div class="card"><div class="row2"><button class="btn" data-a="mo" data-d="-1" aria-label="Mês anterior">‹</button><b>${new Date(y,m,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</b><button class="btn" data-a="mo" data-d="1" aria-label="Próximo mês">›</button></div><div class="cal">${['D','S','T','Q','Q','S','S'].map(x=>`<small>${x}</small>`).join('')}${cells}</div></div><h3>${cd.split('-').reverse().join('/')}</h3>${ags||''}${ses_}${!ags&&!ses_?'<p class="mu">Nada agendado nem registrado neste dia.</p>':''}${form}`;
}
function vDad(){
 return `<h2>Dados</h2><div class="card"><b>${db.sessions.length}</b> sessão(ões) e <b>${db.patients.length}</b> paciente(s) neste aparelho<p class="mu">${esc(msg)}</p></div><div class="card"><h3>Backup</h3><textarea id="bk" rows="5" placeholder="O backup aparece aqui. Cole um backup para restaurar."></textarea><div class="row"><button class="btn" data-a="exp">Gerar backup</button><button class="btn" data-a="imp">Restaurar</button></div></div>`;
}
/* ---------- Papéis, fotos, comunicados e chat ---------- */
const staff=()=>allUsers().filter(u=>u.role!=='pai');
const roleOf=u=>u.admin?'a':u.role==='pai'?'p':'f';
const MIN_SESSAO=50;
const lget=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const lset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const foto=k=>{try{return localStorage.getItem('abafoto_'+k)||''}catch(e){return''}};
const av=(k,name,sz)=>{const f=foto(k);return f.startsWith('data:image/')?`<span class="av ${sz||''}" style="background-image:url(${f})"></span>`:`<span class="av ${sz||''}">${esc(((name||'?').trim()[0]||'?').toUpperCase())}</span>`};
const chats=()=>lget('abachat',[]);
const coms=()=>lget('abacom',[]);
const comFor=()=>coms().filter(c=>roleOf(user)==='a'||c.to==='t'||c.to===roleOf(user)).sort((a,b)=>a.t<b.t?1:-1);
const unreadChat=()=>{const m=chats();return roleOf(user)==='a'?m.filter(x=>x.from!==ADMIN.k&&!x.r).length:m.filter(x=>x.th===user.k&&x.from===ADMIN.k&&!x.r).length};
const unreadCom=()=>{if(roleOf(user)==='a')return 0;let s='';try{s=localStorage.getItem('abavisto_'+user.k)||''}catch(e){}return comFor().filter(c=>c.t>s).length};
function markRead(th){const m=chats(),a=roleOf(user)==='a';let ch=false;m.forEach(x=>{if(x.th===th&&!x.r&&(a?x.from!==ADMIN.k:x.from===ADMIN.k)){x.r=true;ch=true}});if(ch)lset('abachat',m)}
async function doAddParent(){
 const name=$('#rn').value.trim().replace(/\s+/g,' '),cpf=$('#rc').value.replace(/\D/g,''),uk=$('#re').value,pid=$('#rp').value,am=$('#am2');
 if(name.length<3)return am.textContent='Digite o nome do responsável.';
 if(!cpfOk(cpf))return am.textContent='CPF inválido.';
 if(!uk||!pid)return am.textContent='Escolha a funcionária e a criança.';
 const ph=await hash(cpf),us=users(),k=norm(name);
 if(k===ADMIN.k||us.some(z=>z.k===k))return am.textContent='Já existe um usuário com esse nome.';
 if(us.some(z=>z.ph===ph))return am.textContent='Este CPF já tem usuário.';
 us.push({k,show:name.replace(/\s+/g,''),name,ph,role:'pai',kid:{uk,pid}});
 try{localStorage.setItem('abausers',JSON.stringify(us))}catch(e){return am.textContent='Não foi possível salvar.'}
 render();$('#am2').style.color='var(--ok)';$('#am2').textContent='Conta criada: '+name.replace(/\s+/g,'')+'. A senha é o CPF.';
}
function vAgPai(){
 const kd=user.kid||{},d=load(kd.uk),p=d.patients.find(x=>x.id===kd.pid),ow=allUsers().find(u=>u.k===kd.uk),hoje=dkey(new Date());
 const L=(d.agenda||[]).filter(a=>a.pid===kd.pid).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1);
 const lab=a=>{const c=aStat(a,d).c;return c==='ok'||c==='rt'?['Realizada','ok']:c==='no'?['Não realizada','no']:['Agendada','ag']};
 const card=a=>{const [t,c]=lab(a);return `<div class="card"><div class="row2"><b>${a.date.split('-').reverse().join('/')} às ${a.time}</b><span class="tag ${c}">${t}</span></div><div class="mu">${esc(ow?ow.name:'')}${a.note?'<br>'+esc(a.note):''}</div></div>`};
 const prox=L.filter(a=>a.date>=hoje),ant=L.filter(a=>a.date<hoje).reverse();
 return `<h2>Agenda de ${esc(p?p.name:'seu filho(a)')}</h2><h3>Próximos atendimentos</h3>`+(prox.map(card).join('')||'<p class="mu">Nenhum atendimento agendado.</p>')+(ant.length?'<h3>Anteriores</h3>'+ant.map(card).join(''):'');
}
function vAvi(){
 const ad=roleOf(user)==='a',L=comFor();
 if(!ad)try{localStorage.setItem('abavisto_'+user.k,new Date().toISOString())}catch(e){}
 return '<h2>Comunicados</h2>'+(ad?'<div class="card"><h3>Novo comunicado</h3><label for="cti">Título</label><input id="cti"><label for="cx">Mensagem</label><textarea id="cx" rows="4"></textarea><label for="cw">Para</label><select id="cw"><option value="t">Todos</option><option value="p">Pais e responsáveis</option><option value="f">Funcionárias</option></select><p class="am" id="am"></p><button class="btn pr big" data-a="cadd">Enviar comunicado</button></div>':'')+(L.map(c=>`<div class="card"><div class="row2"><b>${esc(c.title)}</b><span class="mu">${new Date(c.t).toLocaleDateString('pt-BR')}</span></div><p style="white-space:pre-wrap;margin:6px 0">${esc(c.txt)}</p>${ad?`<div class="row2"><span class="tag">${({t:'Todos',p:'Pais',f:'Funcionárias'})[c.to]}</span><button class="btn ce" data-a="cdel" data-id="${c.id}">${delAsk==='c'+c.id?'Confirmar exclusão':'Excluir'}</button></div>`:''}</div>`).join('')||'<p class="mu">Nenhum comunicado ainda.</p>');
}
function vCha(){
 const ad=roleOf(user)==='a';
 if(ad&&!cth){
  const m=chats();
  return '<h2>Conversas</h2>'+(allUsers().filter(u=>!u.admin).map(u=>{const mm=m.filter(x=>x.th===u.k),l=mm[mm.length-1],un=mm.filter(x=>x.from!==ADMIN.k&&!x.r).length;return `<button class="conv" data-a="cth" data-k="${u.k}">${av(u.k,u.name)}<span class="cb"><b>${esc(u.name)}</b><span class="mu">${u.role==='pai'?'Responsável':'Funcionária'}${l?': '+esc(l.txt.slice(0,40)):''}</span></span>${un?`<i class="bd2">${un}</i>`:''}</button>`}).join('')||'<p class="mu">Crie usuários na aba Equipe para conversar.</p>');
 }
 const th=ad?cth:user.k,other=ad?allUsers().find(u=>u.k===th):ADMIN;
 if(!other){cth='';return vCha()}
 markRead(th);
 const mm=chats().filter(x=>x.th===th);
 return `${ad?'<button class="lnk" data-a="cback">‹ Conversas</button>':''}<div class="chead">${av(other.k,other.name,'lg')}<b>${esc(other.name)}</b></div><div class="msgs">${mm.map(x=>`<div class="bub ${x.from===user.k?'me':'ot'}">${esc(x.txt)}<small>${hm(x.t)}</small></div>`).join('')||'<p class="mu" style="text-align:center">Nenhuma mensagem ainda. Diga olá!</p>'}</div><div class="cbar"><input id="cm" placeholder="Mensagem" autocomplete="off"><button class="btn pr" data-a="send">Enviar</button></div>`;
}
function vPer(){
 return `<h2>Meu perfil</h2><div class="card" style="text-align:center">${av(user.k,user.name,'xl')}<h3 style="margin-top:10px">${esc(user.name)}</h3><p class="mu">Usuário: ${esc(user.show)}</p><label class="btn" for="pf" style="display:inline-block;cursor:pointer">Escolher foto</label><input id="pf" type="file" accept="image/*" style="position:absolute;left:-9999px">${foto(user.k)?'<div class="row"><button class="btn" data-a="pdel">Remover foto</button></div>':''}</div>${instCard()}`;
}
function vEq(){
 const hoje=dkey(new Date()),ptn=(d,id)=>{const p=d.patients.find(x=>x.id===id);return p?p.name:'Paciente removido'};
 const tl=staff().flatMap(u=>{const d=load(u.k);return(d.agenda||[]).filter(a=>a.date===hoje).map(a=>({u,a,d}))}).sort((x,y)=>x.a.time<y.a.time?-1:1);
 const inc=d=>d.sessions.filter(s=>s.end&&(new Date(s.end)-new Date(s.date))/60000<MIN_SESSAO).length;
 const emp=staff(),opts=k=>load(k).patients.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
 const cards=emp.map(u=>{const d=load(u.k),last=d.sessions.map(s=>s.date).sort().pop(),pend=(d.agenda||[]).filter(a=>['at','no'].includes(aStat(a,d).c)).length;return `<div class="card"><span class="who">${av(u.k,u.name)}<b>${esc(u.name)}</b>${u.admin?' (administradora)':''}</span><div class="mu">Usuário: ${esc(u.show)}<br>${d.patients.length} paciente(s), ${d.sessions.length} sessão(ões). Última: ${last?new Date(last).toLocaleDateString('pt-BR'):'nenhuma'}<br>Pendências na agenda: ${pend}. Sessões incompletas: ${inc(d)}</div><div class="row"><button class="btn pr" data-a="see" data-k="${u.k}">Ver e editar dados</button><button class="btn" data-a="seecal" data-k="${u.k}">Agenda</button>${u.admin?'':`<button class="btn" data-a="chatwith" data-k="${u.k}">Conversar</button><button class="btn ce" data-a="udel" data-k="${u.k}">${delAsk==='u'+u.k?'Confirmar exclusão':'Excluir'}</button>`}</div></div>`}).join('');
 const pais=allUsers().filter(u=>u.role==='pai').map(u=>{const d=load(u.kid.uk),p=d.patients.find(x=>x.id===u.kid.pid),o=allUsers().find(x=>x.k===u.kid.uk);return `<div class="card"><span class="who">${av(u.k,u.name)}<b>${esc(u.name)}</b></span><div class="mu">Usuário: ${esc(u.show)}<br>Criança: ${esc(p?p.name:'removida')}. Profissional: ${esc(o?o.name:'removida')}</div><div class="row"><button class="btn" data-a="chatwith" data-k="${u.k}">Conversar</button><button class="btn ce" data-a="udel" data-k="${u.k}">${delAsk==='u'+u.k?'Confirmar exclusão':'Excluir'}</button></div></div>`}).join('')||'<p class="mu">Nenhuma conta de responsável ainda.</p>';
 return '<h2>Equipe</h2><div class="card"><h3>Hoje</h3>'+(tl.map(({u,a,d})=>{const st=aStat(a,d);return `<div class="row2"><span>${a.time} - ${esc(u.name)}<br><span class="mu">${esc(ptn(d,a.pid))}</span></span><span class="tag ${st.c}">${st.t}</span></div>`}).join('')||'<p class="mu">Nenhum atendimento agendado para hoje.</p>')+'</div>'+cards+
 '<div class="card"><h3>Criar funcionária</h3><label for="un">Nome completo</label><input id="un"><label for="uc">CPF</label><input id="uc" inputmode="numeric" placeholder="000.000.000-00"><p class="am" id="am"></p><button class="btn pr big" data-a="uadd">Criar funcionária</button><p class="mu">O usuário é o nome sem espaços e a senha é o CPF.</p></div>'+
 '<h2>Pais e responsáveis</h2>'+pais+
 '<div class="card"><h3>Criar conta de responsável</h3><label for="rn">Nome do responsável</label><input id="rn"><label for="rc">CPF</label><input id="rc" inputmode="numeric" placeholder="000.000.000-00"><label for="re">Funcionária da criança</label><select id="re">'+emp.map(u=>`<option value="${u.k}">${esc(u.name)}</option>`).join('')+'</select><label for="rp">Criança</label><select id="rp">'+(emp[0]?opts(emp[0].k):'')+'</select><p class="am" id="am2"></p><button class="btn pr big" data-a="radd">Criar conta de responsável</button><p class="mu">A criança precisa estar cadastrada como paciente da funcionária escolhida. O responsável vê só a agenda dela, os comunicados e o chat com a Tia Tay.</p></div>';
}
const ALLOW={a:['pac','ses','gra','cal','dad','eq','avi','cha','per'],f:['pac','ses','gra','cal','dad','avi','cha','per'],p:['cal','avi','cha','per']};
function render(){
 const r=user?roleOf(user):'',ci=$('#cm'),keep=ci?ci.value:'',foc=!!ci&&document.activeElement===ci;
 if(user&&!ALLOW[r].includes(view))view=r==='p'?'cal':'pac';
 $('nav').style.display=user?'flex':'none';$('#out').hidden=!user;$('#me').hidden=!user;
 if(user)$('#me').innerHTML=av(user.k,user.name);
 const bar=r==='a'&&!['eq','avi','cha','per'].includes(view)?`<div class="vbar"><label for="vs">Ver dados de</label><select id="vs">${staff().map(u=>`<option value="${u.k}" ${u.k===vk?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>`:'';
 $('#main').innerHTML=user?bar+({pac:vPac,ses:vSes,gra:vGra,cal:r==='p'?vAgPai:vCal,dad:vDad,eq:vEq,avi:vAvi,cha:vCha,per:vPer})[view]():vAuth();
 document.querySelectorAll('nav button').forEach(b=>{b.dataset.l=b.dataset.l||b.textContent;b.classList.toggle('on',b.dataset.v===view);b.hidden=!(user&&b.dataset.r.includes(r));const n=user?(b.dataset.v==='cha'?unreadChat():b.dataset.v==='avi'?unreadCom():0):0;b.textContent=b.dataset.l+(n?' ('+n+')':'')});
 $('#st').textContent=navigator.onLine?'Online':'Offline';
 const cn=$('#cm');if(cn){cn.value=keep;if(foc||rf0)cn.focus();scrollTo(0,document.body.scrollHeight)}rf0=false;
}

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-a]');if(!b)return;
 const a=b.dataset.a,d=b.dataset;
 if(a==='gh'){b.classList.toggle('on');if(d.k==='Variadas'){const w=$('#gvw');if(w)w.hidden=!b.classList.contains('on')}return}
 if(a==='login'){doLogin();return}
 if(a==='uadd'){doAddUser();return}
 if(a==='radd'){doAddParent();return}
 if(a==='out'){user=null;ses=null;cur=null;eg=null;try{localStorage.removeItem('abasessao')}catch(er){}}
 else if(a==='nav'){view=d.v;msg='';delAsk='';eg=null;finMsg=null;cth=''}
 else if(a==='addp'){const n=$('#pn').value.trim();if(!n)return;db.patients.push({id:uid(),name:n,programs:[]});save()}
 else if(a==='open')cur=d.id;
 else if(a==='back'){cur=null;eg=null}
 else if(a==='gnew')eg='new';
 else if(a==='gedit'){eg=d.id;delAsk=''}
 else if(a==='gcancel'){eg=null;delAsk=''}
 else if(a==='gsave'){
  const n=$('#gn').value.trim(),it=[...new Set($('#gi').value.split('\n').map(s=>s.trim()).filter(Boolean))];
  if(!n||!it.length)return;
  const hl=[...document.querySelectorAll('.chip.on[data-a="gh"]')].map(x=>x.dataset.k),v={name:n,type:$('#gt').value,desc:$('#gd').value.trim(),helps:hl,helpsNote:hl.includes('Variadas')?$('#gv').value.trim():'',items:it},p=P(cur);
  if(eg==='new')p.programs.push({id:uid(),...v});else Object.assign(p.programs.find(x=>x.id===eg),v);
  save();eg=null;
 }
 else if(a==='gdel'){if(delAsk==='g'+eg){const p=P(cur);p.programs=p.programs.filter(x=>x.id!==eg);save();eg=null;delAsk=''}else delAsk='g'+eg}
 else if(a==='start'){const g=P(cur).programs.find(x=>x.id===d.id);ses={id:uid(),pid:cur,date:new Date().toISOString(),prog:JSON.parse(JSON.stringify(g)),trials:{},beh:{},rf:[],obs:'',h:(g.helps||[])[0]||''};g.items.forEach(i=>ses.trials[i]=[]);view='ses'}
 else if(a==='sh')ses.h=d.k;
 else if(a==='t')ses.trials[ses.prog.items[d.n]].push(d.c==='a'&&ses.h?'a|'+ses.h:d.c);
 else if(a==='undo')ses.trials[ses.prog.items[d.n]].pop();
 else if(a==='bp')ses.beh[d.k]=(ses.beh[d.k]||0)+1;
 else if(a==='bm')ses.beh[d.k]=Math.max(0,(ses.beh[d.k]||0)-1);
 else if(a==='rf'){const i=ses.rf.indexOf(d.k);i<0?ses.rf.push(d.k):ses.rf.splice(i,1)}
 else if(a==='fin'){const en=new Date(),mn=Math.max(1,Math.round((en-new Date(ses.date))/60000));db.sessions.push({...ses,end:en.toISOString()});finMsg={mn,ok:mn>=MIN_SESSAO};save();gp=ses.pid;gg=ses.prog.id;cd=dkey(ses.date);cm={y:new Date(ses.date).getFullYear(),m:new Date(ses.date).getMonth()};ses=null;view='cal'}
 else if(a==='day')cd=d.k;
 else if(a==='cadd'){const t=$('#cti').value.trim(),x=$('#cx').value.trim();if(!t||!x){$('#am').textContent='Preencha o título e a mensagem.';return}const l=coms();l.push({id:uid(),t:new Date().toISOString(),title:t,txt:x,to:$('#cw').value});lset('abacom',l)}
 else if(a==='cdel'){if(delAsk==='c'+d.id){lset('abacom',coms().filter(c=>c.id!==d.id));delAsk=''}else delAsk='c'+d.id}
 else if(a==='cth'||a==='chatwith'){cth=d.k;view='cha'}
 else if(a==='cback')cth='';
 else if(a==='send'){const x=$('#cm').value.trim();if(!x)return;const th=roleOf(user)==='a'?cth:user.k,m=chats();m.push({id:uid(),th,from:user.k,txt:x,t:new Date().toISOString(),r:false});lset('abachat',m);$('#cm').value='';rf0=true}
 else if(a==='inst'){if(inst){inst.prompt();inst=null}}
 else if(a==='pdel'){try{localStorage.removeItem('abafoto_'+user.k)}catch(er){}}
 else if(a==='aopen'){cur=d.id;eg=null;view='pac'}
 else if(a==='aadd'){const dt=$('#ad').value,tm=$('#ah').value,pid=$('#ap').value;if(!dt||!tm||!pid){$('#am').textContent='Preencha dia, horário e paciente.';return}(db.agenda=db.agenda||[]).push({id:uid(),date:dt,time:tm,pid,note:$('#an').value.trim()});save();cd=dt;const t=new Date(dt+'T00:00:00');cm={y:t.getFullYear(),m:t.getMonth()}}
 else if(a==='adel'){if(delAsk==='a'+d.id){db.agenda=(db.agenda||[]).filter(x=>x.id!==d.id);save();delAsk=''}else delAsk='a'+d.id}
 else if(a==='seecal'){vk=d.k;db=load(vk);cur=null;eg=null;ses=null;view='cal'}
 else if(a==='mo'){const t=new Date(cm.y,cm.m+ +d.d,1);cm={y:t.getFullYear(),m:t.getMonth()}}
 else if(a==='see'){vk=d.k;db=load(vk);cur=null;eg=null;ses=null;view='pac'}
 else if(a==='udel'){if(delAsk==='u'+d.k){try{localStorage.setItem('abausers',JSON.stringify(users().filter(u=>u.k!==d.k)));localStorage.removeItem(dk(d.k));localStorage.removeItem('abafoto_'+d.k);lset('abachat',chats().filter(x=>x.th!==d.k))}catch(er){}delAsk=''}else delAsk='u'+d.k}
 else if(a==='exp'){$('#bk').value=JSON.stringify(db);return}
 else if(a==='imp'){try{const x=JSON.parse($('#bk').value);if(x.patients&&x.sessions){db=x;save();msg='Backup restaurado.'}else msg='Backup inválido.'}catch(er){msg='Backup inválido.'}}
 render();
});
document.addEventListener('input',e=>{if(e.target.id==='ob'&&ses)ses.obs=e.target.value});
document.addEventListener('change',e=>{
 const i=e.target.id;
 if(i==='sp'){gp=e.target.value;gg='';render()}
 if(i==='sg'){gg=e.target.value;render()}
 if(i==='vs'){vk=e.target.value;db=load(vk);cur=null;eg=null;ses=null;render()}
 if(i==='re'){$('#rp').innerHTML=load(e.target.value).patients.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}
 if(i==='pf'&&e.target.files[0]){const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=Math.min(im.width,im.height);c.width=c.height=160;c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,160,160);try{localStorage.setItem('abafoto_'+user.k,c.toDataURL('image/jpeg',.8))}catch(er){}render()};im.src=rd.result};rd.readAsDataURL(e.target.files[0])}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!user&&e.target.tagName==='INPUT'){const b=document.querySelector('[data-a=login]');if(b)b.click()}if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='cm'){e.preventDefault();const b=document.querySelector('[data-a=send]');if(b)b.click()}});
/* Atualiza quando outra aba do mesmo navegador altera os dados (administrador acompanha ao vivo) */
addEventListener('storage',e=>{
 if(!user||!e.key)return;
 if(e.key===dk(vk))db=load(vk);
 const ae=document.activeElement||{},typing=['INPUT','TEXTAREA','SELECT'].includes(ae.tagName)&&ae.id!=='cm';
 if((e.key.startsWith('abacoleta_')||['abausers','abachat','abacom'].includes(e.key))&&!ses&&!typing)render();
});
addEventListener('online',render);addEventListener('offline',render);
let inst=null;
const instCard=()=>`<div class="card"><h3>Instalar o aplicativo</h3>${inst?'<button class="btn pr big" data-a="inst">Instalar no aparelho</button>':'<p class="mu">No celular, abra o menu do navegador e toque em “Instalar app” ou “Adicionar à tela inicial”. No iPhone, use Compartilhar e depois “Adicionar à Tela de Início”.</p>'}</div>`;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();inst=e;render()});
addEventListener('appinstalled',()=>{inst=null;render()});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
try{const o=localStorage.getItem('abacoleta_taynararibeirodasilva');if(o&&!localStorage.getItem('abacoleta_tiatay'))localStorage.setItem('abacoleta_tiatay',o)}catch(e){}
setInterval(()=>{if(user&&!ses&&['cal','eq'].includes(view)&&!['INPUT','TEXTAREA','SELECT'].includes((document.activeElement||{}).tagName))render()},60000);
try{const x=allUsers().find(z=>z.k===localStorage.getItem('abasessao'));if(x)enter(x);else render()}catch(e){render()}