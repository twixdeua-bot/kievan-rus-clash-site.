const SOURCES = [
  {name:'RoyaleAPI', url:'https://royaleapi.com/free?lang=en'},
  {name:'RoyaleTracker', url:'https://royaletracker.gg/codes'},
  {name:'Clash Loot', url:'https://clashloot.com/cr'}
];
const decode = (s='') => s.replace(/&amp;/g,'&').replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const strip = (s='') => decode(s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
function safeUrl(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)return null; if(!['link.clashroyale.com','store.supercell.com','supercell.com','www.supercell.com','royaleapi.com','www.royaleapi.com','royaletracker.gg','www.royaletracker.gg','clashloot.com','www.clashloot.com'].includes(u.hostname))return null;return u.href;}catch{return null;}}
function gameOf(t, url=''){
 const x=(t+' '+url).toLowerCase();
 if(/brawl\s*stars|brawlstars|\bbrawl\b/.test(x))return 'Brawl Stars';
 if(/clash\s*of\s*clans|clashofclans|\bcoc\b/.test(x))return 'Clash of Clans';
 if(/squad\s*busters|squadbusters/.test(x))return 'Squad Busters';
 if(/clash\s*mini|clashmini/.test(x))return 'Clash Mini';
 if(/hay\s*day|hayday/.test(x))return 'Hay Day';
 if(/clash\s*royale|clashroyale|link\.clashroyale\.com|storeCode=/i.test(x))return 'Clash Royale';
 return 'Не определена';
}
function category(t){if(/emote/i.test(t))return 'Emotes';if(/banner|frame/i.test(t))return 'Banners';if(/chest|lucky/i.test(t))return 'Chests';if(/gold|gem|token|wild card/i.test(t))return 'Gold';return 'Others';}
function extract(html, source){
 const items=[]; const links=[...html.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)];
 for(const m of links){const attrs=m[1], inner=m[2];const raw=attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];if(!raw)continue;const url=safeUrl(decode(raw));if(!url)continue;
  const direct=/link\.clashroyale\.com\/(?:\w+\/)?\?action=voucher|store\.supercell\.com\/clashroyale.*storeCode=|supercell\.com\/clashroyale-gift/i.test(url);
  const text=strip(inner);const around=html.slice(Math.max(0,m.index-1800),Math.min(html.length,m.index+m[0].length+1800));const surrounding=strip(around);
  if(!direct && !/claim|redeem|free reward|free stuff/i.test(text))continue;
  let title=text;
  if(!title||/^(claim|claim now|detail|redeem|open|learn more)$/i.test(title)){const candidates=surrounding.split(/\s{2,}/).map(x=>x.trim()).filter(x=>x.length>3&&x.length<100&&!/^(claim|detail|free and special rewards|how to claim|price|source|category|tags|what's inside)$/i.test(x));title=candidates.find(x=>/emote|banner|chest|gold|reward|token|skin|frame|card/i.test(x))||candidates[0]||'Бесплатная награда Clash Royale';}
  if(title.length>120)title=title.slice(0,120);
  let image=null;const im=around.match(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);if(im){try{const iu=new URL(decode(im[2]),'https://'+new URL(SOURCES.find(s=>s.name===source).url).hostname);if(iu.protocol==='https:'&&!/tracking|pixel/i.test(iu.href))image=iu.href;}catch{}}
  const verified=(surrounding.match(/(?:expires|ends in|released on|added)\s*:?[ ]*([\w ,.-]{3,30})/i)||[])[1]||'';
  if(!items.some(x=>x.url===url))items.push({title,game:gameOf(title,url),category:category(title+' '+surrounding),url,image,verified,source});
 }
 // RoyaleAPI's store codes are often displayed as text rather than clickable links.
 if(source==='RoyaleAPI'){
  for(const m of html.matchAll(/(?:store code|redeem code)[\s\S]{0,700}?\b([A-Z][A-Z0-9!]{5,24})\b/gi)){
   const code=m[1];if(/^(CLASH|ROYALE|SUPERcell)$/i.test(code))continue;const url='https://store.supercell.com/clashroyale?storeCode='+encodeURIComponent(code);if(!items.some(x=>x.url===url))items.push({title:'Код: '+code,game:'Clash Royale',category:'Others',url,image:null,verified:'Код магазина — введи после входа в Supercell ID',source});
  }
 }
 return items;
}
export default async (req)=>{
 if(req.method!=='GET')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{'content-type':'application/json; charset=utf-8',allow:'GET'}});
 const failures=[];
 for(const source of SOURCES){try{
  const r=await fetch(source.url,{headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36','accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.9'},redirect:'follow',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error(`${source.name} HTTP ${r.status}`);
  const html=await r.text();const items=extract(html,source.name);
  if(!items.length)throw new Error(`${source.name}: список открыт, но ссылки наград не распознаны`);
  return new Response(JSON.stringify({source:source.url,sourceName:source.name,fetchedAt:new Date().toISOString(),count:items.length,items,note:'Автоматически собранный список стороннего источника. Срок действия наград может измениться.'}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900, s-maxage=900','access-control-allow-origin':'*'}});
 }catch(e){failures.push(String(e?.message||e));}}
 return new Response(JSON.stringify({error:'Не удалось получить список наград ни с одного источника.',details:failures.join(' | '),sources:SOURCES}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
};
export const config={path:'/api/rewards'};
