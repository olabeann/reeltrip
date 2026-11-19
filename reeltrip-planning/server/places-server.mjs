/** Optional local server: serves the prototype and keeps TourAPI credentials server-side. */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function searchTourism(query,{key=process.env.TOUR_API_KEY,fetcher=fetch}={}){
  if(!key)throw Object.assign(new Error('Tourism search is not configured'),{status:503});
  const q=String(query||'').trim();if(q.length<2||q.length>120)throw Object.assign(new Error('Enter a place or region'),{status:400});
  const url=new URL('https://apis.data.go.kr/B551011/KorService2/searchKeyword2');
  url.search=new URLSearchParams({serviceKey:key,MobileOS:'WEB',MobileApp:'Reeltrip',_type:'json',numOfRows:'10',pageNo:'1',arrange:'A',keyword:q});
  const response=await fetcher(url,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Tourism provider unavailable');
  const data=await response.json();if(!['0000','00'].includes(data.response?.header?.resultCode))throw new Error('Tourism provider unavailable');
  const raw=data.response?.body?.items?.item||[],items=Array.isArray(raw)?raw:[raw];
  const imageURL=value=>{try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.hostname!=='tong.visitkorea.or.kr')return '';u.protocol='https:';return u.href;}catch{return '';}};
  return {places:items.map(p=>({id:'tourism-'+p.contentid,source:'tourism',contentId:String(p.contentid),name:p.title||'',address:[p.addr1,p.addr2].filter(Boolean).join(' '),area:p.addr1||'',type:'관광지',duration:60,lat:p.mapy?Number(p.mapy):null,lng:p.mapx?Number(p.mapx):null,photoURL:imageURL(p.firstimage),photo:p.firstimage?'provider':undefined,attributions:[{name:'한국관광공사 · TourAPI',url:'https://api.visitkorea.or.kr/'}],verified:true}))};
}
export function createServer(){return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
    const u=new URL(req.url,'http://localhost');
    if(req.method!=='GET'){send(405,{error:'Method not allowed'});return;}
    if(u.pathname==='/api/tourism/search'){try{send(200,await searchTourism(u.searchParams.get('q')));}catch(e){send(e.status||502,{error:e.status?e.message:'Tourism provider unavailable'});}return;}
    const pathname=decodeURIComponent(u.pathname==='/'?'/app/index.html':u.pathname);
    // Only public app assets are served. No repository, server, or environment files.
    if(!/^\/(app|assets)\/[\w./-]+$/.test(pathname)||pathname.split('/').some(p=>p.startsWith('.'))){send(404,{error:'Not found'});return;}
    const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root)){send(404,{error:'Not found'});return;}
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'}[path.extname(filename)];
    if(!mime){send(404,{error:'Not found'});return;}const body=await readFile(filename);res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
  }catch{send(404,{error:'Not found'});}
});}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const port=Number(process.env.PORT||8766);createServer().listen(port,'127.0.0.1',()=>console.log(`Reeltrip: http://127.0.0.1:${port}/app/index.html`));}
