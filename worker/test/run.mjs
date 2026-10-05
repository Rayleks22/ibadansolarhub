import worker from '../src/index.js';
import { KV } from './kv-mock.mjs';

const ORIGIN='https://ibadansolarhub.com.ng';
const env={ LEADS:new KV(), ADMIN_TOKEN:'test-token-abc' };
let pass=0, fail=0;
const check=(name,cond,detail='')=>{
  if(cond){pass++;console.log(`  PASS  ${name}`);}
  else{fail++;console.log(`  FAIL  ${name}  ${detail}`);}
};
const call=(method,path,body,headers={})=>{
  const init={method,headers:{...(body?{'Content-Type':'application/json','Origin':ORIGIN}:{Origin:ORIGIN}),...headers}};
  if(body!==undefined) init.body=typeof body==='string'?body:JSON.stringify(body);
  return worker.fetch(new Request('https://leads.example.workers.dev'+path,init),env);
};
const valid={name:'Ngozi Adeyemi',phone:'2348027127331',location:'Bodija, Ibadan',
  property:'3-Bedroom',system:'5kVA',notes:'One 1HP AC',pageUrl:'https://x/quote'};

console.log('\n--- 1. happy path ---');
let r=await call('POST','/api/leads',valid); let j=await r.json();
check('valid lead accepted', r.status===200 && j.stored===true, JSON.stringify(j));
check('lead key is chronological (sortable)', /^lead:\d{4}-/.test(j.id||''), j.id);

console.log('\n--- 2. validation ---');
r=await call('POST','/api/leads',{...valid,name:'X'}); check('1-char name rejected', r.status===400);
r=await call('POST','/api/leads',{...valid,phone:'12345'}); check('bad phone rejected', r.status===400);
r=await call('POST','/api/leads',{...valid,phone:'2349991234567'}); check('invalid NG prefix rejected', r.status===400);
r=await call('POST','/api/leads','{not json'); check('malformed JSON rejected', r.status===400);
r=await call('POST','/api/leads','x'.repeat(9000)); check('oversize body rejected', r.status===413);

console.log('\n--- 3. security ---');
r=await call('POST','/api/leads',valid,{Origin:'https://evil.example'}); check('foreign origin blocked', r.status===403);
r=await call('GET','/api/leads'); check('admin list needs auth', r.status===401);
r=await call('GET','/api/leads',undefined,{Authorization:'Bearer test-token-abc'});
check('correct token lists leads', r.status===200 && (await r.json()).count>=1);
r=await call('GET','/api/leads',undefined,{Authorization:'Bearer wrong'}); check('wrong token rejected', r.status===401);
r=await call('DELETE','/api/leads'); check('unknown method 405', r.status===405);

console.log('\n--- 4. honeypots ---');
r=await call('POST','/api/leads',{...valid,company_website_url:'http://spam'},{}); j=await r.json();
check('honeypot silently not stored', j.ok===true && j.stored===false, JSON.stringify(j));

console.log('\n--- 5. timing heuristic must never destroy a lead ---');
// A real user who autofills and submits 900ms after page load.
env.LEADS=new KV();
r=await call('POST','/api/leads',{...valid,form_loaded_at:String(Date.now()-900)}); j=await r.json();
check('fast human (900ms) is STORED, not discarded', j.stored===true, 'stored='+j.stored);
const stored=JSON.parse(await env.LEADS.get(j.id));
check('  ...and flagged as suspicious', stored.suspicious==='submitted-under-1.2s', stored.suspicious);
// A bot submitting instantly is also stored (flagged), never lost.
r=await call('POST','/api/leads',{...valid,form_loaded_at:String(Date.now()-50)}); j=await r.json();
check('instant bot submit still stored (flagged, not dropped)', j.stored===true);
// A normal human is not flagged.
r=await call('POST','/api/leads',{...valid,form_loaded_at:String(Date.now()-8000)}); j=await r.json();
const ok=JSON.parse(await env.LEADS.get(j.id));
check('normal human (8s) not flagged', ok.suspicious==='', JSON.stringify(ok.suspicious));
// Missing timestamp must not be treated as suspicious.
r=await call('POST','/api/leads',{...valid}); j=await r.json();
const noTs=JSON.parse(await env.LEADS.get(j.id));
check('missing form_loaded_at not flagged', noTs.suspicious==='', JSON.stringify(noTs.suspicious));

console.log('\n--- 6. rate limit ---');
env.LEADS=new KV();
let last;
for(let i=0;i<12;i++){ last=await call('POST','/api/leads',{...valid,notes:'n'+i}); }
check('11th submission rate-limited', last.status===429, 'status='+last.status);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail?1:0);
