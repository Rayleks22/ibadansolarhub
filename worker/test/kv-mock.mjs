/** Minimal in-memory stand-in for Cloudflare KV. */
export class KV {
  constructor(){ this.m = new Map(); }
  async get(k){ const e=this.m.get(k); if(!e) return null;
    if(e.exp && e.exp < Date.now()){ this.m.delete(k); return null; } return e.v; }
  async put(k,v,opts={}){ this.m.set(k,{v,exp:opts.expirationTtl?Date.now()+opts.expirationTtl*1000:0}); }
  async list({limit=1000,prefix=''}={}){
    const keys=[...this.m.keys()].filter(k=>k.startsWith(prefix))
      .sort().slice(0,limit).map(name=>({name}));
    return {keys,list_complete:true};
  }
}
