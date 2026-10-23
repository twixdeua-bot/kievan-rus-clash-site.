const SOURCE='https://royaletracker.gg/best-decks/normal-battles';
let cache=null, cacheAt=0;
const TTL=30*60*1000;
function parseStructured(html){
  const out=[];
  const scripts=[...html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const m of scripts){try{
    const stack=[JSON.parse(m[1])];
    while(stack.length){
      const v=stack.pop(); if(!v||typeof v!=='object')continue;
      if(Array.isArray(v)){stack.push(...v);continue;}
      const cards=v.cards||v.deck||v.cardNames;
      const wr=Number(v.winRate??v.win_rate??v.winrate);
      const battles=Number(v.battles??v.battleCount??v.battle_count);
      const usage=Number(v.usage??v.usageRate??v.usage_rate);
      if(Array.isArray(cards)&&cards.length===8&&Number.isFinite(wr)&&Number.isFinite(battles)&&battles>=0){
        const names=cards.map(c=>typeof c==='string'?c:(c.name||c.cardName||'')).filter(Boolean);
        if(names.length===8)out.push({cards:names,winRate:wr,battles,usage:Number.isFinite(usage)?usage:null});
      }
      stack.push(...Object.values(v));
    }
  }catch(_){}}
  return out;
}
export default async function handler(req){
  if(req.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{allow:'GET'}});
  if(cache&&Date.now()-cacheAt<TTL)return Response.json({source:SOURCE,items:cache,cached:true},{headers:{'Cache-Control':'public,max-age=300'}});
  try{
    const r=await fetch(SOURCE,{headers:{'user-agent':'Mozilla/5.0 (compatible; KievanRusDeckStats/1.0)',accept:'text/html'},signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('Источник ответил HTTP '+r.status);
    const html=await r.text(), items=parseStructured(html);
    if(!items.length)return Response.json({source:SOURCE,items:[],message:'Источник не предоставил статистику в распознаваемом формате. Цифры не подставлены.'},{headers:{'Cache-Control':'no-store'}});
    cache=items;cacheAt=Date.now();
    return Response.json({source:SOURCE,items,cached:false},{headers:{'Cache-Control':'public,max-age=300,s-maxage=300'}});
  }catch(e){return Response.json({source:SOURCE,items:[],message:'Не удалось получить проверяемую статистику: '+String(e?.message||e)},{headers:{'Cache-Control':'no-store'}});}
}
export const config={path:'/api/deck-stats'};
