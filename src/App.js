import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";


// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const EXPENSE_CATS = [
  "Coffee & Drinks","Dining & Food","Groceries","Hobbies","Investment",
  "Mobile Data & Internet","Others","Ritual Penggandaan Rezeki","Savings","Self Care",
  "Shopping","Subscriptions","Tobacco","Transport & Fuel","Utilities",
];
const INCOME_CATS = ["Monthly Salary","Freelance","Bonus","Investment Return","Other Income"];
const DEFAULT_WALLETS = ["Cash","GoPay","BCA","OVO","Dana","Mandiri","ShopeePay"];
const WALLET_EMOJI = {Cash:"💵",GoPay:"💚",BCA:"🔵",OVO:"💜",Dana:"🔷",Mandiri:"🟡",ShopeePay:"🔴"};
const CAT_ICON = {
  "Coffee & Drinks":"☕","Dining & Food":"🍜","Groceries":"🛒","Hobbies":"🎮","Investment":"📈",
  "Mobile Data & Internet":"📱","Others":"📦","Ritual Penggandaan Rezeki":"🤲",
  "Savings":"🏦","Self Care":"✨","Shopping":"🛍️","Subscriptions":"🎵",
  "Tobacco":"🚬","Transport & Fuel":"🚗","Utilities":"⚡",
};
const CAT_COLOR = {
  "Coffee & Drinks":"#92400E","Dining & Food":"#F97316","Groceries":"#EF4444","Hobbies":"#84CC16",
  "Investment":"#2563EB","Others":"#94A3B8","Mobile Data & Internet":"#7C3AED",
  "Ritual Penggandaan Rezeki":"#8B5CF6","Savings":"#10B981","Self Care":"#14B8A6",
  "Shopping":"#DB2777","Subscriptions":"#EC4899","Tobacco":"#78716C",
  "Transport & Fuel":"#64748B","Utilities":"#0891B2",
};
const PALETTE = ["#92400E","#F97316","#10B981","#2563EB","#DB2777","#7C3AED","#EF4444","#14B8A6","#F59E0B","#8B5CF6","#84CC16","#0891B2","#EC4899","#64748B"];
const MONTH_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_F = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const rp    = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(n||0);
const rpK   = n => n>=1e6?`Rp ${(n/1e6).toFixed(1)}M`:n>=1e3?`Rp ${(n/1e3).toFixed(0)}K`:`Rp ${n||0}`;
const mkKey = d => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; };
const mkLbl = k => { if(!k)return""; const[y,m]=k.split("-"); return `${MONTH_F[+m-1]} ${y}`; };
const mkLblS= k => { if(!k)return""; const[y,m]=k.split("-"); return `${MONTH_S[+m-1]} ${y}`; };
const todayFn=()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;};
const fmtDate=d=>{if(!d||!d.includes("-"))return d||"";const[y,m,dd]=d.split("-");if(!y||!m||!dd)return d;return`${dd}-${m}-${y.slice(-2)}`;};
const uid   = ()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const catC  = (c,i=0)=>CAT_COLOR[c]||PALETTE[i%PALETTE.length];
const wEmoji= w=>WALLET_EMOJI[w]||"💳";
const catIcon=c=>CAT_ICON[c]||"💸";
const MONO  = "'Space Grotesk','DM Sans',system-ui,sans-serif";

// Wallet balance: income - expense, handle transfers
const walletBal = (name, txs) => txs.reduce((b,t) => {
  if (t.wallet===name) {
    if (t.type==="income") return b+t.amount;
    if (t.type==="expense") return b-t.amount;
    if (t.type==="transfer") return b-t.amount;
  }
  if (t.type==="transfer" && t.toWallet===name) return b+t.amount;
  return b;
}, 0);

// ─── THEMES ───────────────────────────────────────────────────────────────────
const CL = {
  bg:"#EEF0F8", bgCard:"#FFFFFF", navy:"#1A2151", navyMid:"#3D4E7A",
  muted:"#7B87A8", faded:"#C4CBE0", border:"#E4E8F4",
  mint:"#34D399", mintD:"#10B981", lavender:"#8B7FE8", lavLight:"#EDE9FE",
  coral:"#F87171", coralL:"#FEE2E2", gold:"#F59E0B", goldL:"#FEF3C7",
  blue:"#3B82F6", blueL:"#DBEAFE", purple:"#7C3AED", purpleL:"#EDE9FE",
  teal:"#0D9488",
  shadow:"0 2px 12px rgba(26,33,81,0.08)", shadowMd:"0 6px 24px rgba(26,33,81,0.12)",
  shadowLg:"0 12px 40px rgba(26,33,81,0.16)",
  inpBg:"#F7F9FF", bgNav:"rgba(255,255,255,0.95)", bgHeader:"rgba(238,240,248,0.95)",
};
const CD = {
  bg:"#090D1A", bgCard:"#111827", navy:"#E2E8FF", navyMid:"#8A9BC5",
  muted:"#4A5880", faded:"#1C2440", border:"#1C2540",
  mint:"#34D399", mintD:"#10B981", lavender:"#A78BFA", lavLight:"#1E1A3A",
  coral:"#F87171", coralL:"#2D1515", gold:"#FBBF24", goldL:"#2A1F0A",
  blue:"#60A5FA", blueL:"#1A2240", purple:"#A78BFA", purpleL:"#1E1535",
  teal:"#2DD4BF",
  shadow:"0 2px 16px rgba(0,0,0,0.5)", shadowMd:"0 6px 28px rgba(0,0,0,0.6)",
  shadowLg:"0 12px 48px rgba(0,0,0,0.7)",
  inpBg:"#141E35", bgNav:"rgba(9,13,26,0.95)", bgHeader:"rgba(9,13,26,0.97)",
};

const ThemeCtx = React.createContext(CL);
const useTheme = () => useContext(ThemeCtx);
const mkCard   = C => ({ background:C.bgCard, borderRadius:20, boxShadow:C.shadow });
const mkCardSm = C => ({ background:C.bgCard, borderRadius:16, boxShadow:C.shadow });
const mkInp    = C => ({
  width:"100%", background:C.inpBg, border:`1.5px solid ${C.border}`,
  borderRadius:14, padding:"14px 16px", color:C.navy, fontSize:15,
  boxSizing:"border-box", outline:"none", fontFamily:"inherit",
});

// ─── PRIVACY CONTEXT ──────────────────────────────────────────────────────────
const HiddenCtx = React.createContext(false);
const Amt=({v,color,size=16,w=700})=>{
  const hidden=useContext(HiddenCtx);
  const C=useTheme();
  return(
    <span style={{fontFamily:MONO,fontSize:size,fontWeight:w,color:color||C.navy,letterSpacing:-0.3,
      filter:hidden?"blur(8px)":"none",transition:"filter .3s",userSelect:hidden?"none":"auto",display:"inline-block"}}>
      {rp(v)}
    </span>
  );
};
const AmtK=({v,color,size=13,w=700})=>{
  const hidden=useContext(HiddenCtx);
  const C=useTheme();
  return(
    <span style={{fontFamily:MONO,fontSize:size,fontWeight:w,color:color||C.navy,
      filter:hidden?"blur(6px)":"none",transition:"filter .3s",userSelect:hidden?"none":"auto",display:"inline-block"}}>
      {rpK(v)}
    </span>
  );
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const SK_BASE="pinqflow-v1";

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB2GovwVj9bimSVarf6n-og6zXPJL3c0nE",
  authDomain: "pinqflow.firebaseapp.com",
  projectId: "pinqflow",
  storageBucket: "pinqflow.firebasestorage.app",
  messagingSenderId: "686234093584",
  appId: "1:686234093584:web:d17bbc1b3fcc8e14dc6295"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const DEMO={
  transactions:[{"id":"xl0001","date":"2026-01-01","description":"S 18 December","category":"Others","amount":1000000,"type":"income","wallet":"Cash"},{"id":"xl0002","date":"2026-01-01","category":"Lifestyle - Hangout & Jajan","description":"Tanmu Coffee","amount":78000,"type":"expense","wallet":"Cash"},{"id":"xl0009","date":"2026-01-01","description":"Monyh Salary","category":"Monthly Salary","amount":4800000,"type":"income","wallet":"Cash"},{"id":"xl0014","date":"2026-01-03","category":"Pulsa & Internet Data","description":"Token Listrik Sentul","amount":306700,"type":"expense","wallet":"Cash"},{"id":"xl0033","date":"2026-01-08","category":"Shopping","description":"Case iPhone Spigen","amount":315944,"type":"expense","wallet":"Cash"},{"id":"xl0094","date":"2026-02-01","description":"S & Arif","category":"Others","amount":2300000,"type":"income","wallet":"Cash"},{"id":"xl0098","date":"2026-02-02","description":"Month Salary","category":"Monthly Salary","amount":4500000,"type":"income","wallet":"Cash"},{"id":"xl0109","date":"2026-02-04","category":"Ritual Penggandaan Rezeki","description":"Syifa","amount":3000000,"type":"expense","wallet":"Cash"},{"id":"xl0171","date":"2026-03-02","description":"Month Salary","category":"Monthly Salary","amount":4500000,"type":"income","wallet":"Cash"},{"id":"xl0181","date":"2026-03-13","description":"THR","category":"Others","amount":4400000,"type":"income","wallet":"Cash"},{"id":"xl0184","date":"2026-03-06","category":"Ritual Penggandaan Rezeki","description":"Syifa","amount":3000000,"type":"expense","wallet":"Cash"},{"id":"xl0250","date":"2026-04-01","description":"Month Salary","category":"Monthly Salary","amount":4400000,"type":"income","wallet":"Cash"},{"id":"xl0266","date":"2026-04-04","category":"Ritual Penggandaan Rezeki","description":"Syifa","amount":3000000,"type":"expense","wallet":"Cash"},{"id":"xl0314","date":"2026-04-05","description":"Month Salary","category":"Monthly Salary","amount":4450000,"type":"income","wallet":"Cash"},{"id":"xl0315","date":"2026-05-02","category":"Ritual Penggandaan Rezeki","description":"Tyo + Tomyum","amount":300000,"type":"expense","wallet":"Cash"},{"id":"xl0316","date":"2026-05-03","category":"Hobbies","description":"COD MW Remastered","amount":19200,"type":"expense","wallet":"Cash"},{"id":"xl0317","date":"2026-05-05","category":"Shopping","description":"Pull Up Bar","amount":120000,"type":"expense","wallet":"Cash"},{"id":"xl0318","date":"2026-05-02","category":"Groceries","description":"Ayam Taliwang","amount":103000,"type":"expense","wallet":"Cash"},{"id":"xl0319","date":"2026-05-05","category":"Ritual Penggandaan Rezeki","description":"Syifa","amount":3000000,"type":"expense","wallet":"Cash"}],
  budgets:{"Savings":2670000,"Groceries":600000,"Shopping":400000,"Ritual Penggandaan Rezeki":500000,"Transport & Fuel":500000,"Utilities":400000,"Mobile Data & Internet":150000,"Dining & Food":500000,"Coffee & Drinks":200000,"Tobacco":300000,"Subscriptions":150000,"Self Care":200000},
  settings:{savingsTarget:60,expenseMax:40},
  wallets:DEFAULT_WALLETS,
  recurring:[
    {id:"r1",description:"Netflix",category:"Subscriptions",amount:54000,type:"expense",wallet:"BCA",frequency:"monthly",dayOfMonth:10,active:true,lastApplied:"2026-05"},
    {id:"r2",description:"Mobile data plan",category:"Mobile Data & Internet",amount:75000,type:"expense",wallet:"GoPay",frequency:"monthly",dayOfMonth:20,active:true,lastApplied:""},
    {id:"r3",description:"WiFi Indihome",category:"Utilities",amount:366637,type:"expense",wallet:"Cash",frequency:"monthly",dayOfMonth:8,active:true,lastApplied:""},
  ],
  goals:[],
  darkMode:false,
};
const CAT_MIGRATE={"Monthly Saving's":"Savings","Pulsa & Internet Data":"Mobile Data & Internet","Lifestyle - Subscription Fee":"Subscriptions","Lifestyle - Hangout & Jajan":"Dining & Food","Personal Needs - Food":"Groceries","Personal Needs - Self Care":"Self Care","Transport / Gas / Tol / Motor":"Transport & Fuel","Personal Need's Hobby":"Hobbies","Rokok / Tembakau":"Tobacco","Utilities (Listrik & Air)":"Utilities"};
const DESC_TO_CAT={"Token Listrik":"Utilities","Token Listrik Sentul":"Utilities","WiFi Indihome":"Utilities","Listrik":"Utilities","IPL & Iuran":"Utilities","Terea":"Tobacco","Kouta Telkomsel":"Mobile Data & Internet","Kouta XL":"Mobile Data & Internet","Pulsa XL":"Mobile Data & Internet","Arisan":"Savings"};
function migrate(d){const txs=d.transactions.map(t=>{const byD=DESC_TO_CAT[t.description];if(byD)return{...t,category:byD};const nC=CAT_MIGRATE[t.category];return nC?{...t,category:nC}:t;});return{...d,transactions:txs};}
async function loadData(user){
  try{
    const ref=doc(db,"users",user);
    const snap=await getDoc(ref);
    if(snap.exists())return migrate(snap.data().data);
  }catch(e){console.error("Firebase load error:",e);}
  return migrate(DEMO);
}
async function saveData(d,user){
  try{
    const ref=doc(db,"users",user);
    await setDoc(ref,{data:d,updatedAt:Date.now()});
  }catch(e){console.error("Firebase save error:",e);}
}
function applyRecurring(data){
  const now=new Date(),td=now.getDate(),curMK=mkKey(now);let changed=false;const txs=[...data.transactions];
  const recs=(data.recurring||[]).map(r=>{if(!r.active||r.lastApplied===curMK)return r;if(r.frequency==="monthly"&&td>=r.dayOfMonth){const exists=txs.some(t=>t.recurringId===r.id&&mkKey(t.date)===curMK);if(!exists){const dd=new Date(now.getFullYear(),now.getMonth(),r.dayOfMonth);txs.push({id:uid(),date:dd.toISOString().split("T")[0],description:r.description+" (auto)",category:r.category,amount:r.amount,type:r.type,wallet:r.wallet||"Cash",recurringId:r.id});changed=true;}return{...r,lastApplied:curMK};}return r;});
  return(changed||JSON.stringify(recs)!==JSON.stringify(data.recurring))?{...data,transactions:txs,recurring:recs}:data;
}
function exportCSV(txs,month){const h=["Date","Description","Category","Wallet","To Wallet","Type","Amount"];const rows=txs.map(t=>[t.date,t.description,t.category,t.wallet||"Cash",t.toWallet||"",t.type==="income"?"Income":t.type==="expense"?"Expense":"Transfer",t.amount]);const csv="\uFEFF"+[h,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})),download:`PinqFlow_${month}.csv`}).click();}

// ─── PINQFLOW PENGUIN LOGO ────────────────────────────────────────────────────
function PenguinLogo({size=36, style={}}){
  const S=3.5;
  return(
    <svg width={size} height={size} viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs><radialGradient id="headGrad" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#3A3A3A"/><stop offset="100%" stopColor="#111111"/></radialGradient></defs>
      <ellipse cx="72" cy="74" rx="8" ry="20" fill="#111" stroke="#111" strokeWidth={S} strokeLinejoin="round" transform="rotate(14 72 74)"/>
      <ellipse cx="24" cy="57" rx="8" ry="20" fill="#111" stroke="#111" strokeWidth={S} strokeLinejoin="round" transform="rotate(-52 24 57)"/>
      <ellipse cx="50" cy="74" rx="27" ry="30" fill="#111" stroke="#111" strokeWidth={S}/>
      <ellipse cx="50" cy="78" rx="17" ry="21" fill="#F8F8F8" stroke="#111" strokeWidth={S}/>
      <circle cx="50" cy="38" r="26" fill="url(#headGrad)" stroke="#111" strokeWidth={S}/>
      <ellipse cx="41" cy="24" rx="7" ry="5" fill="white" opacity="0.22" transform="rotate(-30 41 24)"/>
      <ellipse cx="50" cy="43" rx="19" ry="20" fill="#F8F8F8" stroke="#111" strokeWidth={S}/>
      <circle cx="41.5" cy="36.5" r="6.5" fill="#111" stroke="#111" strokeWidth="1.5"/>
      <circle cx="43.5" cy="34.5" r="2.2" fill="white"/>
      <circle cx="58.5" cy="36.5" r="6.5" fill="#111" stroke="#111" strokeWidth="1.5"/>
      <circle cx="60.5" cy="34.5" r="2.2" fill="white"/>
      <ellipse cx="33" cy="47" rx="6.5" ry="4.5" fill="#F9A8A8" opacity="0.7"/>
      <ellipse cx="67" cy="47" rx="6.5" ry="4.5" fill="#F9A8A8" opacity="0.7"/>
      <line x1="29.5" y1="44.5" x2="34.5" y2="43.5" stroke="#E57373" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="29" y1="47" x2="34" y2="46.5" stroke="#E57373" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="29.5" y1="49.5" x2="34.5" y2="49" stroke="#E57373" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="63.5" y1="44.5" x2="68.5" y2="43.5" stroke="#E57373" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="63" y1="47" x2="68" y2="46.5" stroke="#E57373" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="63.5" y1="49.5" x2="68.5" y2="49" stroke="#E57373" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M43 51 Q50 45 57 51 Q53.5 55 50 55.5 Q46.5 55 43 51Z" fill="#F59E0B" stroke="#111" strokeWidth={S} strokeLinejoin="round"/>
      <path d="M43 51 Q50 60 57 51 Q53.5 56.5 50 57.5 Q46.5 56.5 43 51Z" fill="#E8890A" stroke="#111" strokeWidth={S} strokeLinejoin="round"/>
      <path d="M44.5 52.5 Q50 58 55.5 52.5 Q53 56 50 57 Q47 56 44.5 52.5Z" fill="#DC2626"/>
      <ellipse cx="50" cy="57" rx="4" ry="2" fill="#EF4444" opacity="0.7"/>
      <ellipse cx="39" cy="103" rx="11" ry="5.5" fill="#F59E0B" stroke="#111" strokeWidth={S}/>
      <ellipse cx="61" cy="103" rx="11" ry="5.5" fill="#F59E0B" stroke="#111" strokeWidth={S}/>
      <path d="M22 64 Q36 58 50 59 Q64 58 78 64 L78 72 Q64 66 50 67 Q36 66 22 72Z" fill="#34D399" stroke="#2BBF85" strokeWidth="1"/>
      <path d="M71 62 Q79 66 80 76 Q75 81 72 72 Q70 66 71 62Z" fill="#34D399" stroke="#2BBF85" strokeWidth="1"/>
      <polyline points="40,80 44,74 48,77 52,71 56,75 60,69" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </svg>
  );
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
const BarFill=({pct,color,h=6})=>{
  const C=useTheme();
  return(
    <div style={{background:C.border,borderRadius:999,height:h,overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:999,background:color,width:`${Math.min(pct,100)}%`,transition:"width .5s ease"}}/>
    </div>
  );
};
const Tag=({children,color})=>(
  <span style={{display:"inline-block",background:`${color}18`,color,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{children}</span>
);
const FL=({label,children})=>{
  const C=useTheme();
  return(
    <div><div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:6}}>{label.toUpperCase()}</div>{children}</div>
  );
};
const BackBtn=({onBack})=>{
  const C=useTheme();
  return(
    <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.navy,cursor:"pointer",fontSize:15,fontWeight:700,marginBottom:16,padding:0}}>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back
    </button>
  );
};
const Chip=({children,active,onClick,col})=>{
  const C=useTheme();
  return(
    <button onClick={onClick} style={{background:active?col:`${C.bgCard}`,border:`1.5px solid ${active?col:C.border}`,borderRadius:20,padding:"6px 14px",color:active?"#fff":C.muted,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all .18s"}}>
      {children}
    </button>
  );
};

// ─── YEARLY SUMMARY ───────────────────────────────────────────────────────────
function YearlySummary({data}){
  const C=useTheme();
  const card=mkCard(C);
  const [open,setOpen]=useState(false);
  const now=new Date(),year=now.getFullYear(),todayStr=now.toISOString().split("T")[0];
  const ytd=data.transactions.filter(t=>t.date>=`${year}-01-01`&&t.date<=todayStr);
  const ytdInc=ytd.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const ytdExp=ytd.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const ytdNet=ytdInc-ytdExp;
  const months=Array.from({length:now.getMonth()+1},(_,i)=>{
    const mk=`${year}-${String(i+1).padStart(2,"0")}`;
    const mt=ytd.filter(t=>t.date.startsWith(mk));
    return{m:MONTH_S[i],inc:mt.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),exp:mt.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)};
  });
  const maxVal=Math.max(...months.map(m=>Math.max(m.inc,m.exp)),1);
  return(
    <div style={{...card,marginBottom:12,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",padding:"14px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.lavLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📅</div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.lavender,letterSpacing:1}}>{year} YEAR-TO-DATE</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>Jan 1 – {fmtDate(todayStr)}</div>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:C.muted}}>Net Savings</div>
          <span style={{fontFamily:MONO,fontSize:15,fontWeight:800,color:ytdNet>=0?C.mintD:C.coral}}>{rp(ytdNet)}</span>
        </div>
      </button>
      {open&&(
        <div style={{padding:"0 18px 16px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,margin:"14px 0"}}>
            {[{l:"Income",v:ytdInc,c:C.mintD},{l:"Expense",v:ytdExp,c:C.coral},{l:"Net",v:ytdNet,c:ytdNet>=0?C.mintD:C.coral}].map(({l,v,c})=>(
              <div key={l} style={{background:`${c}12`,borderRadius:12,padding:"10px"}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:4}}>{l.toUpperCase()}</div>
                <AmtK v={v} color={c} size={12}/>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>MONTHLY</div>
          <div style={{display:"flex",gap:3,alignItems:"flex-end",height:52}}>
            {months.map((m,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:40,gap:1}}>
                  <div style={{background:C.mint,borderRadius:"2px 2px 0 0",height:`${(m.inc/maxVal)*36}px`,minHeight:2,opacity:.7}}/>
                  <div style={{background:C.coral,borderRadius:"2px 2px 0 0",height:`${(m.exp/maxVal)*36}px`,minHeight:2,opacity:.7}}/>
                </div>
                <div style={{fontSize:7,color:C.muted,fontWeight:700}}>{m.m}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({txs,income,expense,saving,savePct,data,selectedMonth}){
  const C=useTheme();
  const card=mkCard(C),cardSm=mkCardSm(C);
  const target=data.settings?.savingsTarget??60,expMax=data.settings?.expenseMax??40;
  const expPct=income>0?(expense/income)*100:0;
  const isCurMonth=selectedMonth===mkKey(new Date());
  const now=new Date();
  const daysPassed=Math.max(now.getDate(),1);
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysLeft=daysInMonth-daysPassed;
  const dailyRate=expense/daysPassed;
  const projExp=Math.round(expense+dailyRate*daysLeft);
  const projSav=income-projExp;

  // Greeting
  const jktH=(now.getUTCHours()+7)%24;
  const greeting=jktH<12?"Good Morning ☀️":jktH<17?"Good Afternoon 🌤️":"Good Evening 🌙";

  // Total balance (all wallets all time)
  const allTxs=data.transactions;
  const totalBal=data.wallets.reduce((s,w)=>s+walletBal(w,allTxs),0);

  const bycat={};txs.filter(t=>t.type==="expense").forEach(t=>{bycat[t.category]=(bycat[t.category]||0)+t.amount;});
  const alerts=Object.entries(data.budgets||{}).map(([cat,bud])=>{const s=bycat[cat]||0;const p=bud>0?(s/bud)*100:0;return{cat,spent:s,bud,pct:p};}).filter(a=>a.pct>=80).sort((a,b)=>b.pct-a.pct);

  const months6=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);const mk=mkKey(d);const mt=data.transactions.filter(t=>mkKey(t.date)===mk);const inc=mt.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);const exp=mt.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);return{m:MONTH_S[+mk.split("-")[1]-1],sav:inc-exp};});

  // Upcoming bills (next 7 days)
  const upcoming=(data.recurring||[]).filter(r=>{
    if(!r.active||r.frequency!=="monthly")return false;
    const diff=r.dayOfMonth-now.getDate();
    return diff>=0&&diff<=7;
  }).map(r=>({...r,daysLeft:r.dayOfMonth-now.getDate()})).sort((a,b)=>a.daysLeft-b.daysLeft);

  // Proactive budget alerts (70%+ threshold, shown as banner)
  const earlyAlerts=Object.entries(data.budgets||{}).map(([cat,bud])=>{
    const s=bycat[cat]||0;const p=bud>0?(s/bud)*100:0;return{cat,spent:s,bud,pct:p};
  }).filter(a=>a.pct>=70&&a.pct<100).sort((a,b)=>b.pct-a.pct).slice(0,3);

  // Goals widget — nearest deadline not yet done
  const activeGoals=(data.goals||[]).filter(g=>g.saved<g.target).sort((a,b)=>{
    if(!a.deadline&&!b.deadline)return 0;
    if(!a.deadline)return 1;if(!b.deadline)return -1;
    return a.deadline.localeCompare(b.deadline);
  }).slice(0,2);

  const isDark=C.bg===CD.bg;

  return(
    <div style={{padding:"12px 14px 0"}}>
      {/* Greeting */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:22,fontWeight:900,color:C.navy,letterSpacing:-0.5}}>{greeting}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:2}}>{mkLbl(selectedMonth)}</div>
      </div>

      {/* Proactive Budget Alert Banner — 70-99% usage */}
      {earlyAlerts.length>0&&(
        <div style={{...cardSm,padding:"12px 16px",marginBottom:10,background:isDark?"#1a1500":"#FFFBEB",border:`1px solid ${C.gold}40`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:14}}>⚡</span>
            <span style={{fontSize:12,fontWeight:700,color:C.gold}}>Budget Warning</span>
          </div>
          {earlyAlerts.map(a=>(
            <div key={a.cat} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:C.navyMid,fontWeight:600}}>{catIcon(a.cat)} {a.cat}</span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:70,height:5,borderRadius:999,background:C.border,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min(a.pct,100)}%`,background:a.pct>=90?C.coral:C.gold,borderRadius:999}}/>
                </div>
                <span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:a.pct>=90?C.coral:C.gold,minWidth:32}}>{a.pct.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{...card,marginBottom:10,padding:"20px 22px",background:isDark?"linear-gradient(135deg,#1a2540,#0f1a32)":"linear-gradient(135deg,#1A2151,#3D4E7A)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
        <div style={{position:"absolute",right:20,bottom:-30,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.03)"}}/>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:1,marginBottom:6}}>TOTAL BALANCE</div>
        <div style={{fontFamily:MONO,fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-0.5,marginBottom:14}}>
          {useContext(HiddenCtx)?<span style={{filter:"blur(10px)"}}>Rp ●●●●●●●</span>:rp(totalBal)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"rgba(52,211,153,0.15)",borderRadius:12,padding:"10px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:600,marginBottom:4}}>Income</div>
            <AmtK v={income} color="#34D399" size={14} w={800}/>
          </div>
          <div style={{background:"rgba(248,113,113,0.15)",borderRadius:12,padding:"10px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:600,marginBottom:4}}>Expense</div>
            <AmtK v={expense} color="#F87171" size={14} w={800}/>
          </div>
        </div>
      </div>

      {/* Net Savings + saving rate */}
      <div style={{...card,padding:"18px 20px",marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:6}}>Net Savings</div>
            <Amt v={saving} color={saving>=0?C.mintD:C.coral} size={22} w={900}/>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:2}}>Saving Rate</div>
            <div style={{fontFamily:MONO,fontSize:26,fontWeight:900,color:savePct>=target?C.lavender:C.coral,lineHeight:1}}>{savePct.toFixed(0)}%</div>
            <div style={{fontSize:10,color:C.muted,marginTop:1}}>Target {target}%</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={40}>
          <BarChart data={months6} margin={{top:0,right:0,bottom:0,left:0}}>
            <Bar dataKey="sav" radius={[3,3,0,0]} maxBarSize={22}>
              {months6.map((m,i)=><Cell key={i} fill={m.sav>=0?`${C.lavender}60`:`${C.coral}60`}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Projection */}
      {isCurMonth&&income>0&&(
        <div style={{...cardSm,padding:"12px 16px",marginBottom:10,borderLeft:`3px solid ${projSav>=0?C.mint:C.coral}`,background:projSav>=0?isDark?"#0d2018":"#F0FDF4":isDark?"#200d0d":"#FFF5F5"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:8}}>📈 PROJECTION · {daysLeft} days left</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[{l:"Est. Expense",v:projExp,c:C.coral},{l:"Est. Savings",v:projSav,c:projSav>=0?C.mintD:C.coral},{l:"Daily Avg",v:Math.round(dailyRate),c:C.gold}].map(({l,v,c})=>(
              <div key={l}><div style={{fontSize:9,color:C.muted,marginBottom:2}}>{l}</div><AmtK v={v} color={c} size={12}/></div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Bills */}
      {upcoming.length>0&&(
        <div style={{...card,padding:"14px 18px",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:10}}>🔔 Upcoming Bills</div>
          {upcoming.map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:`${C.coral}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                  {catIcon(r.category)}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{r.description}</div>
                  <div style={{fontSize:11,color:r.daysLeft===0?C.coral:C.muted}}>
                    {r.daysLeft===0?"Due today!":r.daysLeft===1?"Due tomorrow":`In ${r.daysLeft} days`}
                  </div>
                </div>
              </div>
              <AmtK v={r.amount} color={C.coral} size={13} w={800}/>
            </div>
          ))}
        </div>
      )}

      {/* Budget Alerts */}
      {alerts.length>0&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:700,color:C.navyMid,marginBottom:8}}>⚠️ Budget Alerts</div>
          {alerts.map(a=>(
            <div key={a.cat} style={{...cardSm,padding:"12px 16px",marginBottom:8,
              background:a.pct>=100?"linear-gradient(135deg,#7C3AED,#8B5CF6)":`${C.gold}15`,
              color:a.pct>=100?"#fff":C.navy,border:a.pct>=100?"none":`1px solid ${C.gold}30`,position:"relative",overflow:"hidden"}}>
              {a.pct>=100&&<div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:20,opacity:.15}}>✦</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{catIcon(a.cat)} {a.cat}</div>
                  <div style={{fontSize:11,opacity:.8,color:a.pct>=100?"rgba(255,255,255,0.8)":C.muted,fontFamily:MONO,marginTop:2}}>{rpK(a.spent)} / {rpK(a.bud)}</div>
                </div>
                <div style={{fontFamily:MONO,fontSize:20,fontWeight:900,color:a.pct>=100?"#fff":C.gold}}>{a.pct.toFixed(0)}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <YearlySummary data={data}/>

      {/* Goals Widget */}
      {activeGoals.length>0&&(
        <div style={{...card,padding:"14px 18px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.navy}}>🏆 Goals Progress</div>
            <span style={{fontSize:11,color:C.muted}}>{(data.goals||[]).length} total</span>
          </div>
          {activeGoals.map(g=>{
            const pct=g.target>0?Math.min((g.saved/g.target)*100,100):0;
            const left=Math.max(g.target-g.saved,0);
            return(
              <div key={g.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.navy}}>{g.name}</span>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.lavender}}>{pct.toFixed(0)}%</span>
                    {g.deadline&&<span style={{fontSize:10,color:C.muted,marginLeft:6}}>🗓 {fmtDate(g.deadline)}</span>}
                  </div>
                </div>
                <BarFill pct={pct} color={C.lavender} h={8}/>
                <div style={{fontSize:10,color:C.muted,marginTop:3}}>{rpK(g.saved)} / {rpK(g.target)} · {rpK(left)} to go</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Transactions */}
      <div style={{...card,padding:"16px 18px",marginBottom:80}}>
        <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:14}}>Recent Transactions</div>
        {txs.length===0&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:32,marginBottom:8}}>📭</div>
            <div style={{color:C.muted,fontSize:13,fontWeight:600}}>No transactions yet</div>
            <div style={{color:C.faded,fontSize:12,marginTop:3}}>Tap ＋ below to add one</div>
          </div>
        )}
        {[...txs].reverse().slice(0,6).map((t,i,arr)=>(
          <div key={t.id} style={{display:"flex",gap:12,alignItems:"center",paddingBottom:i<arr.length-1?12:0,marginBottom:i<arr.length-1?12:0,borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:40,height:40,borderRadius:12,flexShrink:0,
              background:t.type==="income"?`${C.mint}20`:t.type==="transfer"?`${C.lavender}18`:`${CAT_COLOR[t.category]||C.coral}15`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
              {t.type==="income"?"↑":t.type==="transfer"?"⇄":catIcon(t.category)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:C.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:1}}>{fmtDate(t.date)}</div>
            </div>
            <span style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:t.type==="income"?C.mintD:t.type==="transfer"?C.lavender:C.coral,flexShrink:0}}>
              {t.type==="income"?"+":t.type==="transfer"?"⇄":"-"}{rpK(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CUSTOM DATE PICKER ───────────────────────────────────────────────────────
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTH_NAMES_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function DatePicker({value, onChange, style={}}){
  const C=useTheme();
  const inp=mkInp(C);
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const now=new Date();
  const [viewY,setViewY]=useState(value?+value.split("-")[0]:now.getFullYear());
  const [viewM,setViewM]=useState(value?+value.split("-")[1]-1:now.getMonth());
  useEffect(()=>{if(!open)return;const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);},[open]);
  const cells=(()=>{const first=new Date(viewY,viewM,1).getDay();const days=new Date(viewY,viewM+1,0).getDate();const rows=[];for(let i=0;i<first;i++)rows.push({day:null,cur:false});for(let d=1;d<=days;d++)rows.push({day:d,cur:true});return rows;})();
  const isSel=d=>d.cur&&value===`${viewY}-${String(viewM+1).padStart(2,"0")}-${String(d.day).padStart(2,"0")}`;
  const isToday=d=>{const t=new Date();return d.cur&&d.day===t.getDate()&&viewM===t.getMonth()&&viewY===t.getFullYear();};
  const pick=d=>{if(!d.cur)return;const s=`${viewY}-${String(viewM+1).padStart(2,"0")}-${String(d.day).padStart(2,"0")}`;onChange(s);setOpen(false);};
  const prevMonth=()=>{if(viewM===0){setViewM(11);setViewY(y=>y-1);}else setViewM(m=>m-1);};
  const nextMonth=()=>{if(viewM===11){setViewM(0);setViewY(y=>y+1);}else setViewM(m=>m+1);};
  const displayVal=value?fmtDate(value):"Select date";
  return(
    <div ref={ref} style={{position:"relative",...style}}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{...inp,border:`1.5px solid ${open?C.mintD:C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",padding:"13px 16px"}}>
        <span style={{fontSize:15,fontWeight:600,color:value?C.navy:C.muted,fontFamily:"inherit"}}>{displayVal}</span>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={open?C.mintD:C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,right:0,zIndex:999,background:C.bgCard,borderRadius:20,boxShadow:C.shadowLg,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px 12px",borderBottom:`1px solid ${C.border}`}}>
            <button onClick={prevMonth} style={{background:"none",border:"none",cursor:"pointer",borderRadius:8,padding:"4px 8px",color:C.navy,lineHeight:1}}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth={2.5} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{fontSize:15,fontWeight:800,color:C.navy,letterSpacing:-0.3}}>{MONTH_NAMES_FULL[viewM]} {viewY}</span>
            <button onClick={nextMonth} style={{background:"none",border:"none",cursor:"pointer",borderRadius:8,padding:"4px 8px",color:C.navy,lineHeight:1}}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth={2.5} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"10px 12px 4px",gap:2}}>
            {DAY_NAMES.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.muted,padding:"2px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 12px 12px",gap:2}}>
            {cells.map((d,i)=>{
              const sel=isSel(d),tod=isToday(d);
              return(
                <button key={i} onClick={()=>pick(d)} type="button" style={{border:"none",cursor:d.cur?"pointer":"default",borderRadius:10,padding:"8px 0",fontSize:13,fontWeight:sel?800:tod?700:d.cur?500:400,
                  background:sel?C.mintD:tod?`${C.mintD}18`:"transparent",color:sel?"#fff":tod?C.mintD:d.cur?C.navy:C.faded,
                  outline:sel?`2px solid ${C.mintD}`:tod&&!sel?`1.5px solid ${C.mintD}`:"none",outlineOffset:sel?0:1,transition:"all .12s",lineHeight:1}}>
                  {d.day}
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 18px 14px",borderTop:`1px solid ${C.border}`}}>
            <button onClick={()=>{onChange("");setOpen(false);}} type="button" style={{background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:C.muted,padding:"4px 8px",borderRadius:8}}>Clear</button>
            <button onClick={()=>{const t=todayFn();onChange(t);setOpen(false);}} type="button" style={{background:`${C.mintD}15`,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:C.mintD,padding:"4px 14px",borderRadius:8}}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CUSTOM SELECT ────────────────────────────────────────────────────────────
function CustomSelect({value, onChange, options, placeholder="Select...", style={}}){
  const C=useTheme();
  const inp=mkInp(C);
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const sel=options.find(o=>(o.value||o)===value);
  useEffect(()=>{if(!open)return;const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);},[open]);
  const getLabel=o=>typeof o==="string"?o:o.label;
  const getVal=o=>typeof o==="string"?o:o.value;
  const getIcon=o=>typeof o==="string"?null:o.icon;
  const display=sel?(
    <span style={{display:"flex",alignItems:"center",gap:10,fontSize:14,fontWeight:600,color:C.navy}}>
      {getIcon(sel)&&<span style={{fontSize:18,lineHeight:1}}>{getIcon(sel)}</span>}
      {getLabel(sel)}
    </span>
  ):<span style={{fontSize:14,color:C.muted}}>{placeholder}</span>;
  return(
    <div ref={ref} style={{position:"relative",...style}}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{...inp,border:`1.5px solid ${open?C.mintD:C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",padding:"13px 16px"}}>
        {display}
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={open?C.mintD:C.muted} strokeWidth={2.5} strokeLinecap="round"><polyline points={open?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:1000,background:C.bgCard,borderRadius:20,boxShadow:C.shadowLg,border:`1.5px solid ${C.border}`,overflow:"hidden",maxHeight:280,overflowY:"auto"}}>
          {options.map((o,i)=>{
            const v=getVal(o),l=getLabel(o),ic=getIcon(o),isSel=v===value;
            return(
              <button key={i} type="button" onClick={()=>{onChange(v);setOpen(false);}} style={{width:"100%",background:isSel?`${C.mintD}12`:"transparent",border:"none",padding:"13px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left",borderBottom:i<options.length-1?`1px solid ${C.border}`:"none",transition:"background .12s"}}>
                {ic&&<span style={{width:36,height:36,borderRadius:10,flexShrink:0,background:isSel?`${C.mintD}15`:C.inpBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{ic}</span>}
                <span style={{fontSize:14,fontWeight:isSel?700:500,color:isSel?C.mintD:C.navy,flex:1}}>{l}</span>
                {isSel&&<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.mintD} strokeWidth={2.8} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADD TRANSACTION ─────────────────────────────────────────────────────────
function InputForm({data,updateData}){
  const C=useTheme();
  const card=mkCard(C),inp=mkInp(C);
  const [mode,setMode]=useState("expense");
  const [isRec,setIsRec]=useState(false);
  const [recDay,setRecDay]=useState(1);
  const wallets=data.wallets||DEFAULT_WALLETS;
  const cats=mode==="expense"?EXPENSE_CATS:INCOME_CATS;
  const [form,setForm]=useState({date:todayFn(),description:"",category:EXPENSE_CATS[0],amount:"",wallet:wallets[0],toWallet:wallets[1]||wallets[0],notes:""});
  const [ok,setOk]=useState(false);
  const fmt=v=>{const n=v.replace(/\D/g,"");return n?parseInt(n).toLocaleString("id-ID"):"";};
  const QUICK_AMTS=[10000,25000,50000,100000,200000,500000];
  const addAmt=a=>{const cur=parseInt((form.amount||"0").replace(/\D/g,""))||0;setForm(f=>({...f,amount:(cur+a).toLocaleString("id-ID")}));};
  const submit=()=>{
    if(!form.amount)return;
    const amount=parseInt(form.amount.replace(/\D/g,""));if(!amount)return;
    if(mode==="transfer"){
      if(form.wallet===form.toWallet)return;
      updateData({...data,transactions:[...data.transactions,{id:uid(),date:form.date,description:`Transfer: ${form.wallet} → ${form.toWallet}`,category:"Transfer",amount,type:"transfer",wallet:form.wallet,toWallet:form.toWallet,notes:form.notes}]});
    }else{
      if(!form.description)return;
      let nd={...data,transactions:[...data.transactions,{id:uid(),date:form.date,description:form.description,category:form.category,amount,type:mode,wallet:form.wallet,notes:form.notes}]};
      if(isRec)nd={...nd,recurring:[...(nd.recurring||[]),{id:uid(),description:form.description,category:form.category,amount,type:mode,wallet:form.wallet,frequency:"monthly",dayOfMonth:recDay,active:true,lastApplied:mkKey(form.date)}]};
      updateData(nd);
    }
    setForm({date:todayFn(),description:"",category:cats[0],amount:"",wallet:wallets[0],toWallet:wallets[1]||wallets[0],notes:""});
    setIsRec(false);setOk(true);setTimeout(()=>setOk(false),2000);
  };
  const MODES=[{id:"expense",l:"Expense"},{id:"income",l:"Income"},{id:"transfer",l:"Transfer"}];
  const modeColor={expense:C.coral,income:C.mint,transfer:C.lavender};
  return(
    <div style={{padding:"16px 16px 100px"}}>
      <div style={{fontSize:20,fontWeight:900,color:C.navy,marginBottom:20,letterSpacing:-0.5}}>Add Transaction</div>
      {/* Mode pills */}
      <div style={{display:"flex",background:C.inpBg,borderRadius:14,padding:4,marginBottom:22,gap:4,border:`1px solid ${C.border}`}}>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>{setMode(m.id);setForm(f=>({...f,category:m.id==="expense"?EXPENSE_CATS[0]:INCOME_CATS[0]}));}}
            style={{flex:1,padding:"10px 0",borderRadius:11,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,transition:"all .2s",
              background:mode===m.id?(m.id==="expense"?"linear-gradient(135deg,#FCA5A5,#F87171)":m.id==="income"?"linear-gradient(135deg,#6EE7B7,#34D399)":"linear-gradient(135deg,#C4B5FD,#8B5CF6)"):"transparent",
              color:mode===m.id?"#fff":C.muted,boxShadow:mode===m.id?"0 4px 12px rgba(0,0,0,0.15)":"none"}}>
            {m.l}
          </button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <FL label="Date"><DatePicker value={form.date} onChange={v=>setForm(f=>({...f,date:v}))}/></FL>
        {mode==="transfer"?(
          <div style={{...card,padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.lavender,marginBottom:14}}>⇄ Wallet Transfer</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"end"}}>
              <FL label="From"><CustomSelect value={form.wallet} onChange={v=>setForm(f=>({...f,wallet:v}))} options={wallets.map(w=>({value:w,label:w,icon:wEmoji(w)}))}/></FL>
              <div style={{paddingBottom:4,fontSize:20,color:C.lavender,textAlign:"center"}}>→</div>
              <FL label="To"><CustomSelect value={form.toWallet} onChange={v=>setForm(f=>({...f,toWallet:v}))} options={wallets.filter(w=>w!==form.wallet).map(w=>({value:w,label:w,icon:wEmoji(w)}))}/></FL>
            </div>
          </div>
        ):(
          <>
            <FL label="Description">
              <input type="text" placeholder="e.g. Lunch, Salary, Grab..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={inp}/>
            </FL>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FL label="Category">
                <CustomSelect value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} options={(mode==="expense"?EXPENSE_CATS:INCOME_CATS).map(c=>({value:c,label:c,icon:catIcon(c)}))}/>
              </FL>
              <FL label="Wallet">
                <CustomSelect value={form.wallet} onChange={v=>setForm(f=>({...f,wallet:v}))} options={wallets.map(w=>({value:w,label:w,icon:wEmoji(w)}))}/>
              </FL>
            </div>
          </>
        )}
        {/* Amount field */}
        <FL label={mode==="transfer"?"Amount (IDR)":"Amount (IDR)"}>
          <input type="text" inputMode="numeric" placeholder="0" value={form.amount}
            onChange={e=>setForm(f=>({...f,amount:fmt(e.target.value)}))}
            style={{...inp,fontSize:22,fontWeight:800,color:modeColor[mode],fontFamily:MONO,textAlign:"center"}}/>
          {/* Quick amount presets */}
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            {QUICK_AMTS.map(a=>(
              <button key={a} onClick={()=>addAmt(a)} style={{background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 12px",color:C.navyMid,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:MONO,flexGrow:1}}>
                +{rpK(a)}
              </button>
            ))}
            <button onClick={()=>setForm(f=>({...f,amount:""}))} style={{background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 12px",color:C.coral,fontSize:11,fontWeight:700,cursor:"pointer",flexGrow:1}}>
              Clear
            </button>
          </div>
        </FL>
        {/* Recurring toggle */}
        {mode!=="transfer"&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:C.inpBg,borderRadius:14,border:`1px solid ${isRec?C.mint:C.border}`}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.navy}}>🔄 Recurring</div>
              {isRec&&<div style={{fontSize:11,color:C.muted,marginTop:3}}>Auto-add every month on day {recDay}</div>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {isRec&&<input type="number" min={1} max={28} value={recDay} onChange={e=>setRecDay(+e.target.value)} style={{...inp,width:56,padding:"6px 10px",textAlign:"center",fontSize:14,fontWeight:700}}/>}
              <button onClick={()=>setIsRec(r=>!r)} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:isRec?C.mint:C.border,position:"relative",transition:"background .2s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isRec?23:3,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
              </button>
            </div>
          </div>
        )}
        <FL label="Notes (optional)">
          <input type="text" placeholder="e.g. Bayar ke siapa, keperluan apa..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{...inp,fontSize:13}}/>
        </FL>
        <button onClick={submit} style={{background:ok?C.mint:mode==="expense"?`linear-gradient(135deg,#F87171,#EF4444)`:mode==="income"?`linear-gradient(135deg,${C.mint},${C.mintD})`:`linear-gradient(135deg,${C.lavender},${C.purple})`,border:"none",borderRadius:18,padding:"18px 0",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",width:"100%",boxShadow:ok?`0 6px 20px ${C.mint}40`:"0 6px 20px rgba(0,0,0,0.2)",transition:"all .3s"}}>
          {ok?"✓ Saved!":mode==="expense"?"Save Expense":mode==="income"?"Save Income":"Transfer"}
        </button>
      </div>
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function Transactions({txs,data,updateData}){
  const C=useTheme();
  const card=mkCard(C),cardSm=mkCardSm(C),inp=mkInp(C);
  const wallets=data.wallets||DEFAULT_WALLETS;
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [walletF,setWalletF]=useState("all");
  const [editTx,setEditTx]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [confirmId,setConfirmId]=useState(null);
  const sorted=[...txs].sort((a,b)=>b.date.localeCompare(a.date));
  const list=sorted.filter(t=>{
    if(filter!=="all"&&t.type!==filter)return false;
    if(walletF!=="all"&&t.wallet!==walletF&&t.toWallet!==walletF)return false;
    if(search){const q=search.toLowerCase();return t.description?.toLowerCase().includes(q)||t.category?.toLowerCase().includes(q)||t.amount?.toString().includes(q);}
    return true;
  });
  const fmtE=v=>{const n=v.replace(/\D/g,"");return n?parseInt(n).toLocaleString("id-ID"):"";};
  const startEdit=t=>{setEditTx(t);setEditForm({description:t.description,amount:t.amount.toLocaleString("id-ID"),date:t.date,notes:t.notes||""});};
  const saveEdit=()=>{
    const amount=parseInt(editForm.amount.replace(/\D/g,""));if(!amount)return;
    updateData({...data,transactions:data.transactions.map(t=>t.id===editTx.id?{...t,...editForm,amount}:t)});
    setEditTx(null);
  };
  const del=id=>{updateData({...data,transactions:data.transactions.filter(t=>t.id!==id)});setConfirmId(null);};
  const inpE={...inp,fontSize:14,padding:"10px 14px"};
  return(
    <div style={{padding:"16px 14px 100px"}}>
      {/* Edit Modal */}
      {editTx&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"flex-end"}} onClick={()=>{if(window.confirm("Discard changes?"))setEditTx(null);}}>
          <div style={{...card,borderRadius:"24px 24px 0 0",padding:"20px 20px 34px",width:"100%",maxWidth:480,margin:"0 auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:16}}>✏️ Edit Transaction</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:5}}>DATE</div><DatePicker value={editForm.date} onChange={v=>setEditForm(f=>({...f,date:v}))}/></div>
              <div><div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:5}}>DESCRIPTION</div><input type="text" value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} style={inpE}/></div>
              <div><div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:5}}>AMOUNT (IDR)</div><input type="text" inputMode="numeric" value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:fmtE(e.target.value)}))} style={{...inpE,fontFamily:MONO,fontWeight:700,color:C.coral}}/></div>
              <div><div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:5}}>NOTES (optional)</div><input type="text" placeholder="Catatan tambahan..." value={editForm.notes||""} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} style={inpE}/></div>
            </div>
            <div style={{display:"flex",gap:9,marginTop:16}}>
              <button onClick={()=>setEditTx(null)} style={{flex:1,background:C.border,border:"none",borderRadius:14,padding:"14px 0",color:C.muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveEdit} style={{flex:2,background:`linear-gradient(135deg,${C.mint},${C.mintD})`,border:"none",borderRadius:14,padding:"14px 0",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:`0 6px 20px ${C.mint}40`}}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      <div style={{fontSize:20,fontWeight:900,color:C.navy,marginBottom:16,letterSpacing:-0.5}}>Transactions</div>
      {/* Search */}
      <div style={{position:"relative",marginBottom:12}}>
        <svg style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search description or category..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,paddingLeft:42,fontSize:13}}/>
      </div>
      <div style={{display:"flex",gap:7,marginBottom:8,overflowX:"auto",paddingBottom:4}}>
        {["all","income","expense","transfer"].map(f=><Chip key={f} active={filter===f} onClick={()=>setFilter(f)} col={C.mintD}>{f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}</Chip>)}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        <Chip active={walletF==="all"} onClick={()=>setWalletF("all")} col={C.blue}>All Wallets</Chip>
        {wallets.map(w=><Chip key={w} active={walletF===w} onClick={()=>setWalletF(w)} col={C.blue}>{wEmoji(w)} {w}</Chip>)}
      </div>
      {list.length===0&&<div style={{textAlign:"center",padding:"48px 0"}}><div style={{fontSize:40,marginBottom:10}}>🔍</div><div style={{color:C.muted,fontSize:14,fontWeight:600}}>No results</div></div>}
      {list.map((t)=>(
        <div key={t.id} style={{...cardSm,padding:"13px 14px",marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:42,height:42,borderRadius:13,flexShrink:0,background:t.type==="income"?`${C.mint}20`:t.type==="transfer"?`${C.lavender}15`:`${CAT_COLOR[t.category]||C.coral}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:t.type!=="expense"?14:19}}>
            {t.type==="income"?"↑":t.type==="transfer"?"⇄":catIcon(t.category)}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:C.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}{t.recurringId&&<span style={{fontSize:10,color:C.mint,marginLeft:5}}>🔄</span>}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>{t.category} · {fmtDate(t.date)}{t.notes?` · 📝 ${t.notes}`:""}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <span style={{fontFamily:MONO,fontWeight:800,color:t.type==="income"?C.mintD:t.type==="transfer"?C.lavender:C.coral,fontSize:13}}>
              {t.type==="income"?"+":t.type==="transfer"?"⇄":"-"}{rpK(t.amount)}
            </span>
            <div style={{display:"flex",gap:5,marginTop:5,justifyContent:"flex-end"}}>
              {confirmId===t.id
                ?<><button onClick={()=>del(t.id)} style={{background:`${C.coral}15`,border:"none",borderRadius:6,padding:"3px 8px",color:C.coral,fontSize:10,cursor:"pointer",fontWeight:700}}>Delete</button><button onClick={()=>setConfirmId(null)} style={{background:C.border,border:"none",borderRadius:6,padding:"3px 8px",color:C.muted,fontSize:10,cursor:"pointer"}}>Cancel</button></>
                :<><button onClick={()=>startEdit(t)} style={{background:`${C.blue}10`,border:"none",borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={()=>setConfirmId(t.id)} style={{background:`${C.coral}10`,border:"none",borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  </button>
                </>
              }
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
function AIChat({data,txs,income,expense,saving,savePct,selectedMonth}){
  const C=useTheme();
  const [msgs,setMsgs]=useState([{role:"assistant",content:"👋 Hi!\nI'm your personal finance assistant.\nAsk me anything — spending analysis, saving tips, or projections!",isIntro:true}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const chatRef=useRef(null);
  const buildCtx=()=>{
    const now=new Date();
    const months6=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return mkKey(d);});
    const trend=months6.map(m=>{const mt=data.transactions.filter(t=>mkKey(t.date)===m);return{month:m,income:mt.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),expense:mt.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)};});
    const txList=txs.map(t=>`${t.date}: ${t.description} (${t.category}) ${t.type==="income"?"+":"-"}Rp${t.amount.toLocaleString()}`).join("\n");
    return`You are a smart personal finance assistant.\nMonth: ${mkLbl(selectedMonth)}\nIncome: ${rp(income)} | Expenses: ${rp(expense)} | Net: ${rp(saving)} (${savePct.toFixed(1)}%)\nTargets: Savings ${data.settings?.savingsTarget||60}% | Max Expense ${data.settings?.expenseMax||40}%\n\nThis month:\n${txList||"(none)"}\n\n6-month trend:\n${trend.map(t=>`${t.month}: In ${rpK(t.income)}, Out ${rpK(t.expense)}`).join("\n")}\n\nBudgets:\n${Object.entries(data.budgets||{}).map(([k,v])=>`${k}: ${rp(v)}`).join("\n")}\n\nReply in English, concise, mobile-friendly.`;
  };
  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input.trim()};
    const newMsgs=[...msgs,userMsg];
    setMsgs(newMsgs);setInput("");setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:buildCtx(),messages:newMsgs.filter(m=>!m.isIntro).map(m=>({role:m.role,content:m.content}))})});
      const d=await res.json();
      setMsgs(p=>[...p,{role:"assistant",content:d.content?.[0]?.text||"Sorry, something went wrong."}]);
    }catch(e){setMsgs(p=>[...p,{role:"assistant",content:"⚠️ Connection failed. Try again."}]);}
    finally{setLoading(false);setTimeout(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},100);}
  };
  const QUICK=["Analyze my spending this month","Where am I overspending?","How to save more?","Will I hit my target?","Compare with last month"];
  const DA="#10172A",DA2="#1E2D4A",DA3="#263554";
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)",background:`linear-gradient(180deg,${DA} 0%,${DA2} 100%)`,margin:"-1px -1px 0",borderRadius:"20px 20px 0 0",overflow:"hidden"}}>
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#7C3AED,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 14px rgba(124,58,237,0.4)"}}>
            <svg width={28} height={28} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="24" y1="3" x2="24" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="24" cy="2.5" r="2" fill="#34D399"/>
              <rect x="11" y="9" width="26" height="19" rx="5" fill="white" opacity=".95"/>
              <rect x="16" y="14" width="5" height="5" rx="2" fill="#34D399"/>
              <rect x="27" y="14" width="5" height="5" rx="2" fill="#34D399"/>
              <rect x="17.5" y="15.5" width="2" height="2" rx="1" fill="white" opacity=".8"/>
              <rect x="28.5" y="15.5" width="2" height="2" rx="1" fill="white" opacity=".8"/>
              <rect x="17" y="22" width="14" height="3" rx="1.5" fill="#E0E7FF"/>
              <rect x="18" y="23" width="3" height="1" rx=".5" fill="#7C3AED"/>
              <rect x="22" y="23" width="3" height="1" rx=".5" fill="#34D399"/>
              <rect x="26" y="23" width="3" height="1" rx=".5" fill="#7C3AED"/>
              <circle cx="11" cy="17" r="2.5" fill="#C4B5FD"/>
              <circle cx="37" cy="17" r="2.5" fill="#C4B5FD"/>
              <ellipse cx="24" cy="39" rx="12" ry="10" fill="white" opacity=".9"/>
              <path d="M13 30 Q18.5 27 24 28 Q29.5 27 35 30 L35 34 Q29.5 31 24 32 Q18.5 31 13 34Z" fill="#34D399"/>
              <ellipse cx="13" cy="37" rx="3" ry="7" fill="white" opacity=".85" transform="rotate(-15 13 37)"/>
              <ellipse cx="35" cy="37" rx="3" ry="7" fill="white" opacity=".85" transform="rotate(15 35 37)"/>
              <ellipse cx="19" cy="47" rx="5" ry="2.2" fill="#F97316"/>
              <ellipse cx="29" cy="47" rx="5" ry="2.2" fill="#F97316"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:"#fff",letterSpacing:-0.5}}>AI Financial Advisor</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:1}}>Powered by Claude AI</div>
          </div>
        </div>
      </div>
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"16px 16px 8px",display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{maxWidth:"86%",alignSelf:m.role==="user"?"flex-end":"flex-start",
            background:m.role==="user"?"linear-gradient(135deg,#7C3AED,#8B5CF6)":DA3,
            border:`1px solid ${m.role==="user"?"transparent":"rgba(255,255,255,0.08)"}`,
            borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
            padding:"12px 16px",fontSize:13,lineHeight:1.6,color:"rgba(255,255,255,0.92)",
            whiteSpace:"pre-wrap",boxShadow:"0 2px 12px rgba(0,0,0,0.25)"}}>
            {m.content}
          </div>
        ))}
        {loading&&(
          <div style={{alignSelf:"flex-start",background:DA3,borderRadius:"18px 18px 18px 4px",padding:"12px 18px",display:"flex",gap:6}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.lavender,animation:`pulse 1s infinite ${i*0.22}s`}}/>)}
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:7,padding:"8px 16px",overflowX:"auto",flexWrap:"nowrap"}}>
        {QUICK.map(q=><button key={q} onClick={()=>setInput(q)} style={{background:DA3,border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"7px 13px",color:"rgba(255,255,255,0.75)",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{q}</button>)}
      </div>
      <div style={{display:"flex",gap:9,padding:"8px 16px 20px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Ask about your finances..."
          style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"12px 16px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={!input.trim()||loading}
          style={{background:input.trim()&&!loading?"linear-gradient(135deg,#7C3AED,#8B5CF6)":"rgba(255,255,255,0.08)",border:"none",borderRadius:14,padding:"0 16px",color:"#fff",fontWeight:900,cursor:"pointer",fontSize:20,opacity:!input.trim()||loading?.4:1,transition:"all .2s"}}>↑</button>
      </div>
    </div>
  );
}

// ─── REPORT PAGE ─────────────────────────────────────────────────────────────
function ReportPage({data,txs,income,expense,saving,selectedMonth}){
  const C=useTheme();
  const card=mkCard(C),cardSm=mkCardSm(C);
  const [shared,setShared]=useState(false);
  const now=new Date();
  const months6=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return mkKey(d);});
  const trend=months6.map(m=>{const mt=data.transactions.filter(t=>mkKey(t.date)===m);const inc=mt.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);const exp=mt.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);const[,mo]=m.split("-");return{month:MONTH_S[+mo-1],inc,exp,sav:inc-exp};});
  const bycat={};txs.filter(t=>t.type==="expense").forEach(t=>{bycat[t.category]=(bycat[t.category]||0)+t.amount;});
  const cats=Object.entries(bycat).sort((a,b)=>b[1]-a[1]);
  const savePct=income>0?(saving/income*100):0;
  const shareText=`📊 PinqFlow Report — ${mkLbl(selectedMonth)}\n\n💚 Income: ${rp(income)}\n🔴 Expense: ${rp(expense)}\n💰 Net Savings: ${rp(saving)} (${savePct.toFixed(0)}%)\n\nTop Expenses:\n${cats.slice(0,3).map(([c,a])=>`  ${catIcon(c)} ${c}: ${rpK(a)}`).join("\n")}\n\n#PinqFlow 🐧`;
  const handleShare=()=>{
    if(navigator.share){navigator.share({title:"PinqFlow Report",text:shareText}).catch(()=>{});}
    else{navigator.clipboard.writeText(shareText).then(()=>{setShared(true);setTimeout(()=>setShared(false),2000);});}
  };
  return(
    <div>
      <div style={{...card,padding:"16px 18px",marginBottom:12}}>
        {[{l:"Total Income",v:income,c:C.mintD},{l:"Total Expenses",v:expense,c:C.coral},{l:"Net Savings",v:saving,c:saving>=0?C.gold:C.coral}].map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:13,color:C.muted}}>{r.l}</span><Amt v={r.v} color={r.c} size={14}/>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <button onClick={()=>exportCSV(txs,selectedMonth)} style={{...cardSm,display:"flex",justifyContent:"center",alignItems:"center",gap:8,padding:"13px 0",color:C.mintD,fontSize:13,fontWeight:700,cursor:"pointer",border:`1.5px solid ${C.mintD}30`,boxShadow:"none"}}>
          📥 Export CSV
        </button>
        <button onClick={handleShare} style={{...cardSm,display:"flex",justifyContent:"center",alignItems:"center",gap:8,padding:"13px 0",color:C.lavender,fontSize:13,fontWeight:700,cursor:"pointer",border:`1.5px solid ${C.lavender}30`,boxShadow:"none"}}>
          {shared?"✓ Copied!":"🔗 Share"}
        </button>
      </div>
      <div style={{...card,padding:"16px 18px",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:12}}>6-Month Trend</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trend} margin={{top:4,right:4,bottom:0,left:0}}>
            <XAxis dataKey="month" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:C.muted}} tickFormatter={v=>rpK(v)} width={50} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v=>rp(v)} contentStyle={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12,color:C.navy}}/>
            <Bar dataKey="inc" fill={`${C.mint}99`} radius={[5,5,0,0]} name="Income" maxBarSize={18}/>
            <Bar dataKey="exp" fill={`${C.coral}88`} radius={[5,5,0,0]} name="Expense" maxBarSize={18}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...card,padding:"16px 18px",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:10}}>Savings Trend</div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={trend} margin={{top:4,right:4,bottom:0,left:0}}>
            <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.lavender} stopOpacity={0.3}/><stop offset="95%" stopColor={C.lavender} stopOpacity={0}/></linearGradient></defs>
            <XAxis dataKey="month" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:C.muted}} tickFormatter={v=>rpK(v)} width={50} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v=>rp(v)} contentStyle={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12,color:C.navy}}/>
            <Area type="monotone" dataKey="sav" stroke={C.lavender} strokeWidth={2.5} fill="url(#sg)" name="Savings"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {cats.length>0&&(
        <div style={{...card,padding:"16px 18px",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:14}}>By Category</div>
          {/* Donut chart */}
          {expense>0&&(
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={cats.slice(0,7).map(([c,a])=>({name:c,value:a,color:catC(c)}))} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" strokeWidth={0}>
                    {cats.slice(0,7).map(([c],i)=><Cell key={i} fill={catC(c,i)}/>)}
                  </Pie>
                  <Tooltip formatter={v=>rpK(v)} contentStyle={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,fontSize:11}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                {cats.slice(0,5).map(([cat,amt],i)=>(
                  <div key={cat} style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:8,height:8,borderRadius:2,background:catC(cat,i),flexShrink:0}}/>
                    <span style={{fontSize:10,color:C.navyMid,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{catIcon(cat)} {cat}</span>
                    <span style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:catC(cat,i),flexShrink:0}}>{expense>0?((amt/expense)*100).toFixed(0):0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {cats.slice(0,8).map(([cat,amt],i)=>(
            <div key={cat} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,color:C.navyMid,fontWeight:600}}>{catIcon(cat)} {cat}</span>
                <AmtK v={amt} color={catC(cat,i)} size={12}/>
              </div>
              <BarFill pct={expense>0?(amt/expense)*100:0} color={catC(cat,i)} h={5}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WALLET PAGE ──────────────────────────────────────────────────────────────
function WalletPage({data,updateData}){
  const C=useTheme();
  const card=mkCard(C),cardSm=mkCardSm(C),inp=mkInp(C);
  const [newW,setNewW]=useState("");
  const [ok,setOk]=useState(false);
  const wallets=data.wallets||DEFAULT_WALLETS;
  const allTxs=data.transactions;
  const add=()=>{
    if(!newW.trim()||wallets.includes(newW.trim()))return;
    updateData({...data,wallets:[...wallets,newW.trim()]});
    setNewW("");setOk(true);setTimeout(()=>setOk(false),1500);
  };
  const remove=w=>{
    if(DEFAULT_WALLETS.includes(w))return;
    updateData({...data,wallets:wallets.filter(x=>x!==w)});
  };
  const totalBal=wallets.reduce((s,w)=>s+walletBal(w,allTxs),0);
  return(
    <div>
      {/* Total balance */}
      <div style={{...card,padding:"18px 20px",marginBottom:16,background:"linear-gradient(135deg,#1A2151,#3D4E7A)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:1,marginBottom:6}}>TOTAL NET BALANCE</div>
        <div style={{fontFamily:MONO,fontSize:26,fontWeight:900,color:"#fff"}}>{rp(totalBal)}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>Across all {wallets.length} wallets</div>
      </div>
      {/* Per wallet */}
      {wallets.map((w,i)=>{
        const bal=walletBal(w,allTxs);
        const txCount=allTxs.filter(t=>t.wallet===w||t.toWallet===w).length;
        const isDefault=DEFAULT_WALLETS.includes(w);
        return(
          <div key={w} style={{...cardSm,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:14,background:bal>=0?`${C.mint}15`:`${C.coral}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
              {wEmoji(w)}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{w}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{txCount} transactions</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:MONO,fontSize:15,fontWeight:800,color:bal>=0?C.mintD:C.coral}}>{bal>=0?"+":""}{rp(bal)}</div>
              {!isDefault&&<button onClick={()=>remove(w)} style={{fontSize:10,color:C.coral,background:"none",border:"none",cursor:"pointer",padding:"2px 0",marginTop:2}}>Remove</button>}
            </div>
          </div>
        );
      })}
      <div style={{...card,padding:"16px 18px",marginTop:8}}>
        <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:12}}>Add Wallet</div>
        <div style={{display:"flex",gap:10}}>
          <input value={newW} onChange={e=>setNewW(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Wallet name..." style={{...inp,flex:1,padding:"11px 14px",fontSize:13}}/>
          <button onClick={add} style={{background:ok?C.mint:`linear-gradient(135deg,${C.mint},${C.mintD})`,border:"none",borderRadius:14,padding:"0 20px",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:13,transition:"background .3s"}}>{ok?"✓":"Add"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── RECURRING PAGE ───────────────────────────────────────────────────────────
function RecurringPage({data,updateData}){
  const C=useTheme();
  const card=mkCard(C),cardSm=mkCardSm(C);
  const recs=data.recurring||[];
  const toggle=id=>updateData({...data,recurring:recs.map(r=>r.id===id?{...r,active:!r.active}:r)});
  const del=id=>updateData({...data,recurring:recs.filter(r=>r.id!==id)});
  if(recs.length===0)return<div style={{textAlign:"center",padding:"48px 0"}}><div style={{fontSize:40,marginBottom:10}}>🔄</div><div style={{color:C.muted,fontSize:14,fontWeight:600}}>No recurring transactions yet</div><div style={{color:C.faded,fontSize:12,marginTop:3}}>Toggle "Recurring" when adding a transaction</div></div>;
  return(
    <div>
      {recs.map(r=>(
        <div key={r.id} style={{...cardSm,padding:"14px 16px",marginBottom:10,display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:r.type==="income"?`${C.mint}15`:`${C.coral}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
            {catIcon(r.category)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{r.description}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{r.category} · Day {r.dayOfMonth} · {wEmoji(r.wallet)} {r.wallet}</div>
          </div>
          <div style={{textAlign:"right",marginLeft:10}}>
            <Amt v={r.amount} color={r.type==="income"?C.mintD:C.coral} size={13}/>
            <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:6}}>
              <button onClick={()=>toggle(r.id)} style={{background:r.active?`${C.mint}15`:C.border,border:`1px solid ${r.active?C.mint:C.faded}`,borderRadius:8,padding:"4px 10px",color:r.active?C.mintD:C.muted,fontSize:11,cursor:"pointer",fontWeight:700}}>{r.active?"Active":"Off"}</button>
              <button onClick={()=>del(r.id)} style={{background:`${C.coral}12`,border:`1px solid ${C.coral}20`,borderRadius:8,padding:"4px 10px",color:C.coral,fontSize:11,cursor:"pointer"}}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── BUDGET PAGE ──────────────────────────────────────────────────────────────
function BudgetPage({data,updateData}){
  const C=useTheme();
  const card=mkCard(C),inp=mkInp(C);
  const [budgets,setBudgets]=useState({...data.budgets});
  const [savTarget,setSavTarget]=useState(data.settings?.savingsTarget??60);
  const [expMax,setExpMax]=useState(data.settings?.expenseMax??40);
  const [ok,setOk]=useState(false);
  const txs=data.transactions.filter(t=>mkKey(t.date)===mkKey(new Date()));
  const income=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const bycat={};txs.filter(t=>t.type==="expense").forEach(t=>{bycat[t.category]=(bycat[t.category]||0)+t.amount;});
  const save=()=>{updateData({...data,budgets,settings:{...data.settings,savingsTarget:savTarget,expenseMax:expMax}});setOk(true);setTimeout(()=>setOk(false),2000);};
  const unalloc=Math.max(0,100-savTarget-expMax);
  return(
    <div>
      <div style={{...card,padding:20,marginBottom:18}}>
        <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:16}}>🎯 Monthly Targets</div>
        {[{l:"💰 Savings Target",v:savTarget,c:C.mintD,set:(v)=>{setSavTarget(v);setExpMax(e=>Math.min(e,100-v));}},{l:"💸 Max Expense",v:expMax,c:C.coral,set:(v)=>{setExpMax(v);setSavTarget(s=>Math.min(s,100-v));}}].map(({l,v,c,set})=>(
          <div key={l} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <span style={{fontSize:12,color:C.muted,fontWeight:600}}>{l}</span>
              <span style={{fontFamily:MONO,fontSize:13,fontWeight:800,color:c}}>{v}%{income>0&&<span style={{fontWeight:500,color:C.muted}}> · {rpK(income*v/100)}</span>}</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={v} onChange={e=>set(+e.target.value)} style={{width:"100%",accentColor:c}}/>
          </div>
        ))}
        <div style={{display:"flex",borderRadius:999,overflow:"hidden",height:8,gap:2}}>
          <div style={{width:`${savTarget}%`,background:C.mint,borderRadius:999,transition:"width .3s"}}/>
          <div style={{width:`${expMax}%`,background:C.coral,borderRadius:999,transition:"width .3s"}}/>
          <div style={{flex:1,background:C.border,borderRadius:999}}/>
        </div>
        <div style={{display:"flex",gap:14,marginTop:8,fontSize:11,color:C.muted}}>
          <span style={{color:C.mintD,fontWeight:600}}>■ Savings {savTarget}%</span>
          <span style={{color:C.coral,fontWeight:600}}>■ Expense {expMax}%</span>
          {unalloc>0&&<span>■ Free {unalloc}%</span>}
        </div>
      </div>
      <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:14}}>BUDGET PER CATEGORY</div>
      {EXPENSE_CATS.map((cat,i)=>{const spent=bycat[cat]||0;const bud=budgets[cat]||0;const pct=bud>0?(spent/bud)*100:0;return(
        <div key={cat} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
            <span style={{color:C.navyMid,fontWeight:600}}>{catIcon(cat)} {cat}</span>
            {bud>0&&<span style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:pct>=100?C.coral:pct>=80?C.gold:C.mintD}}>{pct.toFixed(0)}%</span>}
          </div>
          {bud>0&&<div style={{marginBottom:6}}><BarFill pct={pct} color={pct>=100?C.coral:pct>=80?C.gold:catC(cat,i)}/></div>}
          <input type="text" inputMode="numeric" placeholder="No limit set" value={budgets[cat]?parseInt(budgets[cat]).toLocaleString("id-ID"):""} onChange={e=>{const v=parseInt(e.target.value.replace(/\D/g,""))||0;setBudgets(b=>({...b,[cat]:v}));}} style={{...inp,fontSize:13,padding:"9px 14px"}}/>
        </div>
      );})}
      <button onClick={save} style={{background:ok?C.mint:`linear-gradient(135deg,${C.mint},${C.mintD})`,border:"none",borderRadius:18,padding:"16px 0",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",width:"100%",marginTop:8,boxShadow:`0 6px 20px ${C.mint}40`}}>
        {ok?"✓ Saved!":"Save Settings"}
      </button>
    </div>
  );
}

// ─── GOALS PAGE (NEW) ─────────────────────────────────────────────────────────
function GoalsPage({data,updateData}){
  const C=useTheme();
  const card=mkCard(C),inp=mkInp(C);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({name:"",target:"",saved:"",deadline:""});
  const [addAmt,setAddAmt]=useState({});
  const goals=data.goals||[];
  const fmtN=v=>{const n=v.replace(/\D/g,"");return n?parseInt(n).toLocaleString("id-ID"):"";};
  const save=()=>{
    if(!form.name||!form.target)return;
    const target=parseInt(form.target.replace(/\D/g,""));
    const saved=parseInt(form.saved.replace(/\D/g,""))||0;
    if(!target)return;
    updateData({...data,goals:[...goals,{id:uid(),name:form.name,target,saved,deadline:form.deadline}]});
    setForm({name:"",target:"",saved:"",deadline:""});setAdding(false);
  };
  const addSavings=(id,rawAmt)=>{
    const amt=parseInt((rawAmt||"").toString().replace(/\D/g,""))||0;
    if(!amt)return;
    updateData({...data,goals:goals.map(g=>g.id===id?{...g,saved:Math.min(g.saved+amt,g.target)}:g)});
    setAddAmt(a=>({...a,[id]:""}));
  };
  const del=id=>updateData({...data,goals:goals.filter(g=>g.id!==id)});
  const TEMPLATES=[
    {name:"Dana Darurat 3 Bulan",target:15000000,emoji:"🛡️",desc:"3x pengeluaran bulanan"},
    {name:"Liburan",target:5000000,emoji:"✈️",desc:"Dana travel impian"},
    {name:"Gadget Baru",target:8000000,emoji:"📱",desc:"HP / laptop / earbuds"},
    {name:"Kendaraan",target:20000000,emoji:"🏍️",desc:"DP motor atau mobil"},
    {name:"Investasi Awal",target:1000000,emoji:"📈",desc:"Mulai reksa dana / saham"},
    {name:"Nikah / Resepsi",target:50000000,emoji:"💍",desc:"Dana pernikahan"},
  ];
  return(
    <div>
      {goals.length===0&&!adding&&(
        <div style={{marginBottom:16}}>
          <div style={{textAlign:"center",padding:"24px 0 16px"}}>
            <div style={{fontSize:40,marginBottom:8}}>🎯</div>
            <div style={{fontSize:15,fontWeight:700,color:C.navy,marginBottom:4}}>No goals yet</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Pilih template atau buat sendiri</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {TEMPLATES.map(t=>(
              <button key={t.name} onClick={()=>{setForm({name:t.name,target:t.target.toLocaleString("id-ID"),saved:"",deadline:""});setAdding(true);}}
                style={{...inp,cursor:"pointer",textAlign:"left",borderRadius:16,padding:"14px 14px",border:`1.5px solid ${C.border}`,background:C.inpBg,display:"block"}}>
                <div style={{fontSize:24,marginBottom:6}}>{t.emoji}</div>
                <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:2}}>{t.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{t.desc}</div>
                <div style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.mintD,marginTop:4}}>{rpK(t.target)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {goals.map(g=>{        const pct=g.target>0?Math.min((g.saved/g.target)*100,100):0;
        const left=Math.max(g.target-g.saved,0);
        const done=pct>=100;
        return(
          <div key={g.id} style={{...card,padding:"18px 18px",marginBottom:12,border:done?`1.5px solid ${C.mint}`:"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.navy,letterSpacing:-0.3}}>{done?"✅ ":""}{g.name}</div>
                {g.deadline&&<div style={{fontSize:11,color:C.muted,marginTop:3}}>🗓 Target: {fmtDate(g.deadline)}</div>}
              </div>
              <button onClick={()=>del(g.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"flex-end"}}>
              <div>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:2}}>SAVED</div>
                <AmtK v={g.saved} color={done?C.mintD:C.lavender} size={17} w={800}/>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:2}}>TARGET</div>
                <AmtK v={g.target} color={C.muted} size={13}/>
              </div>
            </div>
            <BarFill pct={pct} color={done?C.mint:C.lavender} h={10}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
              <span style={{fontSize:11,fontWeight:700,color:done?C.mintD:C.lavender}}>{pct.toFixed(0)}%</span>
              {!done&&<span style={{fontSize:11,color:C.muted}}>{rpK(left)} to go</span>}
            </div>
            {!done&&(
              <div style={{marginTop:12}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  {[50000,100000,500000].map(a=>(
                    <button key={a} onClick={()=>addSavings(g.id,a)} style={{flex:1,background:`${C.mint}15`,border:`1px solid ${C.mint}30`,borderRadius:10,padding:"7px 0",color:C.mintD,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:MONO}}>+{rpK(a)}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input type="text" inputMode="numeric" placeholder="Custom amount..." value={addAmt[g.id]||""} onChange={e=>setAddAmt(a=>({...a,[g.id]:fmtN(e.target.value)}))} style={{...inp,fontSize:13,padding:"9px 14px",flex:1}}/>
                  <button onClick={()=>addSavings(g.id,parseInt((addAmt[g.id]||"").replace(/\D/g,"")))} style={{background:`linear-gradient(135deg,${C.mint},${C.mintD})`,border:"none",borderRadius:12,padding:"0 16px",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:13}}>+Add</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {adding?(
        <div style={{...card,padding:"20px 18px",marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:16}}>New Goal</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <FL label="Goal Name"><input type="text" placeholder="e.g. Beli Laptop, Liburan Bali..." value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/></FL>
            <FL label="Target Amount (IDR)"><input type="text" inputMode="numeric" placeholder="Rp 0" value={form.target} onChange={e=>setForm(f=>({...f,target:fmtN(e.target.value)}))} style={{...inp,fontFamily:MONO}}/></FL>
            <FL label="Already Saved (IDR)"><input type="text" inputMode="numeric" placeholder="Rp 0" value={form.saved} onChange={e=>setForm(f=>({...f,saved:fmtN(e.target.value)}))} style={{...inp,fontFamily:MONO}}/></FL>
            <FL label="Target Date (optional)"><DatePicker value={form.deadline} onChange={v=>setForm(f=>({...f,deadline:v}))}/></FL>
          </div>
          <div style={{display:"flex",gap:9,marginTop:16}}>
            <button onClick={()=>setAdding(false)} style={{flex:1,background:C.border,border:"none",borderRadius:14,padding:"14px 0",color:C.muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>Cancel</button>
            <button onClick={save} style={{flex:2,background:`linear-gradient(135deg,${C.mint},${C.mintD})`,border:"none",borderRadius:14,padding:"14px 0",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:`0 6px 20px ${C.mint}40`}}>Create Goal</button>
          </div>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} style={{width:"100%",background:`${C.mint}12`,border:`1.5px dashed ${C.mint}50`,borderRadius:18,padding:"16px 0",color:C.mintD,fontSize:14,fontWeight:700,cursor:"pointer",marginTop:4}}>+ Add New Goal 🎯</button>
      )}
    </div>
  );
}

// ─── MORE MENU ────────────────────────────────────────────────────────────────
function More(props){
  const C=useTheme();
  const card=mkCard(C),cardSm=mkCardSm(C);
  const [page,setPage]=useState("menu");
  const {txs,income,expense,saving,data,updateData,selectedMonth,darkMode,setDarkMode,onLogout,user}=props;
  const PAGES={
    report:{title:"📊 Report & Export",comp:<ReportPage {...{data,txs,income,expense,saving,selectedMonth}}/>},
    wallet:{title:"👛 Wallets",comp:<WalletPage {...{data,updateData}}/>},
    recurring:{title:"🔄 Recurring",comp:<RecurringPage {...{data,updateData}}/>},
    budget:{title:"🎯 Targets & Budget",comp:<BudgetPage {...{data,updateData}}/>},
    goals:{title:"🏆 Financial Goals",comp:<GoalsPage {...{data,updateData}}/>},
  };
  if(page!=="menu")return(
    <div style={{padding:16}}>
      <BackBtn onBack={()=>setPage("menu")}/>
      <div style={{fontSize:20,fontWeight:900,color:C.navy,marginBottom:20,letterSpacing:-0.5}}>{PAGES[page].title}</div>
      {PAGES[page].comp}
    </div>
  );
  const recurCount=(data.recurring||[]).filter(r=>r.active).length;
  const expRatio=income>0?(expense/income*100).toFixed(0):0;
  const goalsCount=(data.goals||[]).length;
  const goalsCompleted=(data.goals||[]).filter(g=>g.saved>=g.target).length;
  return(
    <div style={{padding:16}}>
      <div style={{fontSize:20,fontWeight:900,color:C.navy,marginBottom:20,letterSpacing:-0.5}}>More</div>

      {/* Dark Mode Toggle */}
      <div style={{...card,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:darkMode?`${C.lavender}15`:C.goldL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
            {darkMode?"🌙":"☀️"}
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.navy}}>Dark Mode</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>{darkMode?"Space theme on":"Light theme on"}</div>
          </div>
        </div>
        <button onClick={()=>setDarkMode(d=>!d)} style={{width:52,height:28,borderRadius:14,border:"none",cursor:"pointer",background:darkMode?C.lavender:C.border,position:"relative",transition:"background .3s",flexShrink:0}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:darkMode?27:3,transition:"left .3s",boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}/>
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[
          {id:"report",e:"📊",t:"Report",d:"Trends & export"},
          {id:"wallet",e:"👛",t:"Wallets",d:`${(data.wallets||DEFAULT_WALLETS).length} wallets`},
          {id:"recurring",e:"🔄",t:"Recurring",d:`${recurCount} active`},
          {id:"budget",e:"🎯",t:"Targets",d:`${data.settings?.savingsTarget||60}% save target`},
          {id:"goals",e:"🏆",t:"Goals",d:goalsCount>0?`${goalsCompleted}/${goalsCount} done`:"Set a goal!"},
        ].map(item=>(
          <button key={item.id} onClick={()=>setPage(item.id)} style={{...card,padding:"18px 16px",cursor:"pointer",textAlign:"left",border:"none"}}>
            <div style={{fontSize:28,marginBottom:10}}>{item.e}</div>
            <div style={{fontSize:14,fontWeight:800,color:C.navy}}>{item.t}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>{item.d}</div>
          </button>
        ))}
      </div>
      <div style={{...card,padding:"16px 18px",marginBottom:16}}>
        <div style={{fontSize:11,color:C.mintD,fontWeight:700,marginBottom:6,letterSpacing:1}}>💡 TIP</div>
        <div style={{fontSize:13,color:C.navyMid,lineHeight:1.65}}>
          {income>0&&expRatio>(data.settings?.expenseMax||40)?`Expenses at ${expRatio}% of income — above your ${data.settings?.expenseMax||40}% limit. Try cutting the biggest category.`:"Spending is within target this month. Stay consistent!"}
        </div>
      </div>

      {/* User info + logout */}
      <div style={{...card,padding:"16px 18px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:46,height:46,borderRadius:14,background:`${user?.color||C.mint}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{user?.emoji||"🐧"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:C.navy}}>{user?.name||"User"}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>{user?.pin?"🔒 PIN aktif":"🔓 Belum ada PIN"}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{width:"100%",background:`${C.coral}12`,border:`1px solid ${C.coral}30`,borderRadius:12,padding:"10px 0",color:C.coral,fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Ganti Akun
        </button>
      </div>

    </div>
  );
}

// ─── NAV ICONS ────────────────────────────────────────────────────────────────
const NAV_PATH={
  home:<><path d="M3 12L12 4l9 8"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" strokeLinejoin="round"/></>,
  list:<><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9h10M7 12.5h6M7 16h4" strokeLinecap="round"/></>,
  ai:<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01" strokeLinecap="round" strokeWidth={2.2}/></>,
  more:<><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
};
function NavIcon({id,label,active,onClick,C,prevTab,allTabs}){
  const isPlus=id==="plus";
  const [pressed,setPressed]=useState(false);
  const press=()=>{setPressed(true);setTimeout(()=>setPressed(false),180);onClick();};
  if(isPlus)return(
    <button
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>{setPressed(false);onClick();}}
      onPointerLeave={()=>setPressed(false)}
      style={{
        background:`linear-gradient(135deg,${C.mint},${C.mintD})`,
        border:"none",borderRadius:"50%",
        width:56,height:56,
        cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        color:"#fff",fontSize:28,fontWeight:300,lineHeight:"0",
        boxShadow:`0 -4px 20px ${C.mint}50, 0 8px 24px ${C.mint}40`,
        marginTop:-24,flexShrink:0,
        transform:pressed?"scale(0.88)":"scale(1)",
        transition:"transform .12s cubic-bezier(.34,1.56,.64,1), box-shadow .12s",
        paddingBottom:2,
      }}>＋</button>
  );
  return(
    <button
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>{setPressed(false);onClick();}}
      onPointerLeave={()=>setPressed(false)}
      style={{
        background:active?`${C.mintD}12`:"none",
        border:"none",cursor:"pointer",
        display:"flex",flexDirection:"column",alignItems:"center",gap:3,
        padding:"6px 10px",borderRadius:12,
        color:active?C.mintD:C.muted,
        transform:pressed?"scale(0.88)":"scale(1)",
        transition:"color .15s, background .15s, transform .12s cubic-bezier(.34,1.56,.64,1)",
        flex:1,
      }}>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2.2:1.8} strokeLinecap="round" strokeLinejoin="round" style={{transition:"stroke-width .2s"}}>
        {NAV_PATH[id]}
      </svg>
      <span style={{fontSize:10,fontWeight:active?700:500,transition:"font-weight .2s"}}>{label}</span>
    </button>
  );
}

// ─── USER ACCOUNTS ────────────────────────────────────────────────────────────
const USER_STORAGE_KEY = "pinqflow-accounts-v1";
const DEFAULT_ACCOUNTS = [
  {id:"u1",name:"User 1",emoji:"🐧",color:"#10B981",pin:""},
  {id:"u2",name:"User 2",emoji:"🦊",color:"#F97316",pin:""},
  {id:"u3",name:"User 3",emoji:"🐻",color:"#8B5CF6",pin:""},
  {id:"u4",name:"User 4",emoji:"🦋",color:"#EC4899",pin:""},
  {id:"u5",name:"User 5",emoji:"🐬",color:"#0EA5E9",pin:""},
];
async function loadAccounts(){
  try{
    const ref=doc(db,"config","accounts");
    const snap=await getDoc(ref);
    if(snap.exists())return snap.data().accounts;
  }catch(e){console.error("loadAccounts error:",e);}
  return DEFAULT_ACCOUNTS;
}
async function saveAccounts(accs){
  try{
    const ref=doc(db,"config","accounts");
    await setDoc(ref,{accounts:accs});
  }catch(e){console.error("saveAccounts error:",e);}
}

// ─── PIN KEYPAD ───────────────────────────────────────────────────────────────
function PinKeypad({onComplete,color,onBack,title,subtitle,shake}){
  const C=useTheme();
  const [pin,setPin]=useState("");
  const KEYS=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const press=(k)=>{
    if(k==="⌫"){setPin(p=>p.slice(0,-1));return;}
    if(k===""||pin.length>=4)return;
    const next=pin+k;
    setPin(next);
    if(next.length===4){setTimeout(()=>{onComplete(next);setPin("");},120);}
  };
  return(
    <div style={{width:"100%",maxWidth:320,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:4}}>{title}</div>
        <div style={{fontSize:12,color:C.muted}}>{subtitle}</div>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:36,animation:shake?"shake .4s ease":"none"}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:16,height:16,borderRadius:"50%",background:pin.length>i?color:C.border,transition:"background .15s",boxShadow:pin.length>i?`0 0 8px ${color}60`:"none"}}/>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {KEYS.map((k,i)=>(
          <button key={i} onClick={()=>press(k)} disabled={k===""} style={{height:64,borderRadius:18,border:`1.5px solid ${k===""?"transparent":C.border}`,background:k===""?"transparent":C.bgCard,color:k==="⌫"?C.muted:C.navy,fontSize:k==="⌫"?20:22,fontWeight:700,cursor:k===""?"default":"pointer",boxShadow:k===""?"none":C.shadow,fontFamily:"inherit",transition:"all .1s"}}>
            {k}
          </button>
        ))}
      </div>
      {onBack&&<button onClick={onBack} style={{width:"100%",marginTop:20,background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontWeight:600}}>← Kembali</button>}
    </div>
  );
}

// ─── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({onLogin,C}){
  const [accounts,setAccounts]=useState(null);
  const [screen,setScreen]=useState("list"); // list | pin | setup | edit
  const [selectedAcc,setSelectedAcc]=useState(null);
  const [shake,setShake]=useState(false);
  const [editName,setEditName]=useState("");
  const [editEmoji,setEditEmoji]=useState("");
  const [editPin,setEditPin]=useState("");
  const [editPinConfirm,setEditPinConfirm]=useState("");
  const [editStep,setEditStep]=useState("info"); // info | pin1 | pin2
  const [pinError,setPinError]=useState("");
  const EMOJIS=["🐧","🦊","🐻","🦋","🐬","🦁","🐯","🐺","🦅","🦄","🐙","🦖","🌟","🔥","⚡","🎯","🚀","💎"];

  useEffect(()=>{loadAccounts().then(setAccounts);},[]);

  const selectAccount=(acc)=>{
    setSelectedAcc(acc);
    if(!acc.pin){onLogin(acc);return;}
    setScreen("pin");
  };

  const handlePinEnter=(enteredPin)=>{
    if(enteredPin===selectedAcc.pin){
      onLogin(selectedAcc);
    } else {
      setShake(true);
      setTimeout(()=>setShake(false),500);
    }
  };

  const openEdit=(e,acc)=>{
    e.stopPropagation();
    setSelectedAcc(acc);
    setEditName(acc.name);
    setEditEmoji(acc.emoji);
    setEditPin("");setEditPinConfirm("");
    setEditStep("info");setPinError("");
    setScreen("edit");
  };

  const saveEdit=async()=>{
    const updated=accounts.map(a=>a.id===selectedAcc.id?{...a,name:editName||a.name,emoji:editEmoji||a.emoji}:a);
    setAccounts(updated);await saveAccounts(updated);setScreen("list");
  };

  const handleSetPin=(p)=>{
    if(editStep==="pin1"){setEditPin(p);setEditStep("pin2");setPinError("");}
    else if(editStep==="pin2"){
      if(p===editPin){
        const updated=accounts.map(a=>a.id===selectedAcc.id?{...a,name:editName||a.name,emoji:editEmoji||a.emoji,pin:p}:a);
        setAccounts(updated);saveAccounts(updated);setScreen("list");
      } else {
        setPinError("PIN tidak cocok, coba lagi");
        setEditStep("pin1");setEditPin("");
        setShake(true);setTimeout(()=>setShake(false),500);
      }
    }
  };

  const removePin=async()=>{
    const updated=accounts.map(a=>a.id===selectedAcc.id?{...a,pin:""}:a);
    setAccounts(updated);await saveAccounts(updated);setScreen("list");
  };

  if(!accounts)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}><div style={{fontSize:13,color:C.muted}}>Memuat akun...</div></div>;

  const Penguin=()=>(
    <svg width={56} height={56} viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" style={{margin:"0 auto 12px",display:"block",filter:`drop-shadow(0 6px 16px ${C.mint}50)`}}>
      <defs><radialGradient id="hg2" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#3A3A3A"/><stop offset="100%" stopColor="#111111"/></radialGradient></defs>
      <ellipse cx="72" cy="74" rx="8" ry="20" fill="#111" stroke="#111" strokeWidth="3.5" strokeLinejoin="round" transform="rotate(14 72 74)"/>
      <ellipse cx="24" cy="57" rx="8" ry="20" fill="#111" stroke="#111" strokeWidth="3.5" strokeLinejoin="round" transform="rotate(-52 24 57)"/>
      <ellipse cx="50" cy="74" rx="27" ry="30" fill="#111" stroke="#111" strokeWidth="3.5"/>
      <ellipse cx="50" cy="78" rx="17" ry="21" fill="#F8F8F8" stroke="#111" strokeWidth="3.5"/>
      <circle cx="50" cy="38" r="26" fill="url(#hg2)" stroke="#111" strokeWidth="3.5"/>
      <ellipse cx="50" cy="43" rx="19" ry="20" fill="#F8F8F8" stroke="#111" strokeWidth="3.5"/>
      <circle cx="41.5" cy="36.5" r="6.5" fill="#111"/><circle cx="43.5" cy="34.5" r="2.2" fill="white"/>
      <circle cx="58.5" cy="36.5" r="6.5" fill="#111"/><circle cx="60.5" cy="34.5" r="2.2" fill="white"/>
      <path d="M43 51 Q50 45 57 51 Q53.5 55 50 55.5 Q46.5 55 43 51Z" fill="#F59E0B" stroke="#111" strokeWidth="3.5" strokeLinejoin="round"/>
      <path d="M22 64 Q36 58 50 59 Q64 58 78 64 L78 72 Q64 66 50 67 Q36 66 22 72Z" fill="#34D399" stroke="#2BBF85" strokeWidth="1"/>
      <ellipse cx="39" cy="103" rx="11" ry="5.5" fill="#F59E0B" stroke="#111" strokeWidth="3.5"/>
      <ellipse cx="61" cy="103" rx="11" ry="5.5" fill="#F59E0B" stroke="#111" strokeWidth="3.5"/>
    </svg>
  );

  if(screen==="pin")return(
    <ThemeCtx.Provider value={C}>
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
      <div style={{width:"100%",maxWidth:340}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:20,background:`${selectedAcc.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 12px"}}>{selectedAcc.emoji}</div>
          <div style={{fontSize:18,fontWeight:900,color:C.navy}}>{selectedAcc.name}</div>
        </div>
        <PinKeypad color={selectedAcc.color} onComplete={handlePinEnter} onBack={()=>setScreen("list")} title="Masukkan PIN" subtitle="PIN 4 digit kamu" shake={shake}/>
      </div>
    </div>
    </ThemeCtx.Provider>
  );

  if(screen==="edit")return(
    <ThemeCtx.Provider value={C}>
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px",overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:380}}>
        {editStep==="info"&&(
          <>
            <div style={{fontSize:18,fontWeight:900,color:C.navy,marginBottom:20,textAlign:"center"}}>Edit Profil</div>
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",justifyContent:"center"}}>
              {EMOJIS.map(e=><button key={e} onClick={()=>setEditEmoji(e)} style={{width:40,height:40,borderRadius:10,border:`2px solid ${editEmoji===e?selectedAcc.color:"transparent"}`,background:editEmoji===e?`${selectedAcc.color}20`:"transparent",fontSize:20,cursor:"pointer"}}>{e}</button>)}
            </div>
            <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Nama akun..." maxLength={20}
              style={{width:"100%",background:C.inpBg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"13px 16px",color:C.navy,fontSize:15,fontWeight:600,boxSizing:"border-box",outline:"none",fontFamily:"inherit",marginBottom:12}}/>
            {pinError&&<div style={{color:C.coral,fontSize:12,marginBottom:10,textAlign:"center"}}>{pinError}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
              <button onClick={()=>{setEditStep("pin1");setPinError("");}} style={{background:`${selectedAcc.color}15`,border:`1.5px solid ${selectedAcc.color}40`,borderRadius:14,padding:"13px 0",color:selectedAcc.color,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {selectedAcc.pin?"🔐 Ganti PIN":"🔒 Set PIN Baru"}
              </button>
              {selectedAcc.pin&&<button onClick={removePin} style={{background:`${C.coral}10`,border:`1.5px solid ${C.coral}30`,borderRadius:14,padding:"13px 0",color:C.coral,fontSize:13,fontWeight:700,cursor:"pointer"}}>🔓 Hapus PIN</button>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setScreen("list")} style={{flex:1,background:C.border,border:"none",borderRadius:14,padding:"13px 0",color:C.muted,fontSize:13,fontWeight:700,cursor:"pointer"}}>Batal</button>
              <button onClick={saveEdit} style={{flex:2,background:`linear-gradient(135deg,${selectedAcc.color},${selectedAcc.color}cc)`,border:"none",borderRadius:14,padding:"13px 0",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>Simpan</button>
            </div>
          </>
        )}
        {editStep==="pin1"&&(
          <PinKeypad color={selectedAcc.color} onComplete={handleSetPin} onBack={()=>setEditStep("info")} title="Buat PIN Baru" subtitle="Masukkan 4 digit PIN" shake={shake}/>
        )}
        {editStep==="pin2"&&(
          <PinKeypad color={selectedAcc.color} onComplete={handleSetPin} onBack={()=>{setEditStep("pin1");setEditPin("");}} title="Konfirmasi PIN" subtitle="Masukkan PIN yang sama" shake={shake}/>
        )}
      </div>
    </div>
    </ThemeCtx.Provider>
  );

  return(
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif",padding:"0 24px",overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <Penguin/>
          <div style={{fontSize:24,fontWeight:900,letterSpacing:-1,color:C.navy,lineHeight:1.1}}><span style={{color:"#F87171"}}>Pinq</span><span style={{color:"#10B981"}}>Flow</span></div>
          <div style={{fontSize:12,color:C.muted,marginTop:4,fontWeight:500}}>Pilih akun kamu untuk mulai 🐧</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {accounts.map(acc=>(
            <button key={acc.id} onClick={()=>selectAccount(acc)} style={{width:"100%",background:C.bgCard,border:`1.5px solid ${C.border}`,borderRadius:20,padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,boxShadow:C.shadow,textAlign:"left"}}>
              <div style={{width:50,height:50,borderRadius:14,background:`${acc.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{acc.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:C.navy}}>{acc.name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{acc.pin?"🔒 PIN aktif":"Ketuk untuk masuk →"}</div>
              </div>
              <button onClick={e=>openEdit(e,acc)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:13}}>✏️</button>
            </button>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:C.muted,lineHeight:1.7}}>Data setiap akun tersimpan terpisah 🔒</div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
    </div>
  );
}

export default function App(){
  const [currentUser,setCurrentUser]=useState(null);
  const [darkMode,setDarkMode]=useState(false);
  const C=darkMode?CD:CL;
  if(!currentUser)return <ThemeCtx.Provider value={C}><LoginScreen onLogin={setCurrentUser} C={C}/></ThemeCtx.Provider>;
  return <UserApp key={currentUser.id} user={currentUser} onLogout={()=>setCurrentUser(null)}/>;
}

function UserApp({user,onLogout}){
  const [data,setData]=useState(null);
  const [darkMode,setDarkMode]=useState(false);
  const [tab,setTab]=useState("home");
  const [tabDir,setTabDir]=useState(1); // 1=forward, -1=backward
  const TAB_ORDER=["home","list","plus","ai","more"];
  const goTab=useCallback(next=>{
    const ci=TAB_ORDER.indexOf(tab),ni=TAB_ORDER.indexOf(next);
    setTabDir(ni>=ci?1:-1);
    setTab(next);
  },[tab]);
  const [month,setMonth]=useState(mkKey(new Date()));
  const [hidden,setHidden]=useState(false);

  useEffect(()=>{loadData(user.id).then(d=>{const a=applyRecurring(d);setData(a);if(a!==d)saveData(a,user.id);setDarkMode(!!d.darkMode);});},[]);
  const updateData=useCallback(d=>{setData(d);saveData(d,user.id);},[user.id]);

  // Save dark mode preference
  useEffect(()=>{if(data)updateData({...data,darkMode});},[darkMode]);

  const C=darkMode?CD:CL;

  if(!data)return(
    <ThemeCtx.Provider value={C}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:"system-ui"}}>
      <div style={{textAlign:"center"}}>
        <PenguinLogo size={72} style={{margin:"0 auto 12px",display:"block",filter:`drop-shadow(0 8px 20px ${C.mint}50)`}}/>
        <div style={{fontSize:22,fontWeight:900,color:C.navy,letterSpacing:-0.5}}><span style={{color:C.coral}}>Pinq</span><span style={{color:C.mintD}}>Flow</span></div>
        <div style={{fontSize:12,color:C.muted,marginTop:4,fontWeight:500,letterSpacing:0.5}}>Let Pinq Track Your Money 🐧</div>
        <div style={{fontSize:11,letterSpacing:2,color:C.muted,marginTop:4,fontWeight:600}}>LOADING...</div>
      </div>
    </div>
    </ThemeCtx.Provider>
  );

  const allMonths=[...new Set(data.transactions.map(t=>mkKey(t.date)))].sort().reverse();
  if(!allMonths.includes(mkKey(new Date())))allMonths.unshift(mkKey(new Date()));
  const txs=data.transactions.filter(t=>mkKey(t.date)===month);
  const income=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const saving=income-expense,savePct=income>0?(saving/income)*100:0;
  const shared={data,updateData,txs,income,expense,saving,savePct,selectedMonth:month,hidden,setHidden,darkMode,setDarkMode,onLogout,user};
  const NAV=[{id:"home",label:"Home"},{id:"list",label:"History"},{id:"plus",label:"Add"},{id:"ai",label:"AI"},{id:"more",label:"More"}];

  return(
    <ThemeCtx.Provider value={C}>
    <HiddenCtx.Provider value={hidden}>
    <div style={{position:"fixed",inset:0,background:C.bg,overflowY:"hidden",transition:"background .4s"}}>
      {/* Dark mode subtle starfield */}
      {darkMode&&(
        <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
          {[...Array(30)].map((_,i)=>(
            <div key={i} style={{position:"absolute",width:i%3===0?2:1,height:i%3===0?2:1,borderRadius:"50%",background:"rgba(200,210,255,0.4)",left:`${(i*37+11)%100}%`,top:`${(i*53+7)%60}%`,animation:`twinkle ${2+i*.3}s ${i*.15}s ease-in-out infinite`}}/>
          ))}
        </div>
      )}
      <div style={{fontFamily:"'DM Sans','Inter',system-ui,sans-serif",height:"100%",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        {/* HEADER */}
        <div style={{flexShrink:0,padding:"14px 18px 12px",background:C.bgHeader,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,zIndex:50,transition:"background .4s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <PenguinLogo size={36} style={{borderRadius:10,boxShadow:`0 3px 10px ${C.mint}40`,background:darkMode?"#1A2151":C.bg}}/>
              <div>
                <div style={{fontSize:19,fontWeight:900,letterSpacing:-0.8,color:C.navy,lineHeight:1.1}}><span style={{color:C.coral}}>Pinq</span><span style={{color:C.mintD}}>Flow</span></div>
                <div style={{fontSize:9,color:C.muted,fontWeight:600,letterSpacing:0.3,marginTop:1}}>{user.emoji} {user.name}</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {/* Privacy eye */}
              <button onClick={()=>setHidden(h=>!h)} style={{width:34,height:34,borderRadius:10,background:hidden?`${C.lavender}15`:C.bgCard,border:`1px solid ${hidden?C.lavender:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:C.shadow,transition:"all .2s"}}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={hidden?C.lavender:C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {hidden?<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                </svg>
              </button>
              <select value={month} onChange={e=>setMonth(e.target.value)} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,color:C.navy,padding:"7px 10px",fontSize:11,cursor:"pointer",fontWeight:700,outline:"none",boxShadow:C.shadow}}>
                {allMonths.map(m=><option key={m} value={m}>{mkLblS(m)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div key={tab} style={{flex:1,overflowY:"auto",animation:`tabSlide${tabDir>0?"R":"L"} .28s cubic-bezier(.25,.46,.45,.94) both`}}>
          {tab==="home"&&<Dashboard {...shared}/>}
          {tab==="plus"&&<InputForm  {...shared}/>}
          {tab==="list"&&<Transactions {...shared}/>}
          {tab==="ai"  &&<AIChat {...shared}/>}
          {tab==="more"&&<More {...shared}/>}
        </div>

        {/* BOTTOM NAV */}
        <div style={{flexShrink:0,background:C.bgNav,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",alignItems:"center",padding:"10px 8px 22px",zIndex:100,transition:"background .4s"}}>
          {NAV.map(n=><NavIcon key={n.id} id={n.id} label={n.label} active={tab===n.id} onClick={()=>goTab(n.id)} C={C}/>)}
        </div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

          /* ── Tab slide transitions ── */
          @keyframes tabSlideR{
            from{opacity:0;transform:translateX(28px)}
            to{opacity:1;transform:translateX(0)}
          }
          @keyframes tabSlideL{
            from{opacity:0;transform:translateX(-28px)}
            to{opacity:1;transform:translateX(0)}
          }

          /* ── Global button press feel ── */
          button{transition:transform .12s cubic-bezier(.34,1.56,.64,1),opacity .12s ease!important}
          button:active{transform:scale(0.91)!important;opacity:0.85!important}

          /* ── Card hover lift on desktop ── */
          @media(hover:hover){
            button:hover{opacity:0.82;}
          }

          /* ── Other animations ── */
          @keyframes twinkle{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:.8;transform:scale(1)}}
          @keyframes pulse{0%,100%{opacity:.25;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

          /* ── Base resets ── */
          *{-webkit-tap-highlight-color:transparent;font-variant-numeric:tabular-nums;}
          ::-webkit-scrollbar{display:none}

          /* ── Smooth select/input focus ── */
          input:focus{border-color:#10B981!important;box-shadow:0 0 0 3px rgba(16,185,129,0.12)!important;transition:border-color .18s,box-shadow .18s!important}
        `}</style>
      </div>
    </div>
    </HiddenCtx.Provider>
    </ThemeCtx.Provider>
  );
}
