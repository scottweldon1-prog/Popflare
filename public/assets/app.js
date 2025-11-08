
const TABS = ["football","trailers","ukpop","viral"];
const state = {active:"football", data:{}, page:1, pageSize:18, loading:false};
const $ = id => document.getElementById(id);

async function fetchJSON(name){
  try{
    const res = await fetch(`content/${name}.json?ts=${Date.now()}`);
    if(!res.ok) throw 0;
    return await res.json();
  }catch{ return {updatedAt:null, items:[]}; }
}
async function loadTab(name){
  state.active = name; state.page = 1; state.loading = false;
  TABS.forEach(t => { const b = $(`btn-${t}`); if(b) b.classList.toggle("active", t===name); });
  if(!state.data[name]) state.data[name] = await fetchJSON(name);
  render(name, state.data[name], true);
  if(window.ezstandalone?.cmd){
    ezstandalone.cmd.push(() => ezstandalone.destroyAll());
    ezstandalone.cmd.push(() => ezstandalone.showAds(100,101,102,103,104));
  }
}
function escapeHtml(s){return (s||"").replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function cardHTML(item){
  const title = escapeHtml(item.title||"");
  const channel = escapeHtml(item.channel||"");
  const when = item.published ? new Date(item.published).toLocaleString() : "";
  return `<div class="card">
    <div class="thumb"><iframe loading="lazy" src="${item.embedUrl}" title="${title}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
    <div class="title">${title}</div>
    <div class="meta-row"><span class="badge">${channel}</span>${when?`<span>${when}</span>`:""}</div>
  </div>`;
}
function render(name, data, reset=false){
  const grid = $("grid");
  if(reset) grid.innerHTML = "";
  const start = (state.page-1)*state.pageSize, end=start+state.pageSize;
  (data.items||[]).slice(start,end).forEach((it, idx)=>{
    if((start+idx)>0 && (start+idx)%9===0) grid.insertAdjacentHTML("beforeend","<div class='ad-slot'>Ad slot</div>");
    grid.insertAdjacentHTML("beforeend", cardHTML(it));
  });
  $("updated").textContent = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—";
}
window.addEventListener("scroll", ()=>{
  if(state.loading) return;
  if(window.innerHeight + window.scrollY < document.body.offsetHeight - 600) return;
  const d = state.data[state.active]; if(!d) return;
  const pages = Math.ceil((d.items?.length||0)/state.pageSize); if(state.page>=pages) return;
  state.loading=true; state.page++; render(state.active, d, false); state.loading=false;
  if(window.ezstandalone?.cmd){ ezstandalone.cmd.push(() => ezstandalone.showAds()); }
});
document.addEventListener("DOMContentLoaded", ()=>{
  $("btn-football").onclick=()=>loadTab("football");
  $("btn-trailers").onclick=()=>loadTab("trailers");
  $("btn-ukpop").onclick=()=>loadTab("ukpop");
  $("btn-viral").onclick=()=>loadTab("viral");
  document.getElementById("year").textContent = new Date().getFullYear();
  loadTab("football");
});
