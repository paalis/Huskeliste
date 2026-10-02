import { localISO } from './date.js';
import { parseCommand, findMatches } from './commands.js';
import { openTaskStore } from './storage.js';
import { cloudConfigured, openCloud, queueDelete } from './cloud.js';

const store = openTaskStore();
let tasks = [], view = 'I dag', pending = null, cloud = null;
const views = ['I dag','Kommende','Alle','Fullført'];
const app = document.querySelector('#app');

app.innerHTML = `<header><div class="brand"><span class="logo">✓</span><span>Huskeliste</span></div><button class="icon-btn" id="settings" aria-label="Innstillinger">•••</button></header>
<main><section class="tasks-panel"><nav>${views.map((v,i)=>`<button class="nav ${i?'':'active'}" data-view="${v}">${v}</button>`).join('')}</nav>
<div class="heading"><div><p class="eyebrow">MIN DAG</p><h1>I dag</h1><p id="subtitle"></p></div><button id="add" class="add" aria-label="Legg til oppgave">+</button></div>
<form id="task-form" class="task-form hidden"><input id="title" required maxlength="120" placeholder="Hva skal du huske?" aria-label="Oppgavetittel"><div class="form-row"><input id="due" type="date" aria-label="Frist"><select id="priority" aria-label="Prioritet"><option value="lav">Lav</option><option value="middels" selected>Middels</option><option value="høy">Høy</option></select><button>Lagre</button></div></form>
<div id="task-list" class="task-list"></div></section>
<aside class="chat"><div class="chat-title"><span class="avatar">✦</span><div><strong>Hjelperen</strong><small>Innebygd · virker uten nett</small></div></div><div id="messages" class="messages"><div class="bubble bot">Hei! Jeg kan legge til, finne, flytte og fullføre oppgaver.<div class="examples"><button>Legg til handle melk i morgen</button><button>Finn tannlege</button></div></div></div><form id="chat-form" class="chat-input"><input id="chat-text" autocomplete="off" placeholder="Skriv en beskjed …" aria-label="Melding"><button aria-label="Send">↑</button></form></aside></main>
<dialog id="settings-dialog"><button class="close" aria-label="Lukk">×</button><h2>Data og sikkerhetskopi</h2><p id="storage-note">Oppgavene lagres bare på denne enheten.</p><section id="account" class="account hidden"><h3>Synkronisering</h3><p id="account-status"></p><form id="login-form"><input id="email" type="email" required autocomplete="email" placeholder="E-postadresse" aria-label="E-postadresse"><button>Send innloggingslenke</button></form><form id="code-form" class="hidden"><input id="code" required inputmode="numeric" autocomplete="one-time-code" placeholder="Kode fra e-posten" aria-label="Engangskode"><button>Logg inn med kode</button></form><div id="account-actions" class="hidden"><button id="sync-now" type="button">Synkroniser nå</button><button id="logout" type="button">Logg ut</button></div></section><button id="export">Eksporter sikkerhetskopi</button><label class="import">Importer sikkerhetskopi<input id="import" type="file" accept="application/json"></label><p class="note">Varsler i bakgrunnen er ikke med i denne versjonen.</p></dialog><div id="toast" role="status"></div>`;

const $ = s => document.querySelector(s);
function humanDate(iso) { return iso ? new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'short'}).format(new Date(`${iso}T12:00:00`)) : 'Ingen frist'; }
function visible(t) { const today=localISO(new Date()); if(view==='I dag') return !t.completed && t.due===today; if(view==='Kommende') return !t.completed && t.due && t.due>today; if(view==='Fullført') return t.completed; return !t.completed; }
function render() {
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===view)); $('h1').textContent=view; $('.eyebrow').textContent=view==='I dag'?'MIN DAG':'OPPGAVER';
  const list=tasks.filter(visible).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  $('#subtitle').textContent = view==='I dag' ? new Intl.DateTimeFormat('nb-NO',{weekday:'long',day:'numeric',month:'long'}).format(new Date()) : `${list.length} oppgaver`;
  $('#task-list').innerHTML=list.length ? list.map(t=>`<article class="task ${t.completed?'done':''}"><button class="check" data-check="${t.id}" aria-label="${t.completed?'Gjenåpne':'Fullfør'} ${escape(t.title)}">${t.completed?'✓':''}</button><div><strong>${escape(t.title)}</strong><p><span class="priority ${t.priority}"></span>${humanDate(t.due)} · ${t.priority} prioritet</p></div><button class="delete" data-delete="${t.id}" aria-label="Slett ${escape(t.title)}">×</button></article>`).join('') : `<div class="empty"><span>✓</span><h2>Alt er i orden</h2><p>Ingen oppgaver i denne visningen.</p></div>`;
}
function escape(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function say(text, buttons=[]) { const el=document.createElement('div'); el.className='bubble bot'; el.innerHTML=`${escape(text)}${buttons.length?`<div class="choices">${buttons.map((b,i)=>`<button data-choice="${i}">${escape(b)}</button>`).join('')}</div>`:''}`; $('#messages').append(el); $('#messages').scrollTop=$('#messages').scrollHeight; }
async function save(task){ task={...task,updatedAt:new Date().toISOString()}; await store.put(task); cloud?.push(task).catch(()=>{}); const i=tasks.findIndex(t=>t.id===task.id); i<0?tasks.push(task):tasks.splice(i,1,task); render(); }
function newTask(title,due=null,priority='middels'){ return {id:crypto.randomUUID(),title,due,priority,completed:false,createdAt:new Date().toISOString()}; }

document.addEventListener('click',async e=>{
  const b=e.target.closest('button'); if(!b)return;
  if(b.dataset.view){view=b.dataset.view;render();}
  if(b.id==='add') $('#task-form').classList.toggle('hidden');
  if(b.dataset.check){const t=tasks.find(x=>x.id===b.dataset.check); await save({...t,completed:!t.completed});}
  if(b.dataset.delete){const t=tasks.find(x=>x.id===b.dataset.delete); if(confirm(`Slette «${t.title}»?`)){await removeTask(t.id);}}
  if(b.closest('.examples')){$('#chat-text').value=b.textContent;$('#chat-form').requestSubmit();}
  if(b.dataset.choice!==undefined && pending){const t=pending.matches[Number(b.dataset.choice)]; await execute({...pending.command, selected:t});pending=null;}
});
$('#task-form').addEventListener('submit',async e=>{e.preventDefault();try{await save(newTask($('#title').value.trim(),$('#due').value||null,$('#priority').value));e.target.reset();e.target.classList.add('hidden');toast('Oppgaven er lagret');}catch{toast('Kunne ikke lagre oppgaven');}});
async function execute(command){
  if(command.type==='add'){if(!command.title)return say('Hva skal oppgaven hete?');try{await save(newTask(command.title,command.due,command.priority));say(`Oppgaven er lagret.${command.interpreted?` Jeg tolket datoen som ${command.interpreted.label}.`:''}`);}catch{say('Jeg klarte ikke å lagre oppgaven. Prøv igjen.');}return;}
  if(command.type==='unknownDate') return say(`Jeg forstår ikke datoen «${command.value}». Prøv for eksempel «i morgen» eller «12.10».`);
  if(command.type==='unknown') return say('Det forstod jeg ikke helt. Prøv «legg til …», «finn …», «flytt … til i morgen» eller «fullfør …».');
  const matches=command.selected?[command.selected]:findMatches(tasks,command.query);
  if(!matches.length)return say(`Jeg fant ingen oppgaver som matcher «${command.query}».`);
  if(matches.length>1){pending={command,matches};return say('Jeg fant flere oppgaver. Hvilken mener du?',matches.map(t=>t.title));}
  const t=matches[0];
  if(command.type==='find')return say(`Jeg fant «${t.title}»${t.due?`, med frist ${humanDate(t.due)}`:''}.`);
  if(command.type==='delete'){pending={command:{...command,type:'confirmDelete'},matches:[{title:'Ja, slett',target:t},{title:'Avbryt'}]};return say(`Er du sikker på at du vil slette «${t.title}»?`,['Ja, slett','Avbryt']);}
  if(command.type==='confirmDelete'){
    if(command.selected?.title==='Avbryt')return say('Sletting avbrutt.');
    try{await removeTask(command.selected.target.id);return say(`«${command.selected.target.title}» er slettet.`);}catch{return say('Oppgaven kunne ikke slettes. Prøv igjen.');}
  }
  try{if(command.type==='complete')await save({...t,completed:true}); else if(command.type==='move')await save({...t,due:command.due}); say(command.type==='complete'?`«${t.title}» er fullført.`:`«${t.title}» er flyttet. Jeg tolket datoen som ${command.interpreted.label}.`);}catch{say('Endringen kunne ikke lagres. Prøv igjen.');}
}
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#chat-text');if(!input.value.trim())return;const el=document.createElement('div');el.className='bubble user';el.textContent=input.value;$('#messages').append(el);const command=parseCommand(input.value);input.value='';execute(command);});
$('#settings').onclick=()=>$('#settings-dialog').showModal();$('.close').onclick=()=>$('#settings-dialog').close();
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`huskeliste-${localISO(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);};
$('#import').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data.tasks))throw Error();for(const task of data.tasks)await store.put(task);tasks=await store.all();render();syncNow();toast('Sikkerhetskopien er importert');}catch{toast('Ugyldig sikkerhetskopi');}};
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2400);}
async function removeTask(id){ queueDelete(id); await store.remove(id); tasks=tasks.filter(x=>x.id!==id); render(); cloud?.remove(id).catch(()=>{}); }
let syncing=null;
function syncNow(manual=false){
  if(!cloud?.user||!navigator.onLine){if(manual)toast('Ingen nettforbindelse');return Promise.resolve();}
  return syncing??=cloud.sync().then(async()=>{tasks=await store.all();render();if(manual)toast('Synkronisert');}).catch(()=>{if(manual)toast('Synkroniseringen mislyktes');}).finally(()=>{syncing=null;});
}
function renderAccount(){
  const user=cloud?.user;
  $('#account').classList.toggle('hidden',!cloud);
  $('#storage-note').textContent=user?'Oppgavene lagres på enheten og synkroniseres med kontoen din.':'Oppgavene lagres bare på denne enheten.';
  $('#account-status').textContent=user?`Innlogget som ${user.email}`:'Logg inn med e-post for å synkronisere oppgavene mellom enheter.';
  $('#login-form').classList.toggle('hidden',Boolean(user)); $('#account-actions').classList.toggle('hidden',!user);
  if(user)$('#code-form').classList.add('hidden');
}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();try{await cloud.signIn($('#email').value.trim());$('#code-form').classList.remove('hidden');toast('Sjekk e-posten din');}catch{toast('Kunne ikke sende e-post');}});
$('#code-form').addEventListener('submit',async e=>{e.preventDefault();try{await cloud.verify($('#email').value.trim(),$('#code').value.trim());e.target.reset();}catch{toast('Ugyldig eller utløpt kode');}});
$('#sync-now').onclick=()=>syncNow(true);
$('#logout').onclick=async()=>{await cloud.signOut();tasks=await store.all();render();toast('Logget ut');};
store.all().then(value=>{tasks=value;render();}).catch(()=>toast('Kunne ikke åpne lokal lagring'));
if(cloudConfigured) openCloud(store,()=>{renderAccount();syncNow();}).then(c=>{cloud=c;renderAccount();syncNow();}).catch(()=>{});
addEventListener('online',()=>syncNow());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow();});
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
