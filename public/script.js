import { firebaseConfig } from "./firebase-config.js?v=1796000007";

// Korean minimum wage per hour, by year: keep in step with src/utils/pay.js (update every January)
const MIN_WAGE_BY_YEAR = {2025:10030, 2026:10320};
const MIN_WAGE = (()=>{ const y=new Date(Date.now()+9*3600e3).getUTCFullYear(), ks=Object.keys(MIN_WAGE_BY_YEAR).map(Number).filter(k=>k<=y);
  return MIN_WAGE_BY_YEAR[y] || MIN_WAGE_BY_YEAR[ks.length?Math.max(...ks):2026]; })();
const CATS = {
  cafe:{en:"Café & Food",ko:"카페·음식",color:"#ff5a36",bg:"#fff1ec",icon:'<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2v3M12 2v3"/>'},
  retail:{en:"Retail & Store",ko:"매장·판매",color:"#2f5bea",bg:"#eaf0ff",icon:'<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'},
  tutor:{en:"Tutoring",ko:"과외·교육",color:"#7c3aed",bg:"#f1eafe",icon:'<path d="M2 9l10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>'},
  translate:{en:"Translation",ko:"번역·통역",color:"#0f9d8a",bg:"#e4f6f3",icon:'<path d="M4 5h8M8 3v2M6 5c0 4 3 7 6 8M10 5c0 3-3 7-6 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/>'},
  office:{en:"Office & Admin",ko:"사무·행정",color:"#0e7490",bg:"#e1f3f8",icon:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'},
  tour:{en:"Tourism & Hotel",ko:"관광·호텔",color:"#d97706",bg:"#fdf2e0",icon:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>'},
  event:{en:"Events & Promo",ko:"행사·홍보",color:"#db2777",bg:"#fde8f1",icon:'<path d="M3 11l15-6v14L3 13v-2Z"/><path d="M7 13v5h3v-4"/>'},
  online:{en:"Online & Content",ko:"온라인·콘텐츠",color:"#14213d",bg:"#e8eaf1",icon:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'}
};
const SAMPLE_JOBS = [
 {id:1,title:"Barista (English-speaking café)",ko:"바리스타",co:"Mapo Roasters",city:"Seoul",area:"Hongdae",cat:"cafe",pay:11000,hours:"Sat–Sun 10:00–16:00",lvl:1,flags:["weekend","english","noexp"],days:0,desc:"Make espresso drinks and serve a mostly international crowd near Hongik Univ. Station."},
 {id:2,title:"English conversation tutor (kids)",ko:"영어 회화 튜터",co:"Little Leaf English Club",city:"Seoul",area:"Gangnam",cat:"tutor",pay:22000,hours:"Tue/Thu 16:00–19:00",lvl:1,flags:["english","evening"],days:1,desc:"Lead small-group English conversation and games for elementary students. Lesson plans provided."},
 {id:3,title:"Chinese–Korean translator (product pages)",ko:"중한 번역",co:"K-Beauty Global",city:"Remote",area:"Online",cat:"translate",pay:18000,hours:"Flexible, ~10 h/wk",lvl:5,flags:["remote"],days:2,desc:"Translate cosmetics product descriptions and reviews from Korean to Simplified Chinese."},
 {id:4,title:"Convenience store staff",ko:"편의점 아르바이트",co:"Corner24 Sinchon",city:"Seoul",area:"Sinchon",cat:"retail",pay:10320,hours:"Sat–Sun 14:00–22:00",lvl:3,flags:["weekend","noexp"],days:0,desc:"Cashier, stocking shelves and basic cleaning. Training provided on your first shift."},
 {id:5,title:"Hotel front desk assistant",ko:"호텔 프론트 보조",co:"Haeundae Bay Stay",city:"Busan",area:"Haeundae",cat:"tour",pay:12000,hours:"Fri–Sun 15:00–21:00",lvl:3,flags:["weekend","english","evening"],days:3,desc:"Check guests in and out, answer questions in English and help with local recommendations."},
 {id:6,title:"Japanese-speaking tour guide assistant",ko:"일본어 관광 가이드 보조",co:"Gyeongju Heritage Tours",city:"Gyeongju",area:"Downtown",cat:"tour",pay:15000,hours:"Weekends, 09:00–17:00",lvl:3,flags:["weekend"],days:4,desc:"Support Japanese tour groups visiting historic sites. Native-level Japanese required."},
 {id:7,title:"University library assistant",ko:"도서관 근로학생",co:"Campus Library (on-campus)",city:"Daejeon",area:"Yuseong",cat:"office",pay:10500,hours:"Mon/Wed/Fri 13:00–17:00",lvl:3,flags:["noexp"],days:5,desc:"Shelve books, help at the circulation desk and support international-student services."},
 {id:8,title:"K-pop merch pop-up staff",ko:"팝업스토어 스태프",co:"Seongsu Pop Lab",city:"Seoul",area:"Seongsu",cat:"event",pay:12500,hours:"Sat–Sun 11:00–20:00",lvl:1,flags:["weekend","english","noexp"],days:1,desc:"Greet visitors, manage the queue and help foreign fans at a two-week pop-up store."},
 {id:9,title:"Vietnamese content creator (short-form)",ko:"베트남어 콘텐츠 제작",co:"StudyKorea Media",city:"Remote",area:"Online",cat:"online",pay:16000,hours:"Flexible, ~8 h/wk",lvl:3,flags:["remote"],days:6,desc:"Write and film short videos in Vietnamese about student life in Korea."},
 {id:10,title:"Restaurant kitchen helper",ko:"주방 보조",co:"Jeonju Bibim House",city:"Jeonju",area:"Hanok Village",cat:"cafe",pay:10800,hours:"Sat–Sun 11:00–18:00",lvl:1,flags:["weekend","noexp"],days:2,desc:"Prep ingredients, wash dishes and keep the kitchen tidy during the busy weekend rush."},
 {id:11,title:"Duty-free sales associate (Chinese)",ko:"면세점 판매 (중국어)",co:"Jeju Blue Duty Free",city:"Jeju",area:"Jeju City",cat:"retail",pay:13500,hours:"Sat–Sun 10:00–19:00",lvl:3,flags:["weekend"],days:7,desc:"Assist Chinese-speaking shoppers, explain products and process tax refunds."},
 {id:12,title:"English proofreader (research papers)",ko:"영어 논문 교정",co:"Daegu Science Editing",city:"Remote",area:"Online",cat:"translate",pay:25000,hours:"Flexible, ~6 h/wk",lvl:0,flags:["remote","english"],days:3,desc:"Proofread English academic papers written by Korean researchers. Grad students preferred."},
 {id:13,title:"Event staff — international festival",ko:"국제축제 행사 스태프",co:"Incheon Global Fest",city:"Incheon",area:"Songdo",cat:"event",pay:12000,hours:"Nov 29–30, 10:00–18:00",lvl:0,flags:["weekend","english","noexp"],days:0,desc:"Two-day festival in Songdo. Help at info booths and guide visitors. Lunch included."},
 {id:14,title:"Bakery counter staff",ko:"베이커리 카운터",co:"Butter & Rice Bakery",city:"Daegu",area:"Dongseong-ro",cat:"cafe",pay:10500,hours:"Mon–Fri 18:00–21:00",lvl:3,flags:["evening","noexp"],days:8,desc:"Serve customers, pack bread and close the shop. Close to Banwoldang Station."},
 {id:15,title:"Office assistant — global HR team",ko:"글로벌 HR 사무보조",co:"Pangyo Tech Co.",city:"Seongnam",area:"Pangyo",cat:"office",pay:13000,hours:"Tue/Thu 10:00–16:00",lvl:3,flags:["english"],days:2,desc:"Data entry, document translation and onboarding support for foreign employees."},
 {id:16,title:"Korean–Mongolian interpreter (hospital)",ko:"몽골어 의료통역",co:"Seoul Medical Care Center",city:"Seoul",area:"Jongno",cat:"translate",pay:20000,hours:"On-call, 2–3 days/wk",lvl:5,flags:[],days:5,desc:"Interpret between Mongolian-speaking patients and medical staff. TOPIK 5+ required."},
 {id:17,title:"Gwangju cinema usher",ko:"영화관 스태프",co:"Lumiere Cinema Gwangju",city:"Gwangju",area:"Sangmu",cat:"retail",pay:10320,hours:"Fri–Sun 17:00–23:00",lvl:1,flags:["weekend","evening","noexp"],days:1,desc:"Check tickets, sell snacks and clean screens between showings."},
 {id:18,title:"Online English chat tutor",ko:"온라인 영어 튜터",co:"TalkBridge",city:"Remote",area:"Online",cat:"online",pay:17000,hours:"Evenings, choose your slots",lvl:0,flags:["remote","english","evening"],days:4,desc:"Short video-chat lessons with Korean adults practicing English. Headset needed."},
 {id:19,title:"Guesthouse helper",ko:"게스트하우스 스태프",co:"Gamcheon Hill House",city:"Busan",area:"Saha",cat:"tour",pay:10600,hours:"Sat–Sun 08:00–13:00",lvl:1,flags:["weekend","english","noexp"],days:6,desc:"Prepare breakfast, tidy rooms and welcome guests from around the world."},
 {id:20,title:"Campus international-office assistant",ko:"국제처 근로학생",co:"International Office (on-campus)",city:"Seoul",area:"Seodaemun",cat:"office",pay:10800,hours:"Mon/Wed 10:00–14:00",lvl:3,flags:["english"],days:3,desc:"Help new international students with orientation, documents and events."}
];

/* ---------- i18n ---------- */
const KO = {
 notice:'<b>2026년 기준:</b> 최저시급 ₩10,320 · 첫 근무 <b>전에</b> 출입국 시간제 취업 허가가 필요해요.',
 navJobs:"일자리 찾기",navTools:"근무시간·급여",navGuide:"취업허가 가이드",navEmp:"기업 회원",saved:"저장",
 pill:"유학생 비자 OK 일자리만",h1:'유학생을 위한 <em>한국 아르바이트.</em>',
 lead:"모든 공고에 필요한 한국어 수준, 영어 가능 여부를 표시해요. 비자 규정에 맞는 알바를 찾고, 근무시간을 확인하고, 몇 분 만에 지원하세요.",
 what:"직종",where:"지역",korean:"한국어 수준",search:"검색",popular:"인기:",
 minWage:"2026 최저시급",minWageSub:"외국인 유학생도 동일하게 적용돼요. 2027년 1월부터 ₩10,700.",
 m1:"학부 · 학기 중 (TOPIK 3+)",m2:"대학원 · 학기 중 (TOPIK 4+)",m3:"주말·방학 (요건 충족 시)",nolimit:"제한 없음",avgPay:"Work Abroad Hub 평균 시급",
 s1:"모집 중인 공고",s2:"영어 가능 공고",s3:"지역",s4:"최저임금 이상",
 browse:"카테고리",byCat:"직종별 일자리",latest:"최신",openPos:"모집 공고",jobsNote:"공고를 눌러 상세 내용을 보고 지원하세요. 북마크로 저장해 비교할 수 있어요.",
 fType:"직종",fSchedule:"근무 시간",weekendOnly:"주말만",evening:"저녁",remote:"재택",fLang:"언어",engOk:"영어 가능",noExp:"경력 무관",fPay:"최소 시급",clear:"필터 초기화",more:"더 보기",
 tools:"무료 도구",toolsH:"근무시간과 급여를 미리 확인하세요.",toolsP:"허용 시간을 넘겨 일하면 비자에 불이익이 생길 수 있어요. 스케줄을 받기 전에 확인하세요.",
 hoursH:"비자 근무시간 확인",hoursP:"2026년 법무부 D-2 / D-4 유학생 기준.",program:"과정",topik:"한국어 수준",planned:"주중 근무 예정 시간 (주당)",
 hoursFine:"영어트랙 학생은 TOPIK 대신 영어 성적으로 대체 가능. 인증대학·성적 우수자는 추가 시간이 허용될 수 있어요. 하이코리아 또는 국제처에서 꼭 확인하세요.",
 payH:"급여 계산기 (주휴수당 포함)",payP:"주 15시간 이상 일하면 주휴수당이 추가돼요.",wageL:"시급 (₩)",hrsL:"주당 근무시간",payFine:"예상 금액입니다. 주휴수당은 그 주의 소정 근로일을 모두 근무했을 때 지급돼요. 프리랜서 계약은 3.3%가 원천징수될 수 있어요.",
 tProg:"과정",tLevel:"한국어 요건",tNot:"요건 미충족",tMet:"요건 충족",tWknd:"주말 / 방학",
 guide:"가이드",guideH:"시간제 취업 허가, 4단계로 끝내기",guideP:"허가 없이 일하다 적발되면 최대 1,000만 원의 벌금과 향후 비자 제한이 있을 수 있어요.",
 st1:"일자리 찾고 계약서 받기",st1p:"시급·근무시간·업무가 적힌 근로계약서와 사업자등록증 사본을 받으세요.",
 st2:"학교 국제처 방문",st2p:"국제처에서 시간제취업 확인서에 서명을 받아요. TOPIK 성적표와 성적증명서를 챙기세요.",
 st3:"하이코리아 신청",st3p:"전자민원 → '유학생 시간제취업 허가' 신청, 또는 출입국사무소 방문.",
 st4:"허가 후 근무 시작",st4p:"허가가 나온 뒤에 시작하세요. 심사 중 근무도 무허가 취업으로 볼 수 있어요.",
 okJobs:"대체로 가능",noJobs:"불가",faqH:"유학생이 자주 묻는 질문",
 empE:"기업 회원",empH:"다국어 가능한 유학생을 채용하세요",empP:"5분 만에 공고 등록. 비자 규정을 미리 안내해서 허가 받을 준비가 된 지원자만 연결돼요.",postJob:"무료로 공고 올리기"
};
let lang = "en";
const EN = {};
document.querySelectorAll("[data-i18n]").forEach(el=>EN[el.dataset.i18n]=el.innerHTML);
document.querySelectorAll("[data-i18n-html]").forEach(el=>EN[el.dataset.i18nHtml]=el.innerHTML);
function applyLang(){
  const dict = lang==="ko"?KO:EN;
  document.querySelectorAll("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;if(dict[k])el.innerHTML=dict[k]});
  document.querySelectorAll("[data-i18n-html]").forEach(el=>{const k=el.dataset.i18nHtml;if(dict[k])el.innerHTML=dict[k]});
  document.documentElement.lang = lang;
  renderAll(); calcHours(); calcPay();
}
document.querySelectorAll(".lang button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".lang button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); lang=b.dataset.lang; applyLang();
});

/* ---------- helpers ---------- */
const won = n => "₩"+Math.round(n).toLocaleString("en-US");
const $ = id => document.getElementById(id);
const L = (en,ko) => lang==="ko"?ko:en;
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lvlLabel = l => lang==="ko"
  ? ({0:"한국어 불필요",1:"기초 한국어",3:"중급 한국어",5:"고급 한국어"}[l]||"")
  : ({0:"No Korean needed",1:"Basic Korean",3:"Intermediate Korean",5:"Advanced Korean"}[l]||"");
const flagLabel = f => ({weekend:L("Weekend","주말"),english:L("English OK","영어 가능"),remote:L("Remote","재택"),noexp:L("No experience","경력 무관"),evening:L("Evening","저녁")}[f]||"");
const ago = d => d<=0?L("Today","오늘"):L(d+"d ago",d+"일 전");
const PAY_TYPES = {hourly:{en:"Hourly wage",ko:"시급",color:"#0f9d8a",unit:["hr","시간"]},daily:{en:"Daily wage",ko:"일급",color:"#6d28d9",unit:["day","일"]},monthly:{en:"Monthly salary",ko:"월급",color:"#ff5a36",unit:["month","월"]}};
const hourlyEq = j => j.payType==="daily"?j.pay/8:j.payType==="monthly"?j.pay/209:j.pay;
const initials = s => (String(s).replace(/[^A-Za-z가-힣]/g,"").slice(0,2).toUpperCase()||"WA");
const FLAGS = ["weekend","evening","remote","english","noexp"];
const ALL_CITIES = ["Seoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Ulsan","Suwon","Seongnam","Gyeongju","Jeonju","Jeju","Cheongju","Chuncheon","Remote"];
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2600)}
const store = {get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

let saved = store.get("wah_saved",[]).map(String);
function persist(){ store.set("wah_saved",saved); $("savedCount").textContent=saved.length }

/* ---------- backend: Firebase when configured, this device otherwise ---------- */
const FB_VERSION = "10.12.2";
const backend = {mode:"loading", uid:null, user:null, fb:null, auth:null, db:null, signingUp:false, awaitingLogin:false, signupRole:null, note:""};
// P8: notifications from the server (filled after login, kept live by the socket)
const NS = {items:[], unread:0, more:false, uid:null, settings:null, ready:false};
let account = null;          // signed-in user's profile {role, loggedIn, profile, applied}
let postings = [];           // every employer's posting doc [{uid, company, jobs}]
let applications = [];       // applications sent to this employer's jobs
let JOBS = [];               // merged list shown on the board
let unsubApps = null;

function myPosting(){ return backend.uid ? (postings.find(p=>p.uid===backend.uid) || null) : null }

function rebuildJobs(){
  const samples = SAMPLE_JOBS.map(j=>{ const c=SAMPLE_COORDS[j.id]; return {...j,id:"s"+j.id,payType:"hourly",sample:true,lat:c?c[0]:null,lng:c?c[1]:null}; });
  const live = [];
  postings.forEach(p=>{
    const co = (p.company&&p.company.name)||"Employer";
    (Array.isArray(p.jobs)?p.jobs:[]).forEach(j=>{
      if(!j || j.status!=="open") return;
      if(j.deadline && new Date(j.deadline+"T23:59:59") < new Date()) return;
      const days = Math.max(0,Math.floor((Date.now()-(Number(j.createdAt)||Date.now()))/86400000));
      live.push({id:String(j.id),title:String(j.title||""),ko:String(j.ko||j.title||""),co,city:String(j.city||""),area:String(j.area||""),
        cat:CATS[j.cat]?j.cat:"office",pay:Number(j.pay)||0,payType:PAY_TYPES[j.payType]?j.payType:"hourly",hours:String(j.hours||""),
        lvl:[0,1,3,5].includes(Number(j.lvl))?Number(j.lvl):3,flags:(Array.isArray(j.flags)?j.flags:[]).filter(f=>FLAGS.includes(f)),
        days,desc:String(j.desc||""),deadline:j.deadline||"",live:true,lat:j.lat==null||j.lat===""?null:+j.lat,lng:j.lng==null||j.lng===""?null:+j.lng,owner:p.uid,phone:(p.company&&p.company.phone)||"",email:(p.company&&p.company.email)||"",verified:!!(p.company&&p.company.verified===true)});
    });
  });
  JOBS = [...live,...samples];
}

function configReady(){
  return !!(firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("PASTE") && firebaseConfig.projectId);
}

async function initBackend(){
  if(!configReady()) return startLocal("Firebase isn't set up yet (fill in firebase-config.js), so accounts and jobs are saved on this device only.");
  try{
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
    const [appMod,authMod,fsMod] = await Promise.all([import("./wah-fb.js?v=1796000007"),import("./wah-fb.js?v=1796000007"),import("./wah-fb.js?v=1796000007")]);
    const app = appMod.initializeApp(firebaseConfig);
    backend.fb = {...authMod, ...fsMod};
    backend.auth = authMod.getAuth(app);
    backend.db = fsMod.getFirestore(app);
  }catch(e){
    console.error("Firebase failed to load", e);
    return startLocal("Couldn't connect to Firebase, so this is running in preview mode (this device only).");
  }
  backend.mode = "firebase";
  const F = backend.fb;

  // Everyone (even logged-out visitors) sees all employers' jobs, live.
  F.onSnapshot(F.collection(backend.db,"postings"), snap=>{
    postings = snap.docs.map(d=>({uid:d.id,...d.data()}));
    renderAll();
  }, err=>{
    console.error("postings", err);
    // P13: offline / server unreachable is normal for an installed app → say so (not a "rules" problem)
    const offline = !navigator.onLine || (err && err.code==="unavailable");
    toast(offline ? L("You're offline. Showing sample jobs: connect to see the newest jobs.","오프라인이에요. 예시 공고만 보여요. 연결하면 최신 공고를 볼 수 있어요.")
                  : L("Couldn't load employer jobs. Please try again.","기업 공고를 불러오지 못했어요. 다시 시도해 주세요."));
  });

  F.onAuthStateChanged(backend.auth, async user=>{
    backend.user = user; backend.uid = user ? user.uid : null;
    if(backend.signingUp) return;           // the sign-up form finishes the setup itself
    if(unsubApps){ unsubApps(); unsubApps=null; }
    applications = [];
    if(!user){ account=null; document.body.classList.remove("dash"); renderAll(); afterAuthP8(); return; }
    try{
      const snap = await F.getDoc(F.doc(backend.db,"users",user.uid));
      account = snap.exists() ? {...snap.data(), loggedIn:true}
                              : {pending:true, loggedIn:false, email:user.email||"", displayName:user.displayName||""};
    }catch(e){
      console.error("profile", e);
      account = {pending:true, loggedIn:false, email:user.email||"", displayName:user.displayName||""};
    }
    if(account.role==="employer") watchApplications();
    renderAll();
    if(account.pending){ openAuth(backend.signupRole || "choose"); }
    else if(backend.awaitingLogin){
      backend.awaitingLogin=false; closeModal();
      toast(L("Welcome back!","다시 오신 걸 환영해요!"));
      if(account.role==="employer") showView("dashboard");
    }
    backend.signupRole = null;
    afterAuthP8();
  });
}

function startLocal(note){
  backend.mode="local"; backend.uid="local"; backend.note=note||"";
  account = store.get("wah_account_local",null);
  const p = store.get("wah_posting_local",null);
  postings = p ? [{uid:"local",...p}] : [];
  applications = store.get("wah_apps_local",[]);
  renderAll();
}

function watchApplications(){
  if(backend.mode!=="firebase" || !backend.uid) return;
  const F = backend.fb;
  if(unsubApps) unsubApps();
  unsubApps = F.onSnapshot(F.query(F.collection(backend.db,"applications"), F.where("employerUid","==",backend.uid)), snap=>{
    applications = snap.docs.map(d=>({id:d.id,...d.data()}));
    if(document.body.classList.contains("dash")) renderDashboard();
  }, err=>console.error("applications", err));
}

async function saveAccount(){
  if(backend.mode==="firebase"){
    if(!backend.uid || !account) return false;
    const data = JSON.parse(JSON.stringify(account)); delete data.loggedIn; delete data.pending;
    try{ await backend.fb.setDoc(backend.fb.doc(backend.db,"users",backend.uid), data); return true; }
    catch(e){ console.error("account save", e); toast(L("Couldn't save your profile.","프로필을 저장하지 못했어요.")); return false; }
  }
  store.set("wah_account_local", account); return true;
}

async function savePosting(p){
  p.updatedAt = Date.now();
  const clean = JSON.parse(JSON.stringify(p)); delete clean.uid;
  if(backend.mode!=="firebase"){
    store.set("wah_posting_local",clean);
    postings = [{uid:"local",...clean}]; renderAll(); return true;
  }
  const i = postings.findIndex(x=>x.uid===backend.uid);
  if(i>-1) postings[i]={uid:backend.uid,...clean}; else postings.push({uid:backend.uid,...clean});
  renderAll();
  try{ await backend.fb.setDoc(backend.fb.doc(backend.db,"postings",backend.uid), clean); return true; }
  catch(e){
    console.error("posting save", e);
    toast(e && e.code==="permission-denied" ? "Permission denied — check your Firestore rules." : "Couldn't save — check your connection and try again.");
    return false;
  }
}

async function submitApplication(j, msg){
  const pf = account.profile||{};
  const app = {jobId:j.id, jobTitle:j.title, company:j.co, employerUid:j.owner||"", studentUid:backend.uid,
    name:pf.name||"", email:pf.email||"", phone:pf.phone||"", visa:pf.visa||"", topik:pf.topik||"", school:pf.school||"", photo:pf.photo||"",
    message:String(msg||"").slice(0,600), status:"new", createdAt:Date.now()};
  if(j.live){
    if(backend.mode==="firebase"){
      // confirm email (and phone, when SMS codes are on) before applying: the server refuses otherwise
      if(needsEmailCode()){ askEmailCode(); return false; }
      if(needsPhoneCode()){ askPhoneCode(); return false; }
      try{ await backend.fb.addDoc(backend.fb.collection(backend.db,"applications"), app); }
      catch(e){
        console.error("apply", e);
        if(e && e.code==="failed-precondition"){ askEmailCode(); return false; }
        if(e && /phone number first/.test(e.message||"")){ askPhoneCode(); return false; }
        toast(e && e.fromServer ? e.message : L("Couldn't send your application — try again.","지원서를 보내지 못했어요.")); return false;
      }
    } else {
      applications = [{id:"a"+Date.now().toString(36), ...app}, ...applications];
      store.set("wah_apps_local", applications);
    }
  }
  account.applied = [...(Array.isArray(account.applied)?account.applied:[]), j.id];
  await saveAccount();
  return true;
}

async function setApplicationStatus(id, status){
  if(backend.mode==="firebase"){
    try{ await backend.fb.updateDoc(backend.fb.doc(backend.db,"applications",id), {status}); }
    catch(e){ console.error(e); toast("Couldn't update the status."); }
  } else {
    applications = applications.map(a=>a.id===id?{...a,status}:a);
    store.set("wah_apps_local", applications); renderDashboard();
  }
}

async function doLogout(){
  if(backend.mode==="firebase"){ try{ await backend.fb.signOut(backend.auth); }catch(e){ console.error(e); } }
  else { if(account){ account.loggedIn=false; saveAccount(); } }
  showView("main"); renderAll(); toast(L("Logged out","로그아웃 되었어요"));
}

const AUTH_ERRORS = {
  "auth/invalid-credential":["Wrong email or password.","이메일 또는 비밀번호가 올바르지 않아요."],
  "auth/wrong-password":["Wrong email or password.","이메일 또는 비밀번호가 올바르지 않아요."],
  "auth/user-not-found":["No account with this email — sign up first.","가입된 계정이 없어요. 먼저 회원가입 해주세요."],
  "auth/email-already-in-use":["This email already has an account — log in instead.","이미 가입된 이메일이에요. 로그인해 주세요."],
  "auth/weak-password":["Password must be 8–72 characters with at least one letter and one number.","비밀번호는 8~72자이며 영문과 숫자를 각각 하나 이상 포함해야 해요."],
  "auth/user-disabled":["This account has been blocked.","이 계정은 차단되었어요."],
  "auth/invalid-email":["Please enter a valid email.","올바른 이메일을 입력해 주세요."],
  "auth/too-many-requests":["Too many tries. Wait a moment and try again.","시도가 너무 많아요. 잠시 후 다시 시도해 주세요."],
  "auth/popup-closed-by-user":["Google sign-in was closed.","구글 로그인이 취소되었어요."],
  "auth/popup-blocked":["The Google window was blocked. Allow pop-ups for this site and try again.","구글 창이 차단됐어요. 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요."],
  "auth/google-not-ready":["Google sign-in is still loading. Please try again in a moment.","구글 로그인을 불러오는 중이에요. 잠시 후 다시 시도해 주세요."],
  "auth/unverified-google-email":["Your Google email isn't verified yet. Verify it with Google first, or sign up with a password.","구글 이메일이 아직 인증되지 않았어요. 구글에서 먼저 인증하거나 비밀번호로 가입해 주세요."],
  "auth/operation-not-allowed":["This sign-in method isn't enabled in Firebase yet.","Firebase에서 이 로그인 방법이 아직 켜져 있지 않아요."],
  "auth/unauthorized-domain":["This website's domain isn't allowed in Firebase (Authentication → Settings → Authorized domains).","Firebase 승인된 도메인에 이 사이트를 추가해 주세요."]
};
// these errors carry a specific reason from our server (e.g. "This password is too common.") → show it
const SERVER_MSG_CODES = ["auth/weak-password","auth/too-many-requests","auth/user-disabled"];
const authErr = e => {
  if(e && e.reason==="google-only") return L("This account uses Google sign-in. Use “Continue with Google”, or “Forgot password?” to create a password.","이 계정은 구글 로그인을 사용해요. “Google로 계속하기”를 누르거나, “비밀번호를 잊으셨나요?”로 비밀번호를 만드세요.");
  if(e && e.fromServer && e.message && (SERVER_MSG_CODES.includes(e.code) || !AUTH_ERRORS[e.code])) return e.message;
  const m = AUTH_ERRORS[e && e.code]; return m ? L(m[0],m[1]) : L("Something went wrong: ","오류: ")+((e&&e.code)||"unknown");
};
// same rule as the server (src/utils/password.js), checked before sending
function passwordProblem(pw, email){
  if(pw.length<8||pw.length>72) return L("Password must be 8–72 characters.","비밀번호는 8~72자여야 해요.");
  if(!/[A-Za-z]/.test(pw)||!/[0-9]/.test(pw)) return L("Password needs at least one letter and one number.","영문과 숫자를 각각 하나 이상 넣어 주세요.");
  const name=String(email||"").split("@")[0].toLowerCase();
  if(name.length>=3 && pw.toLowerCase().includes(name)) return L("Password must not contain your email name.","비밀번호에 이메일 아이디를 넣을 수 없어요.");
  return "";
}

/* ---------- state ---------- */
const state = {q:"",city:"",level:"",cats:new Set(),flags:new Set(),minPay:MIN_WAGE,sort:"new",limit:8,savedOnly:false};

/* ---------- static fills ---------- */
ALL_CITIES.forEach(c=>$("cityInput").insertAdjacentHTML("beforeend",`<option value="${c}">${c}</option>`));
function refreshStats(){
  const cities = new Set(JOBS.map(j=>j.city).filter(c=>c&&c!=="Remote"));
  $("statJobs").textContent = JOBS.length;
  $("statEnglish").textContent = JOBS.filter(j=>j.flags.includes("english")).length;
  $("statCities").textContent = cities.size;
  const hourly = JOBS.filter(j=>j.payType==="hourly");
  $("avgPay").textContent = won(hourly.reduce((s,j)=>s+j.pay,0)/Math.max(1,hourly.length))+"/hr";
}

function renderCats(){
  $("cats").innerHTML = Object.entries(CATS).map(([k,c])=>{
    const n = JOBS.filter(j=>j.cat===k).length;
    return `<button class="cat ${state.cats.has(k)?"on":""}" data-cat="${k}">
      <div class="ic" style="background:${c.bg};color:${c.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg></div>
      ${lang==="ko"?c.ko:c.en}<small>${n} ${L("jobs","건")}</small></button>`;
  }).join("");
  $("cats").querySelectorAll(".cat").forEach(b=>b.onclick=()=>{
    const k=b.dataset.cat; state.cats.has(k)?state.cats.delete(k):state.cats.add(k);
    state.limit=8; renderCats(); renderFilterCats(); render();
    $("jobs").scrollIntoView({behavior:"smooth"});
  });
}
function renderFilterCats(){
  $("fCats").innerHTML = Object.entries(CATS).map(([k,c])=>`<label class="chk"><input type="checkbox" data-c="${k}" ${state.cats.has(k)?"checked":""}> ${lang==="ko"?c.ko:c.en}</label>`).join("");
  $("fCats").querySelectorAll("input").forEach(i=>i.onchange=()=>{
    i.checked?state.cats.add(i.dataset.c):state.cats.delete(i.dataset.c); state.limit=8; renderCats(); render();
  });
}

/* ---------- filter + render ---------- */
function filtered(){
  const q = state.q.trim().toLowerCase();
  let list = JOBS.filter(j=>{
    if(state.savedOnly && !saved.includes(j.id)) return false;
    if(q){
      const hay = [j.title,j.ko,j.co,j.city,j.area,CATS[j.cat].en,CATS[j.cat].ko,j.desc,...j.flags.map(f=>flagLabel(f)),...j.flags].join(" ").toLowerCase();
      if(!q.split(/\s+/).every(w=>hay.includes(w))) return false;
    }
    if(state.city && j.city!==state.city) return false;
    if(state.level!=="" && j.lvl>Number(state.level)) return false;
    if(state.cats.size && !state.cats.has(j.cat)) return false;
    for(const f of state.flags) if(!j.flags.includes(f)) return false;
    if(state.minPay>MIN_WAGE && j.payType==="hourly" && j.pay<state.minPay) return false;
    return true;
  });
  if(state.sort==="pay") list.sort((a,b)=>hourlyEq(b)-hourlyEq(a));
  else if(state.sort==="korean") list.sort((a,b)=>a.lvl-b.lvl||hourlyEq(b)-hourlyEq(a));
  else if(state.sort==="near") list.sort((a,b)=>{ const da=jobDist(a), db=jobDist(b); return (da==null?1e9:da)-(db==null?1e9:db); });
  else list.sort((a,b)=>a.days-b.days||(b.live?1:0)-(a.live?1:0));
  return list;
}
const bookmark = on => `<svg viewBox="0 0 24 24" fill="${on?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>`;
function payHtml(j){
  const t = PAY_TYPES[j.payType];
  return `<span class="pay-type" style="color:${t.color}">${L(t.en,t.ko)}</span>${won(j.pay)}`;
}
// P9: an admin checked this employer's business → "✓ Verified employer"
const verBadge = j => j && j.verified ? ` <span class="verified-badge" title="${L("Our team checked this employer's business registration.","운영팀이 사업자 정보를 확인한 기업이에요.")}">✓ ${L("Verified employer","인증 기업")}</span>` : "";
const applied = id => !!(account && account.role==="student" && Array.isArray(account.applied) && account.applied.includes(id));
function jobCard(j){
  const c = CATS[j.cat], on = saved.includes(j.id);
  return `<article class="job" data-id="${esc(j.id)}">
    ${j.live?`<span class="badge-live">${L("NEW","신규")}</span>`:""}
    <button class="save ${on?"on":""}" data-save="${esc(j.id)}" aria-label="Save job">${bookmark(on)}</button>
    <div class="job-top">
      <div class="logo-sq" style="background:${c.color}">${esc(initials(j.co))}</div>
      <div style="padding-right:${j.live?70:30}px"><h3>${esc(lang==="ko"?j.ko:j.title)}</h3><div class="co">${esc(j.co)}${verBadge(j)} · ${esc(j.city)}${j.city!=="Remote"&&j.area?", "+esc(j.area):""}</div></div>
    </div>
    <div class="meta">
      ${applied(j.id)?`<span class="tag applied-tag">${L("Applied ✓","지원 완료 ✓")}</span>`:""}
      <span class="tag t-blue">${lvlLabel(j.lvl)}</span>
      ${j.flags.map(f=>`<span class="tag ${f==="english"?"t-teal":f==="weekend"?"t-brand":""}">${flagLabel(f)}</span>`).join("")}
      ${j.sample?`<span class="tag" style="background:none;border:1px dashed var(--line);color:var(--muted)">${L("Sample","예시")}</span>`:""}
    </div>
    <div class="tag" style="align-self:flex-start;background:none;padding:0;color:var(--muted)">🕒 ${esc(j.hours)}</div>
    <div class="job-foot"><div class="pay" style="font-size:16px">${payHtml(j)}</div><div class="posted">${jobDist(j)!=null?`<span class="dist">📍 ${fmtKm(jobDist(j))}</span> · `:""}${ago(j.days)}</div></div>
  </article>`;
}
function render(){
  const list = filtered();
  const shown = list.slice(0,state.limit);
  $("jobList").innerHTML = shown.length ? shown.map(jobCard).join("") :
    `<div class="empty"><b style="color:var(--ink);font-size:17px">${L("No jobs match these filters","조건에 맞는 공고가 없어요")}</b><br>${L("Try removing a filter or searching another city.","필터를 줄여 보세요.")}</div>`;
  $("count").innerHTML = state.savedOnly ? `${list.length} <span>${L("saved jobs","개 저장된 공고")}</span>` : `${list.length} <span>${L("jobs found","개 공고")}</span>`;
  $("moreBtn").style.display = list.length>state.limit?"block":"none";
  const chips=[];
  if(state.savedOnly) chips.push(["saved",L("Saved only","저장한 공고")]);
  if(state.q) chips.push(["q",`"${esc(state.q)}"`]);
  if(state.city) chips.push(["city",esc(state.city)]);
  if(state.level!=="") chips.push(["level",lvlLabel(Number(state.level))]);
  state.cats.forEach(c=>chips.push(["cat:"+c,lang==="ko"?CATS[c].ko:CATS[c].en]));
  state.flags.forEach(f=>chips.push(["flag:"+f,flagLabel(f)]));
  if(state.minPay>MIN_WAGE) chips.push(["pay",won(state.minPay)+"+"]);
  $("chips").innerHTML = chips.map(([k,l])=>`<button class="chip" data-k="${k}">${l}</button>`).join("");
  $("chips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
    const k=b.dataset.k;
    if(k==="saved") state.savedOnly=false;
    else if(k==="q"){state.q="";$("qInput").value=""}
    else if(k==="city"){state.city="";$("cityInput").value=""}
    else if(k==="level"){state.level="";$("levelInput").value=""}
    else if(k==="pay"){state.minPay=MIN_WAGE;$("payRange").value=MIN_WAGE;payLabel()}
    else if(k.startsWith("cat:")){state.cats.delete(k.slice(4));renderCats();renderFilterCats()}
    else if(k.startsWith("flag:")){state.flags.delete(k.slice(5));document.querySelector(`[data-flag="${k.slice(5)}"]`).checked=false}
    render();
  });
}
function renderAll(){
  rebuildJobs(); refreshStats(); renderCats(); renderFilterCats(); render(); renderAuth();
  if(document.body.classList.contains("dash")) renderDashboard();
}

$("jobList").addEventListener("click",e=>{
  const s = e.target.closest("[data-save]");
  if(s){ e.stopPropagation(); toggleSave(s.dataset.save); return; }
  const card = e.target.closest(".job"); if(card) openJob(card.dataset.id);
});
function toggleSave(id){
  const i = saved.indexOf(id);
  if(i>-1){saved.splice(i,1);toast(L("Removed from saved","저장 취소됨"))}
  else{saved.push(id);toast(L("Saved ★","저장됨 ★"))}
  persist(); render();
}

/* ---------- inputs ---------- */
$("heroSearch").onsubmit = e=>{e.preventDefault();state.q=$("qInput").value;state.city=$("cityInput").value;state.level=$("levelInput").value;state.limit=8;render();$("jobs").scrollIntoView({behavior:"smooth"})};
document.querySelectorAll(".popular button").forEach(b=>b.onclick=()=>{
  const q=b.dataset.q; state.q="";$("qInput").value="";
  const map={English:"english",Weekend:"weekend",Remote:"remote"};
  if(map[q]){state.flags.add(map[q]);document.querySelector(`[data-flag="${map[q]}"]`).checked=true}
  else if(q==="Tutor"){state.cats.add("tutor");renderCats();renderFilterCats()}
  else if(q==="Translation"){state.cats.add("translate");renderCats();renderFilterCats()}
  state.limit=8; render(); $("jobs").scrollIntoView({behavior:"smooth"});
});
document.querySelectorAll("[data-flag]").forEach(i=>i.onchange=()=>{i.checked?state.flags.add(i.dataset.flag):state.flags.delete(i.dataset.flag);state.limit=8;render()});
function payLabel(){$("payVal").textContent=won(state.minPay)+"+/hr"}
$("payRange").oninput = e=>{state.minPay=Number(e.target.value);payLabel();render()};
$("sort").onchange = async e=>{
  state.sort=e.target.value;
  if(state.sort==="near" && !userLoc){
    toast(L("Finding your location…","위치 찾는 중…"));
    try{ await getUserLocation(); }catch(err){ toast(err.message); state.sort="new"; e.target.value="new"; }
  }
  render();
};
$("moreBtn").onclick = ()=>{state.limit+=8;render()};
$("clearBtn").onclick = ()=>{
  Object.assign(state,{q:"",city:"",level:"",minPay:MIN_WAGE,limit:8,savedOnly:false});
  state.cats.clear();state.flags.clear();
  $("qInput").value="";$("cityInput").value="";$("levelInput").value="";$("payRange").value=MIN_WAGE;payLabel();
  document.querySelectorAll("[data-flag]").forEach(i=>i.checked=false);
  renderCats();renderFilterCats();render();
};
$("savedBtn").onclick = ()=>{showView("main");state.savedOnly=!state.savedOnly;state.limit=50;render();$("jobs").scrollIntoView({behavior:"smooth"})};
$("burger").onclick = ()=>$("navLinks").classList.toggle("open");
$("navLinks").querySelectorAll("a").forEach(a=>a.onclick=()=>{$("navLinks").classList.remove("open");showView("main")});

/* ---------- modal ---------- */
function closeModal(){if(typeof jobMap!=="undefined"&&jobMap){jobMap.remove();jobMap=null;}$("overlay").classList.remove("open");document.body.style.overflow="";$("modal").classList.remove("auth-modal")}
$("overlay").onclick = e=>{if(e.target.id==="overlay")closeModal()};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
function openModal(html,cls){if(typeof jobMap!=="undefined"&&jobMap){jobMap.remove();jobMap=null;}const m=$("modal");m.className="modal"+(cls?" "+cls:"");m.innerHTML=`<button class="x" aria-label="Close">✕</button>`+html;m.querySelector(".x").onclick=closeModal;$("overlay").classList.add("open");document.body.style.overflow="hidden";$("overlay").scrollTop=0}

function openJob(id){
  const j = JOBS.find(x=>x.id===id); if(!j) return;
  const c=CATS[j.cat], on=saved.includes(j.id), ko=lang==="ko", t=PAY_TYPES[j.payType];
  const isStudent = account && account.loggedIn && account.role==="student";
  const isEmployer = account && account.loggedIn && account.role==="employer";
  const pf = isStudent ? account.profile||{} : {};
  const done = applied(j.id);
  let applyBlock;
  if(isEmployer){
    applyBlock = `<div class="check-visa" style="margin-top:20px">${L("You're signed in as an employer. Students apply to jobs from a student account.","기업 회원으로 로그인되어 있어요. 지원은 개인(학생) 회원만 가능해요.")}</div>`;
  } else if(!isStudent){
    applyBlock = `<div style="margin-top:20px;border-top:1px solid var(--line);padding-top:18px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <span style="flex:1;min-width:200px;color:var(--ink-2)">${L("Log in as a student to apply with your profile.","학생 회원으로 로그인하고 프로필로 지원하세요.")}</span>
      <button class="btn btn-primary" id="mLogin">${L("Log in to apply","로그인하고 지원")}</button>
      <button class="btn btn-ghost" id="mSave">${on?L("Saved ★","저장됨 ★"):L("Save job","저장하기")}</button></div>`;
  } else {
    applyBlock = `<form class="apply-form" id="applyForm">
      <div class="check-visa">ℹ️ ${L("Applying as","지원자")}: <b>${esc(pf.name)}</b> · ${esc(pf.visa||"")} · ${esc(pf.topik||"")} — ${L("check this schedule fits your permitted hours first.","허용 근무시간 안인지 먼저 확인하세요.")}</div>
      <div class="inp"><label>${L("Short message to the employer","고용주에게 메시지")}</label><textarea name="msg" maxlength="600" placeholder="${L("When you can work, languages you speak…","언제 일할 수 있는지, 사용 가능한 언어 등")}"></textarea></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" type="submit" ${done?"disabled style='opacity:.6'":""}>${done?L("Already applied ✓","지원 완료 ✓"):L("Apply now","지원하기")}</button>
        <button class="btn btn-ghost" type="button" id="mSave">${on?L("Saved ★","저장됨 ★"):L("Save job","저장하기")}</button>
      </div></form>`;
  }
  openModal(`
    <div class="m-head"><div class="logo-sq" style="background:${c.color}">${esc(initials(j.co))}</div>
      <div><h3>${esc(ko?j.ko:j.title)}</h3><div class="co" style="color:var(--muted)">${esc(j.co)}${verBadge(j)} · ${esc(j.city)}${j.city!=="Remote"&&j.area?", "+esc(j.area):""}</div></div></div>
    <div class="meta"><span class="tag t-blue">${lvlLabel(j.lvl)}</span>${j.flags.map(f=>`<span class="tag">${flagLabel(f)}</span>`).join("")}${j.sample?`<span class="tag">${L("Sample listing","예시 공고")}</span>`:`<span class="tag t-brand">${L("Posted by employer","기업 등록 공고")}</span>`}</div>
    <div class="m-grid">
      <div><small style="color:${t.color}">${L(t.en,t.ko)}</small><b>${won(j.pay)}</b></div>
      <div><small>${L("Schedule","근무")}</small><b>${esc(j.hours)}</b></div>
      <div><small>${j.deadline?L("Deadline","마감"):L("Category","직종")}</small><b>${j.deadline?esc(j.deadline):(ko?c.ko:c.en)}</b></div>
    </div>
    <h4>${L("About the job","업무 내용")}</h4><p style="color:var(--ink-2);white-space:pre-line">${esc(j.desc)}</p>
    <h4>${L("Requirements","지원 조건")}</h4>
    <ul>
      <li>${L("D-2 or D-4 visa + part-time work permit (before your first shift)","D-2 또는 D-4 비자 + 시간제 취업 허가 (근무 시작 전)")}</li>
      <li>${lvlLabel(j.lvl)}${j.flags.includes("english")?L(" · English communication OK"," · 영어 의사소통 가능"):""}</li>
      <li>${j.flags.includes("noexp")?L("No experience needed — training provided","경력 무관, 교육 제공"):L("Related experience preferred","관련 경험 우대")}</li>
    </ul>
    ${jobMapHtml(j)}
    ${j.live&&(j.email||j.phone)?`<h4>${L("Employer contact","담당자 연락처")}</h4><p style="color:var(--ink-2)">${esc(j.email)}${j.email&&j.phone?" · ":""}${esc(j.phone)}</p>`:""}
    ${applyBlock}
    ${reportJobHtml(j)}`);
  initJobMap(j);
  bindReportJob(j);
  const ms=$("mSave"); if(ms) ms.onclick = ()=>{toggleSave(j.id);ms.textContent=saved.includes(j.id)?L("Saved ★","저장됨 ★"):L("Save job","저장하기")};
  const ml=$("mLogin"); if(ml) ml.onclick = ()=>openAuth("login");
  const af=$("applyForm"); if(af) af.onsubmit = async e=>{
    e.preventDefault(); if(done) return;
    const btn=af.querySelector("button[type=submit]"); btn.disabled=true;
    const sent = await submitApplication(j, af.elements.msg.value);
    if(!sent){ btn.disabled=false; return; }
    render();
    openModal(`<div class="success"><div class="tick">✓</div>
      <h3 style="font-size:22px">${j.live?L("Application sent","지원 완료"):L("Application recorded","지원 기록 완료")}, ${esc(pf.name)}!</h3>
      <p style="color:var(--muted);margin:8px 0 20px">${j.live
        ? L(`Your profile was sent to ${esc(j.co)}. They'll contact you by email or phone. After you get the job: get the contract, visit your international office, then apply for your permit on HiKorea.`,`${esc(j.co)}에 프로필이 전달됐어요. 이메일이나 전화로 연락이 올 거예요. 합격 후: 계약서 → 국제처 → 하이코리아 허가 신청.`)
        : L("This is a sample listing, so nothing was sent. For real jobs: get the contract, visit your international office, then apply for your permit on HiKorea.","예시 공고라 실제로 전송되지 않았어요. 실제 일자리라면 계약서 → 국제처 → 하이코리아 허가 신청 순서로 진행하세요.")}</p>
      <a href="#guide" class="btn btn-primary" id="toGuide">${L("See the permit guide","허가 가이드 보기")}</a></div>`);
    $("toGuide").onclick=closeModal;
  };
}

/* ---------- P9: "🚩 Report this job" (inside the job details) ---------- */
function reportJobHtml(j){
  if(!j.live || backend.mode!=="firebase" || (backend.uid && j.owner===backend.uid)) return "";
  return `<div class="report-job" id="rpBox"><button type="button" class="link-btn rp-link" id="rpOpen">🚩 ${L("Report this job","이 공고 신고하기")}</button>
    <form id="rpForm" class="rp-form" hidden>
      <label for="rpReason">${L("What's wrong with this job? (e.g. fake, unsafe, illegal pay, asks for money)","어떤 문제가 있나요? (예: 허위, 위험, 불법 급여, 돈 요구)")}</label>
      <textarea id="rpReason" maxlength="500" rows="3" required placeholder="${L("Tell our team what you noticed…","운영팀에 알려 주세요…")}"></textarea>
      <div class="rp-row"><small id="rpCount">0/500</small><span><button type="button" class="link-btn" id="rpCancel">${L("Cancel","취소")}</button>
        <button type="submit" class="btn btn-ghost btn-sm" id="rpSend">${L("Send report","신고 보내기")}</button></span></div>
      <p class="rp-msg" id="rpMsg" role="status"></p>
    </form></div>`;
}
function bindReportJob(j){
  const box=$("rpBox"); if(!box) return;
  const form=$("rpForm"), ta=$("rpReason"), msg=$("rpMsg");
  $("rpOpen").onclick=()=>{
    if(!(account && account.loggedIn)){ toast(L("Please log in to report a job.","신고하려면 로그인해 주세요.")); openAuth("login"); return; }
    form.hidden=!form.hidden; if(!form.hidden) ta.focus();
  };
  $("rpCancel").onclick=()=>{ form.hidden=true; };
  ta.oninput=()=>{ $("rpCount").textContent=`${ta.value.length}/500`; };
  form.onsubmit=async e=>{
    e.preventDefault();
    const reason=ta.value.trim(); if(!reason){ ta.focus(); return; }
    $("rpSend").disabled=true; msg.className="rp-msg"; msg.textContent="";
    let r, d={};
    try{ r=await fetch("/api/reports",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"job",targetId:j.id,ownerUid:j.owner,reason})}); d=await r.json().catch(()=>({})); }
    catch{ r=null; }
    $("rpSend").disabled=false;
    if(r && r.ok){ box.innerHTML=`<p class="rp-done">✓ ${L("Thanks. Our team will review this job.","신고해 주셔서 감사해요. 운영팀이 확인할게요.")}</p>`; return; }
    const st=r?r.status:0;
    msg.className="rp-msg bad";
    msg.textContent = !r ? L("Couldn't send. Check your connection.","보내지 못했어요. 연결을 확인해 주세요.")
      : st===409 ? L("You already reported this job. Our team will look at it.","이미 신고한 공고예요. 운영팀이 확인할게요.")
      : st===429 ? L("You can send 10 reports a day. Please try again tomorrow.","신고는 하루 10번까지 가능해요. 내일 다시 시도해 주세요.")
      : st===403 && d.code==="failed-precondition" ? L("Please verify your email first. Check your inbox (and spam).","먼저 이메일 인증을 해 주세요. 받은편지함(스팸함)을 확인하세요.")
      : st===401 ? L("Please log in again.","다시 로그인해 주세요.")
      : (d.error || L("Couldn't send the report.","신고를 보내지 못했어요."));
  };
}

/* ---------- auth (log in / sign up) ---------- */
const STUDENT_SVG = `<svg viewBox="0 0 120 120" class="illus"><circle cx="60" cy="60" r="58" fill="#fff1ec"/><circle cx="60" cy="50" r="22" fill="#ffd2c2"/><path d="M38 44c2-16 42-18 44 0-8-6-36-6-44 0Z" fill="#14213d"/><path d="M30 34l30-12 30 12-30 12z" fill="#14213d"/><path d="M84 36v14" stroke="#ff5a36" stroke-width="3"/><circle cx="52" cy="52" r="2.5" fill="#14213d"/><circle cx="68" cy="52" r="2.5" fill="#14213d"/><path d="M53 60q7 6 14 0" stroke="#14213d" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 112c4-24 60-24 64 0" fill="#ff5a36"/></svg>`;
const EMPLOYER_SVG = `<svg viewBox="0 0 120 120" class="illus"><circle cx="60" cy="60" r="58" fill="#e8eaf1"/><circle cx="60" cy="50" r="22" fill="#ffd2c2"/><path d="M38 46c0-22 44-22 44 0-6-10-38-10-44 0Z" fill="#3a4663"/><rect x="45" y="47" width="12" height="9" rx="3" fill="none" stroke="#14213d" stroke-width="2.5"/><rect x="63" y="47" width="12" height="9" rx="3" fill="none" stroke="#14213d" stroke-width="2.5"/><path d="M57 51h6" stroke="#14213d" stroke-width="2.5"/><path d="M53 62q7 5 14 0" stroke="#14213d" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 112c4-24 60-24 64 0" fill="#14213d"/><path d="M56 90l4 18 4-18-4-4z" fill="#ff5a36"/></svg>`;
const GOOGLE_SVG = `<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

function displayName(){
  if(!account) return "";
  if(account.role==="employer") return (myPosting()&&myPosting().company&&myPosting().company.name)||(account.profile&&account.profile.contact)||"Employer";
  return (account.profile&&account.profile.name)||"Student";
}

function renderAuth(){
  const a = $("authArea");
  if(account && account.loggedIn){
    const isEmp = account.role==="employer";
    const name = displayName();
    a.innerHTML = `<button class="user-btn" id="userBtn"><span class="avatar" style="background:${isEmp?"var(--ink)":"var(--brand)"}">${esc(initials(name))}</span><span class="uname">${esc(name.length>14?name.slice(0,13)+"…":name)}</span><span class="role-badge ${isEmp?"emp":""}">${isEmp?L("Employer","기업"):L("Student","학생")}</span></button>
      <div class="menu" id="userMenu">
        <div class="who"><b>${esc(name)}</b>${esc(backend.user&&backend.user.email||"")||(isEmp?L("Employer member","기업 회원"):L("Student member","개인 회원"))}</div>
        ${isEmp?`<button data-act="dash">📋 ${L("Employer dashboard","기업 대시보드")}</button><button data-act="post">＋ ${L("Post a new job","새 공고 등록")}</button><button data-act="editco">🏢 ${L("Edit company profile","기업 정보 수정")}</button>`
               :`<button data-act="saved">★ ${L("Saved jobs","저장한 공고")}</button><button data-act="editst">👤 ${L("Edit my profile","내 프로필 수정")}</button>`}
        <button data-act="logout" class="danger">${L("Log out","로그아웃")}</button>
      </div>`;
    $("userBtn").onclick = e=>{e.stopPropagation();$("userMenu").classList.toggle("open")};
    $("userMenu").querySelectorAll("button").forEach(b=>b.onclick=()=>{
      $("userMenu").classList.remove("open");
      const act=b.dataset.act;
      if(act==="dash") showView("dashboard");
      else if(act==="post"){showView("dashboard");startNewJob()}
      else if(act==="editco") openAuth("employer");
      else if(act==="editst") openAuth("student");
      else if(act==="saved") $("savedBtn").click();
      else if(act==="logout") doLogout();
    });
  } else {
    a.innerHTML = `<button class="btn btn-ghost btn-sm" id="loginBtn" style="display:inline-block">${L("Log in","로그인")}</button><button class="btn btn-dark btn-sm" id="signupBtn">${L("Sign up","회원가입")}</button>`;
    $("loginBtn").onclick = ()=>openAuth("login");
    $("signupBtn").onclick = ()=>openAuth("choose");
  }
}
document.addEventListener("click",()=>{const m=$("userMenu");if(m)m.classList.remove("open")});

function openAuth(step){
  if(backend.mode==="loading"){ toast(L("Loading… try again in a moment","잠시 후 다시 시도해 주세요")); return; }
  if(step==="login") return backend.mode==="firebase" ? loginForm() : localLogin();
  if(step==="choose") return chooser();
  if(step==="student") return studentForm();
  if(step==="employer") return employerForm();
}

function chooser(){
  const pending = account && account.pending;
  openModal(`<div class="auth-title"><span class="kick">${pending?L("One last step — choose your member type","마지막 단계 — 회원 유형을 선택하세요"):L("One account for every part-time job","모든 알바를 하나의 계정으로")}</span>
    <h3><span class="a">Work Abroad</span> <span class="b">Hub</span></h3></div>
    <div class="member-cards">
      <div class="member"><h4>${L("Student member","개인 회원")}</h4><p>${L("Create your profile and apply for part-time jobs.","프로필을 만들고 알바에 지원하세요.")}</p>${STUDENT_SVG}
        <button class="btn btn-primary" id="pickStudent">${L("Student sign up","개인 회원 가입")}</button></div>
      <div class="member"><h4>${L("Employer member","기업 회원")}</h4><p>${L("Post job openings and find international talent.","공고를 올리고 유학생 인재를 찾으세요.")}</p>${EMPLOYER_SVG}
        <button class="btn btn-dark" id="pickEmployer">${L("Employer sign up","기업 회원 가입")}</button></div>
    </div>
    <p class="auth-note">※ ${L("Employer membership includes sole proprietors and businesses hiring part-time workers.","기업 회원에는 알바를 채용하는 개인사업자와 사업장 담당자가 포함돼요.")}</p>
    ${pending?"":`<p class="auth-note">${L("Already have an account?","이미 계정이 있나요?")} <button class="link-btn" id="toLogin">${L("Log in","로그인")}</button></p>`}
    ${authNote()}`,"auth-modal");
  $("pickStudent").onclick = ()=>openAuth("student");
  $("pickEmployer").onclick = ()=>openAuth("employer");
  const tl=$("toLogin"); if(tl) tl.onclick = ()=>openAuth("login");
}

function loginForm(){
  openModal(`<div class="auth-title"><span class="kick">${L("Log in","로그인")}</span>
    <h3><span class="a">Work Abroad</span> <span class="b">Hub</span></h3></div>
    <form class="pform" id="loginForm" novalidate style="max-width:560px;margin:0 auto">
      ${rowHtml(L("Email","이메일"),`<input name="email" type="email" autocomplete="email" placeholder="you@example.com">`,1)}
      ${rowHtml(L("Password","비밀번호"),`<input name="password" type="password" autocomplete="current-password">`,1)}
      <div class="err show" id="loginErr" style="text-align:center;color:#e03131;font-size:14px;min-height:18px"></div>
      <div class="form-actions"><button class="btn btn-primary" type="submit" id="loginSubmit">${L("Log in","로그인")}</button></div>
      <div class="or"><span>${L("or","또는")}</span></div>
      <div style="text-align:center"><button type="button" class="btn btn-ghost google-btn" id="gLogin">${GOOGLE_SVG} ${L("Continue with Google","Google로 계속하기")}</button></div>
    </form>
    <p class="auth-note"><button class="link-btn" id="forgotBtn">${L("Forgot password?","비밀번호를 잊으셨나요?")}</button> · ${L("No account?","계정이 없나요?")} <button class="link-btn" id="toSignup">${L("Sign up","회원가입")}</button></p>
    ${authNote()}`,"auth-modal");
  const F=backend.fb, f=$("loginForm");
  $("toSignup").onclick = ()=>openAuth("choose");
  $("forgotBtn").onclick = async ()=>{
    const email=f.elements.email.value.trim();
    if(!EMAIL_RE.test(email)){ $("loginErr").textContent=L("Type your email above first.","위에 이메일을 먼저 입력해 주세요."); return; }
    try{ await F.sendPasswordResetEmail(backend.auth,email); $("loginErr").style.color="var(--teal)"; $("loginErr").textContent=L("If this email has an account, we sent a reset link. It works for 30 minutes — check your inbox (and spam).","이 이메일로 가입된 계정이 있으면 재설정 링크를 보냈어요. 30분 동안 유효해요. 받은편지함(스팸함)을 확인해 주세요."); }
    catch(e){ $("loginErr").textContent=authErr(e); }
  };
  $("gLogin").onclick = async ()=>{
    $("loginErr").textContent="";
    backend.awaitingLogin=true;
    try{ await F.signInWithPopup(backend.auth,new F.GoogleAuthProvider()); }
    catch(e){ backend.awaitingLogin=false; $("loginErr").textContent=authErr(e); }
  };
  f.onsubmit = async e=>{
    e.preventDefault();
    const email=f.elements.email.value.trim(), pw=f.elements.password.value;
    if(!EMAIL_RE.test(email)||!pw){ $("loginErr").textContent=L("Enter your email and password.","이메일과 비밀번호를 입력해 주세요."); return; }
    $("loginSubmit").disabled=true; $("loginErr").textContent="";
    backend.awaitingLogin=true;
    try{ await F.signInWithEmailAndPassword(backend.auth,email,pw); }
    catch(err){ backend.awaitingLogin=false; $("loginErr").textContent=authErr(err); }
    $("loginSubmit").disabled=false;
  };
}

function localLogin(){
  if(!(account && account.role)) return chooser();
  const isEmp = account.role==="employer", name = displayName();
  openModal(`<div class="auth-title"><span class="kick">${L("Welcome back","다시 오신 걸 환영해요")}</span></div>
    <div class="welcome-back"><div class="avatar" style="background:${isEmp?"var(--ink)":"var(--brand)"}">${esc(initials(name))}</div>
    <h3 style="font-size:22px">${esc(name)}</h3><p style="color:var(--muted);margin:4px 0 20px">${isEmp?L("Employer member","기업 회원"):L("Student member","개인 회원")}</p>
    <button class="btn ${isEmp?"btn-dark":"btn-primary"}" id="contBtn" style="min-width:240px;padding:15px">${L("Continue","계속하기")}</button>
    <div style="margin-top:14px"><button class="back-link" id="switchBtn">${L("Use a different member type →","다른 회원 유형으로 가입 →")}</button></div></div>
    ${authNote()}`,"auth-modal");
  $("contBtn").onclick = ()=>{account.loggedIn=true;saveAccount();closeModal();renderAll();toast(L("Welcome back, ","환영해요, ")+name);if(isEmp)showView("dashboard")};
  $("switchBtn").onclick = ()=>chooser();
}

function authNote(){
  return backend.mode==="firebase"
    ? `<p class="auth-note">🔒 ${L("Accounts are secured by Firebase Authentication. Your student profile is only visible to you and the employers you apply to.","Firebase 인증으로 보호돼요. 학생 프로필은 본인과 지원한 기업만 볼 수 있어요.")}</p>`
    : `<p class="auth-note">ℹ️ ${L("Preview mode: accounts and jobs are saved on this device only.","미리보기 모드: 계정과 공고가 이 기기에만 저장돼요.")}</p>`;
}

function rowHtml(label,inner,req,errId){return `<div class="prow"><label>${label}${req?' <span class="req">*</span>':""}</label><div>${inner}${errId?`<div class="err" id="${errId}"></div>`:""}</div></div>`}
function citySelect(name,val){return `<select name="${name}">${ALL_CITIES.filter(c=>c!=="Remote").map(c=>`<option ${c===val?"selected":""}>${c}</option>`).join("")}</select>`}
function fieldErr(form,name,msg){const i=form.elements[name];const e=$("err_"+name);if(i)i.classList.toggle("bad",!!msg);if(e){e.textContent=msg||"";e.classList.toggle("show",!!msg)}return !msg}
// business registration number: exactly 10 digits, saved as 123-45-67890 (same as normalizeBiz in src/utils/bizno.js)
function normalizeBiz(s){ const t=String(s??"").normalize("NFKC").trim(); if(!/^[\d\s.\-‐-―−]+$/.test(t)) return null;
  const d=t.replace(/\D/g,""); return d.length===10 ? `${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}` : null; }
const validBizNo = s => normalizeBiz(s)!==null;
function formatBizTyping(raw){ const d=String(raw).normalize("NFKC").replace(/\D/g,"").slice(0,10);
  return d.length<4 ? d : d.length<6 ? `${d.slice(0,3)}-${d.slice(3)}` : `${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}`; }
function wireBizFormat(form){
  const el=form && form.elements.biz; if(!el) return;
  if(el.value) el.value=normalizeBiz(el.value)||el.value;
  el.addEventListener("input", ()=>{ if(!/[a-z가-힣]/i.test(el.value)) el.value=formatBizTyping(el.value); fieldErr(form,"biz",""); });
}
const PHONE_RE=/^010-?\d{4}-?\d{4}$/, EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Does this form need to create a login (email + password) as well as the profile?
const needsCredentials = () => backend.mode==="firebase" && !backend.user;

function credentialRows(){
  if(!needsCredentials()) return "";
  return `<div class="google-top"><button type="button" class="btn btn-ghost google-btn" id="gSignup">${GOOGLE_SVG} ${L("Sign up with Google","Google로 가입하기")}</button><span>${L("or create a password below","또는 아래에서 비밀번호를 만드세요")}</span></div>
    ${rowHtml(L("Password","비밀번호"),`<input name="password" type="password" autocomplete="new-password" placeholder="${L("8+ characters, a letter and a number","8자 이상, 영문+숫자")}">`,1,"err_password")}
    ${rowHtml(L("Confirm password","비밀번호 확인"),`<input name="password2" type="password" autocomplete="new-password">`,1,"err_password2")}`;
}
function wireGoogleSignup(role){
  const g=$("gSignup"); if(!g) return;
  g.onclick = async ()=>{
    backend.signupRole = role;
    try{ await backend.fb.signInWithPopup(backend.auth,new backend.fb.GoogleAuthProvider()); }
    catch(e){ backend.signupRole=null; toast(authErr(e)); }
  };
}
function checkPasswords(f){
  if(!needsCredentials()) return true;
  const pw=f.elements.password.value, pw2=f.elements.password2.value;
  const em=(f.querySelector('input[type="email"]')||{}).value||"";
  return [fieldErr(f,"password",passwordProblem(pw, em)),
          fieldErr(f,"password2",pw===pw2?"":L("Passwords don't match.","비밀번호가 일치하지 않아요."))].every(Boolean);
}
// Creates the Firebase login when needed. Returns true when the user is signed in and ready.
async function ensureSignedIn(f, emailField){
  if(!needsCredentials()) return true;
  backend.signingUp = true;
  try{
    const cred = await backend.fb.createUserWithEmailAndPassword(backend.auth, f.elements[emailField].value.trim(), f.elements.password.value);
    backend.user = cred.user; backend.uid = cred.user.uid;
    return true;
  }catch(e){
    backend.signingUp = false;
    const msg = authErr(e);
    if(e && (e.code==="auth/weak-password")) fieldErr(f,"password",msg); else fieldErr(f,emailField,msg);
    return false;
  }
}

function studentForm(){
  const editing = account && account.role==="student" && account.loggedIn;
  if(account && account.role==="employer" && account.loggedIn && !confirmSwitch()) return;
  const p = (editing && account.profile) || {};
  const prefillEmail = (backend.user&&backend.user.email) || p.email || (account&&account.email) || "";
  const prefillName = p.name || (account&&account.displayName) || "";
  const years=[];for(let y=2010;y>=1960;y--)years.push(y);
  const [by,bm,bd] = (p.birth||"2001-1-1").split("-").map(Number);
  openModal(`<button class="back-link" id="backBtn">← ${L("Back","뒤로")}</button>
    <h3 style="font-size:28px;letter-spacing:-.02em">${editing?L("Edit my profile","내 프로필 수정"):L("Welcome!","환영해요!")}</h3>
    <p style="color:var(--muted);margin:4px 0 18px">${L("The first step of applying for a part-time job is filling out your profile.","알바 지원의 첫 단계는 프로필 작성이에요.")}</p>
    <form class="pform" id="stForm" novalidate>
      ${rowHtml(L("Name","이름"),`<input name="name" maxlength="50" value="${esc(prefillName)}" placeholder="${L("Full name as on your ARC","외국인등록증상 이름")}">`,1,"err_name")}
      ${rowHtml(L("Email","이메일"),`<input name="email" type="email" maxlength="80" value="${esc(prefillEmail)}" placeholder="you@school.ac.kr" ${backend.user&&backend.user.email?"readonly":""}>${backend.user&&backend.user.email?`<small class="field-note">${backend.user.emailVerified?"✅ "+L("Verified login email","인증된 로그인 이메일"):"✉️ "+L("Your login email: confirm it with the code we emailed you","로그인 이메일: 메일로 받은 코드로 인증하세요")}</small>`:""}`,1,"err_email")}
      ${credentialRows()}
      ${rowHtml(L("Birth date","생년월일"),`<div class="trip"><select name="by">${years.map(y=>`<option ${y===by?"selected":""}>${y}</option>`).join("")}</select><select name="bm">${Array.from({length:12},(_,i)=>`<option ${i+1===bm?"selected":""}>${i+1}</option>`).join("")}</select><select name="bd">${Array.from({length:31},(_,i)=>`<option ${i+1===bd?"selected":""}>${i+1}</option>`).join("")}</select></div>`,1)}
      ${rowHtml(L("Gender","성별"),`<div class="seg" id="genderSeg"><button type="button" data-g="male" class="${p.gender==="male"?"on":""}">${L("Male","남성")}</button><button type="button" data-g="female" class="${p.gender==="female"?"on":""}">${L("Female","여성")}</button><button type="button" data-g="other" class="${p.gender==="other"?"on":""}">${L("Prefer not to say","선택 안 함")}</button></div>`,0)}
      ${rowHtml(L("City","거주 지역"),citySelect("city",p.city||"Seoul"),1)}
      ${rowHtml(L("Address","상세 주소"),`<input name="address" maxlength="80" value="${esc(p.address)}" placeholder="${L("e.g. 부산 남구 대연동","예: 부산 남구 대연동")}">`,0)}
      ${rowHtml(L("Phone number","휴대폰 번호"),`<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="13" value="${esc(p.phone)}" placeholder="010-1234-5678">`,1,"err_phone")}
      ${rowHtml(L("Visa","비자"),`<select name="visa">${["D-2","D-4"].map(v=>`<option ${v===p.visa?"selected":""}>${v}</option>`).join("")}</select>`,1)}
      ${rowHtml(L("Korean level","한국어 수준"),`<select name="topik">${["No TOPIK","TOPIK 1","TOPIK 2","TOPIK 3","TOPIK 4","TOPIK 5","TOPIK 6"].map(v=>`<option ${v===p.topik?"selected":""}>${v}</option>`).join("")}</select>`,1)}
      ${rowHtml(L("School","학교"),`<input name="school" maxlength="60" value="${esc(p.school)}" placeholder="${L("University or language institute","대학교 또는 어학당")}">`,0)}
      ${rowHtml(L("How did you hear about us?","가입 경로"),`<select name="source"><option value="">${L("Please select","선택해 주세요")}</option>${["International office","Friend","Instagram / TikTok","Search engine","Other"].map(v=>`<option ${v===p.source?"selected":""}>${v}</option>`).join("")}</select>`,0)}
      <div class="form-actions"><button type="button" class="btn btn-ghost" id="cancelBtn">${L("Cancel","취소")}</button><button class="btn btn-primary" type="submit" id="stSubmit">${editing?L("Save changes","저장"):L("Complete sign up","가입 완료")}</button></div>
    </form>${authNote()}`,"auth-modal");
  let gender = p.gender||"";
  $("genderSeg").querySelectorAll("button").forEach(b=>b.onclick=()=>{gender=b.dataset.g;$("genderSeg").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b))});
  $("backBtn").onclick = ()=>editing?closeModal():chooser();
  $("cancelBtn").onclick = closeModal;
  wireGoogleSignup("student");
  wireEmailCheck($("stForm")); wireMobileFormat($("stForm"));
  $("stForm").onsubmit = async e=>{
    e.preventDefault(); const f=e.target, v=n=>f.elements[n].value.trim();
    const ok = [fieldErr(f,"name",v("name")?"":L("Please enter your name.","이름을 입력해 주세요.")),
      fieldErr(f,"email",EMAIL_RE.test(v("email"))?"":L("Please enter a valid email.","올바른 이메일을 입력해 주세요.")),
      fieldErr(f,"phone",PHONE_RE.test(v("phone"))?"":L("Please enter a Korean mobile number that starts with 010 (010-1234-5678).","010으로 시작하는 휴대폰 번호를 입력해 주세요 (010-1234-5678).")),
      checkPasswords(f)].every(Boolean);
    if(!ok) return;
    $("stSubmit").disabled=true;
    if(!(await emailLooksReal(f))){ $("stSubmit").disabled=false; return; }
    if(!(await ensureSignedIn(f,"email"))){ $("stSubmit").disabled=false; return; }
    account = {role:"student",loggedIn:true,applied:(editing&&account.applied)||[],createdAt:(editing&&account.createdAt)||Date.now(),
      profile:{name:v("name"),birth:`${v("by")}-${v("bm")}-${v("bd")}`,gender,email:v("email"),city:v("city"),address:v("address"),phone:v("phone"),visa:v("visa"),topik:v("topik"),school:v("school"),source:v("source")}};
    await saveAccount();
    backend.signingUp=false;
    closeModal(); renderAll();
    toast(editing?L("Profile saved","프로필이 저장됐어요"):L(`Welcome, ${account.profile.name}!`,`환영해요, ${account.profile.name}님!`));
    if(needsEmailCode()) askEmailCode(); else if(needsPhoneCode()) askPhoneCode();
  };
}
function confirmSwitch(){
  return window.__switchOk === true || (openSwitchConfirm(), false);
}
function openSwitchConfirm(){
  const from = account.role==="employer"?L("employer","기업"):L("student","학생");
  openModal(`<h3 style="font-size:20px;margin-bottom:8px">${L("Switch member type?","회원 유형을 바꿀까요?")}</h3>
    <p style="color:var(--ink-2)">${L(`This account is a ${from} member. One account can be one type at a time. Switching closes your posted jobs; they stay saved until you switch back.`,`이 계정은 ${from} 회원이에요. 한 계정은 한 유형만 가능해요.`)}</p>
    <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-ghost" id="noSw">${L("Keep current","유지")}</button><button class="btn btn-dark" id="yesSw">${L("Switch","바꾸기")}</button></div>`);
  const target = account.role==="employer"?"student":"employer";
  $("noSw").onclick = closeModal;
  $("yesSw").onclick = ()=>{
    window.__switchOk=true;
    if(account.role==="employer"){ const mp=myPosting(); if(mp){ const p=JSON.parse(JSON.stringify(mp)); (p.jobs||[]).forEach(j=>j.status="closed"); savePosting(p);} }
    account = {pending:true, loggedIn:false, email:(backend.user&&backend.user.email)||""};
    target==="student"?studentForm():employerForm(); window.__switchOk=false;
  };
}

function employerForm(){
  const editing = account && account.role==="employer" && account.loggedIn;
  if(account && account.role==="student" && account.loggedIn && !confirmSwitch()) return;
  const c = (myPosting()&&myPosting().company) || (editing&&account.profile) || {};
  const prefillEmail = c.email || (account&&account.email) || (backend.user&&backend.user.email) || "";
  openModal(`<button class="back-link" id="backBtn">← ${L("Back","뒤로")}</button>
    <h3 style="font-size:28px;letter-spacing:-.02em">${editing?L("Company profile","기업 정보"):L("Employer sign up","기업 회원 가입")}</h3>
    <p style="color:var(--muted);margin:4px 0 18px">${L("Students see your company name and contact details on every job you post.","등록한 공고마다 회사명과 연락처가 학생에게 보여요.")}</p>
    <form class="pform" id="emForm" novalidate>
      ${rowHtml(L("Email","이메일"),`<input name="email" type="email" maxlength="80" value="${esc(prefillEmail)}" placeholder="hr@company.kr">`,1,"err_email")}
      ${credentialRows()}
      ${rowHtml(L("Company / store name","상호명"),`<input name="name" maxlength="60" value="${esc(c.name)}" placeholder="${L("e.g. Mapo Roasters","예: 마포 로스터스")}">`,1,"err_name")}
      ${rowHtml(L("Business reg. no.","사업자등록번호"),`<input name="biz" inputmode="numeric" autocomplete="off" maxlength="14" value="${esc(c.biz)}" placeholder="123-45-67890">`,1,"err_biz")}
      ${rowHtml(L("Business type","업종"),`<select name="type">${Object.entries(CATS).map(([k,v])=>`<option value="${k}" ${k===c.type?"selected":""}>${lang==="ko"?v.ko:v.en}</option>`).join("")}</select>`,1)}
      ${rowHtml(L("Contact person","담당자 이름"),`<input name="contact" maxlength="40" value="${esc(c.contact||(account&&account.displayName)||"")}">`,1,"err_contact")}
      ${rowHtml(L("Phone number","연락처"),`<input name="phone" maxlength="13" value="${esc(c.phone)}" placeholder="010-1234-5678 / 02-123-4567">`,1,"err_phone")}
      ${rowHtml(L("City","지역"),citySelect("city",c.city||"Seoul"),1)}
      ${rowHtml(L("Address","주소"),`<input name="address" maxlength="80" value="${esc(c.address)}">`,0)}
      ${rowHtml(L("Languages spoken at work","사용 언어"),`<input name="langs" maxlength="60" value="${esc(c.langs)}" placeholder="Korean, English">`,0)}
      <div class="form-actions"><button type="button" class="btn btn-ghost" id="cancelBtn">${L("Cancel","취소")}</button><button class="btn btn-dark" type="submit" id="emSubmit">${editing?L("Save changes","저장"):L("Create employer account","기업 회원 가입")}</button></div>
    </form>${authNote()}`,"auth-modal");
  $("backBtn").onclick = ()=>editing?closeModal():chooser();
  $("cancelBtn").onclick = closeModal;
  wireGoogleSignup("employer"); wireEmailCheck($("emForm")); wireBizFormat($("emForm"));
  $("emForm").onsubmit = async e=>{
    e.preventDefault(); const f=e.target, v=n=>f.elements[n].value.trim();
    const ok = [fieldErr(f,"email",EMAIL_RE.test(v("email"))?"":L("Please enter a valid email.","올바른 이메일을 입력해 주세요.")),
      checkPasswords(f),
      fieldErr(f,"name",v("name")?"":L("Please enter your company name.","상호명을 입력해 주세요.")),
      fieldErr(f,"biz",validBizNo(v("biz"))?"":L("Enter the 10-digit business registration number.","사업자등록번호 10자리를 입력해 주세요.")),
      fieldErr(f,"contact",v("contact")?"":L("Please enter a contact name.","담당자 이름을 입력해 주세요.")),
      fieldErr(f,"phone",/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v("phone"))?"":L("Please enter a phone number.","연락처를 입력해 주세요."))].every(Boolean);
    if(!ok) return;
    $("emSubmit").disabled=true;
    if(!(await emailLooksReal(f))){ $("emSubmit").disabled=false; return; }
    if(!(await ensureSignedIn(f,"email"))){ $("emSubmit").disabled=false; return; }
    const company = {name:v("name"),biz:normalizeBiz(v("biz")),type:v("type"),contact:v("contact"),email:v("email"),phone:v("phone"),city:v("city"),address:v("address"),langs:v("langs")};
    account = {role:"employer",loggedIn:true,createdAt:(editing&&account.createdAt)||Date.now(),profile:{contact:company.contact}};
    await saveAccount();                       // the role must be saved before the posting (rules check it)
    const mp = myPosting();
    const p = mp ? JSON.parse(JSON.stringify(mp)) : {jobs:[]};
    p.company = company; delete p.uid;
    await savePosting(p);
    backend.signingUp=false;
    watchApplications();
    closeModal(); renderAll();
    toast(editing?L("Company profile saved","기업 정보가 저장됐어요"):L("Employer account created — post your first job!","기업 회원 가입 완료! 첫 공고를 올려보세요."));
    showView("dashboard"); if(!editing){ startNewJob(); askEmailCode(); }
  };
}

/* ---------- employer dashboard ---------- */
function setDashBanner(kind,msg){ $("dashBanner").innerHTML = msg?`<div class="banner ${kind}">${esc(msg)}</div>`:"" }
function showView(v){
  if(v==="dashboard"){
    if(!(account&&account.loggedIn&&account.role==="employer")){ openAuth("login"); return; }
    document.body.classList.add("dash"); renderDashboard(); window.scrollTo(0,0); ensureFormMap();
    if(location.hash!=="#dashboard") history.replaceState(null,"","#dashboard");
  } else {
    document.body.classList.remove("dash");
    if(location.hash==="#dashboard") history.replaceState(null,"","#top");
  }
}
window.addEventListener("hashchange",()=>{ if(location.hash==="#dashboard") showView("dashboard"); else document.body.classList.remove("dash"); });
$("dashBack").onclick = ()=>{showView("main");window.scrollTo(0,0)};
$("dashNew").onclick = ()=>startNewJob();
$("editCo").onclick = ()=>openAuth("employer");
$("postJobBtn").onclick = ()=>{
  if(account&&account.loggedIn&&account.role==="employer"){showView("dashboard");startNewJob()}
  else if(account&&account.role==="employer") openAuth("login");
  else openAuth("employer");
};
Object.entries(CATS).forEach(([k,c])=>$("jfCat").insertAdjacentHTML("beforeend",`<option value="${k}">${c.en}</option>`));
ALL_CITIES.forEach(c=>$("jfCity").insertAdjacentHTML("beforeend",`<option>${c}</option>`));

let editingJob = null;
function renderDashboard(){
  const mp = myPosting(); const co = (mp&&mp.company)||{};
  $("dashTitle").textContent = co.name ? co.name : "Your job postings";
  $("coInfo").innerHTML = [["Business no.",co.biz],["Business type",CATS[co.type]?CATS[co.type].en:""],["Contact",co.contact],["Email",co.email],["Phone",co.phone],["Location",[co.city,co.address].filter(Boolean).join(", ")],["Languages",co.langs]]
    .filter(r=>r[1]).map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join("") || `<p style="color:var(--muted)">No company profile yet.</p>`;
  const jobs = (mp&&Array.isArray(mp.jobs)?mp.jobs:[]).slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $("kOpen").textContent = jobs.filter(j=>j.status==="open").length;
  $("kClosed").textContent = jobs.filter(j=>j.status!=="open").length;
  $("kTotal").textContent = jobs.length;
  $("myJobs").innerHTML = jobs.length ? jobs.map(j=>{
    const t=PAY_TYPES[j.payType]||PAY_TYPES.hourly;
    const expired = j.deadline && new Date(j.deadline+"T23:59:59")<new Date();
    const jst = expired ? "expired" : j.status==="open" ? "open" : "closed";
    const soon = jst==="open" && j.deadline && (new Date(j.deadline+"T23:59:59")-Date.now())<7*86400000;
    return `<div class="my-job" data-jst="${jst}"${soon?' data-soon="1"':""}><div class="logo-sq" style="background:${(CATS[j.cat]||CATS.office).color};width:40px;height:40px;font-size:13px">${esc(initials(co.name||"WA"))}</div>
      <div class="info"><h4>${esc(j.title)}</h4><small>${esc(j.city)}${j.area?", "+esc(j.area):""} · <span style="color:${t.color};font-weight:700">${t.en}</span> ${won(j.pay)} · ${esc(j.hours)}${j.deadline?` · ${expired?"expired":"until"} ${esc(j.deadline)}`:""}</small></div>
      ${j.hiddenByAdmin?`<span class="status closed hidden-admin" title="${esc((j.hiddenInfo&&j.hiddenInfo.reason)||"")}">🛡️ ${L("Hidden by admin","관리자가 숨김")}</span>`
        :`<span class="status ${j.status==="open"&&!expired?"open":"closed"}">${j.status==="open"&&!expired?"Open":"Closed"}</span>`}
      <button class="icon-btn" data-edit="${esc(j.id)}">Edit</button>
      ${j.hiddenByAdmin?"":`<button class="icon-btn" data-toggle="${esc(j.id)}">${j.status==="open"?"Close":"Reopen"}</button>`}
      <button class="icon-btn del" data-del="${esc(j.id)}">Delete</button>
      ${j.hiddenByAdmin&&j.hiddenInfo&&j.hiddenInfo.reason?`<small class="hidden-why">${L("Reason","사유")}: ${esc(j.hiddenInfo.reason)}</small>`:""}</div>`;
  }).join("") : `<div class="empty" style="padding:30px">No jobs posted yet. Use the form below to publish your first job — it appears on the job board right away.</div>`;
  $("myJobs").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>startEditJob(b.dataset.edit));
  $("myJobs").querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>updateJob(b.dataset.toggle,j=>{j.status=j.status==="open"?"closed":"open"},"Job updated"));
  $("myJobs").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{
    if(b.dataset.armed){ deleteJob(b.dataset.del); return; }
    b.dataset.armed="1"; b.textContent="Confirm delete"; b.style.borderColor="#c0392b"; b.style.color="#c0392b";
    setTimeout(()=>{ if(b.isConnected){delete b.dataset.armed;b.textContent="Delete";b.style.cssText=""} },3000);
  });
  setDashBanner(backend.mode==="local"?"info":"", backend.mode==="local" ? "Preview mode: "+(backend.note||"jobs are saved on this device only.") : "");
  renderApplications();
}
const APP_STATUS = {new:"New",contacted:"Contacted",interview:"Interview",hired:"Hired",rejected:"Not selected"};
function renderApplications(){
  const list = applications.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $("appCount").textContent = list.filter(a=>a.status==="new").length || "";
  $("appCount").style.display = $("appCount").textContent ? "inline-grid" : "none";
  $("appList").innerHTML = list.length ? list.map(a=>`<div class="app-row">
      <div class="app-main">
        <div class="app-top"><b>${esc(a.name)}</b><span class="tag t-blue">${esc(a.visa)}</span><span class="tag">${esc(a.topik)}</span>${a.status==="new"?'<span class="tag t-brand">NEW</span>':""}</div>
        <small>${L("Applied for","지원 공고")}: <b>${esc(a.jobTitle)}</b> · ${new Date(a.createdAt||Date.now()).toLocaleDateString()}${a.school?" · "+esc(a.school):""}</small>
        <div class="app-contact">✉️ <a href="mailto:${esc(a.email)}">${esc(a.email)}</a> &nbsp; 📞 ${esc(a.phone)}</div>
        ${a.message?`<p class="app-msg">“${esc(a.message)}”</p>`:""}
      </div>
      <select class="app-status" data-app="${esc(a.id)}">${Object.entries(APP_STATUS).map(([k,v])=>`<option value="${k}" ${a.status===k?"selected":""}>${v}</option>`).join("")}</select>
    </div>`).join("") : `<div class="empty" style="padding:24px">No applications yet. When a student applies to one of your jobs, it shows up here.</div>`;
  $("appList").querySelectorAll(".app-status").forEach(sel=>sel.onchange=()=>setApplicationStatus(sel.dataset.app, sel.value));
}
function updateJob(id,fn,msg){
  const mp=myPosting(); if(!mp) return;
  const p=JSON.parse(JSON.stringify(mp)); const j=(p.jobs||[]).find(x=>String(x.id)===id); if(!j) return;
  fn(j); savePosting(p).then(ok=>{ if(ok) toast(msg) }); renderDashboard();
}
function deleteJob(id){
  const mp=myPosting(); if(!mp) return;
  const p=JSON.parse(JSON.stringify(mp)); p.jobs=(p.jobs||[]).filter(x=>String(x.id)!==id);
  if(editingJob===id) startNewJob(true);
  savePosting(p).then(ok=>{ if(ok) toast("Job deleted") }); renderDashboard();
}
function startNewJob(silent){
  editingJob=null; const f=$("jobForm"); f.reset();
  const co=(myPosting()&&myPosting().company)||{};
  if(co.city) f.elements.city.value=co.city; if(co.type) f.elements.cat.value=co.type;
  setFormPin(null); centerFormMapOnCity(); updateMinPayHint();
  $("jobFormTitle").textContent="Post a new job"; $("jfSubmit").textContent="Publish job"; $("jfCancel").style.display="none"; $("jfErr").textContent="";
  if(!silent) $("jobFormPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function startEditJob(id){
  const mp=myPosting(); const j=mp&&(mp.jobs||[]).find(x=>String(x.id)===id); if(!j) return;
  editingJob=id; const f=$("jobForm");
  ["title","ko","cat","city","area","hours","payType","pay","payHours","lvl","deadline","desc"].forEach(k=>{ if(f.elements[k]) f.elements[k].value = j[k]==null?"":j[k] });
  updateMinPayHint();
  FLAGS.forEach(fl=>f.elements["f_"+fl].checked=(j.flags||[]).includes(fl));
  ensureFormMap(); if(j.lat!=null && j.lng!=null) setFormPin(+j.lat,+j.lng,16); else { setFormPin(null); centerFormMapOnCity(); }
  $("jobFormTitle").textContent="Edit job"; $("jfSubmit").textContent="Save changes"; $("jfCancel").style.display="inline-block"; $("jfErr").textContent="";
  $("jobFormPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
$("jfCancel").onclick = ()=>startNewJob();
$("jobForm").onsubmit = async e=>{
  e.preventDefault(); const f=e.target, v=n=>f.elements[n].value.trim();
  const err = m=>{$("jfErr").textContent=m;return false};
  if(!v("title")) return err("Please enter a job title.");
  if(!v("area")) return err("Please enter the district or area.");
  if(!v("hours")) return err("Please enter the schedule.");
  if(!v("desc")) return err("Please add a short job description.");
  if(v("city")!=="Remote" && !formPos) return err("Click the map to pin where the workplace is (or use \"Use my current location\").");
  const pay=Number(v("pay")), type=v("payType");
  if(!(pay>0)) return err("Please enter the pay amount.");
  const payHours=Number(v("payHours"));
  if(type!=="hourly" && !(payHours>0)) return err(type==="daily"?"Enter how many hours per day this job is.":"Enter how many hours per week this job is.");
  const minPay=minPayFor(type,payHours);
  if(pay<minPay) return err(`Pay is below this year's minimum wage. For this job it must be at least ${won(minPay)}.`);
  const mp=myPosting();
  if(!mp||!mp.company){ openAuth("employer"); return; }
  const p=JSON.parse(JSON.stringify(mp)); p.jobs=Array.isArray(p.jobs)?p.jobs:[];
  if(p.jobs.length>=50 && !editingJob) return err("You can have up to 50 postings. Delete old ones first.");
  const data = {title:v("title"),ko:v("ko"),cat:v("cat"),city:v("city"),area:v("area"),hours:v("hours"),payType:type,pay,lvl:Number(v("lvl")),deadline:v("deadline"),desc:v("desc"),payHours:type==="hourly"?null:payHours,flags:FLAGS.filter(fl=>f.elements["f_"+fl].checked),lat:v("city")!=="Remote"&&formPos?formPos.lat:null,lng:v("city")!=="Remote"&&formPos?formPos.lng:null};
  if(editingJob){ const j=p.jobs.find(x=>String(x.id)===editingJob); if(j) Object.assign(j,data,{editedAt:Date.now()}); }
  else p.jobs.push({id:"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),...data,status:"open",createdAt:Date.now()});
  $("jfSubmit").disabled=true;
  const ok = await savePosting(p);
  $("jfSubmit").disabled=false;
  if(ok){ toast(editingJob?"Changes saved":"Job published — it's live on the job board"); startNewJob(true); renderDashboard(); $("myJobs").scrollIntoView({behavior:"smooth",block:"center"}); }
};

/* ---------- maps: workplace location, my location, directions ---------- */
// Leaflet + OpenStreetMap (free, no API key). Loaded from unpkg in index.html.
const HAS_MAP = () => typeof window.L !== "undefined";
const LF = new Proxy({}, {get:(_,k)=>window.L[k]});   // the Leaflet library ("L" is our language helper)
const CITY_CENTER = {Seoul:[37.5665,126.9780],Busan:[35.1796,129.0756],Incheon:[37.4563,126.7052],Daegu:[35.8714,128.6014],Daejeon:[36.3504,127.3845],Gwangju:[35.1595,126.8526],Ulsan:[35.5384,129.3114],Suwon:[37.2636,127.0286],Seongnam:[37.4200,127.1267],Gyeongju:[35.8562,129.2247],Jeonju:[35.8242,127.1480],Jeju:[33.4996,126.5312],Cheongju:[36.6424,127.4890],Chuncheon:[37.8813,127.7298]};
// Approximate spots for the sample listings
const SAMPLE_COORDS = {1:[37.5563,126.9236],2:[37.4979,127.0276],4:[37.5551,126.9368],5:[35.1587,129.1604],6:[35.8350,129.2190],7:[36.3622,127.3561],8:[37.5446,127.0559],10:[35.8150,127.1530],11:[33.4890,126.4983],13:[37.3826,126.6566],14:[35.8692,128.5953],15:[37.3948,127.1112],16:[37.5704,126.9921],17:[35.1527,126.8490],19:[35.0975,129.0106],20:[37.5658,126.9386]};
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let userLoc = null;               // {lat,lng} once the visitor shares their location
let jobMap = null, formMap = null, formPin = null, formPos = null;

function distanceKm(a,b){
  const R=6371, toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
const fmtKm = km => km<1 ? Math.round(km*1000)+" m" : (km<10?km.toFixed(1):Math.round(km))+" km";
const jobDist = j => (userLoc && j.lat!=null) ? distanceKm(userLoc,{lat:j.lat,lng:j.lng}) : null;

function getUserLocation(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation) return reject(new Error(L("Your browser can't share your location.","이 브라우저는 위치 공유를 지원하지 않아요.")));
    navigator.geolocation.getCurrentPosition(
      p=>{ userLoc={lat:p.coords.latitude,lng:p.coords.longitude}; resolve(userLoc); },
      e=>reject(new Error(e.code===1
        ? L("Location permission was blocked. Allow location for this site in your browser settings.","위치 권한이 차단됐어요. 브라우저 설정에서 허용해 주세요.")
        : L("Couldn't get your location. Try again.","위치를 가져오지 못했어요. 다시 시도해 주세요."))),
      {enableHighAccuracy:true,timeout:15000,maximumAge:60000});
  });
}

function directionLinks(j){
  const name = encodeURIComponent(j.co);
  const kakao = `https://map.kakao.com/link/to/${name},${j.lat},${j.lng}`;
  const google = `https://www.google.com/maps/dir/?api=1${userLoc?`&origin=${userLoc.lat},${userLoc.lng}`:""}&destination=${j.lat},${j.lng}&travelmode=transit`;
  return `<a class="btn btn-ghost btn-sm map-link" href="${kakao}" target="_blank" rel="noopener">🟡 ${L("Kakao Map","카카오맵")}</a>
          <a class="btn btn-ghost btn-sm map-link" id="gmapLink" href="${google}" target="_blank" rel="noopener">🗺️ Google Maps</a>`;
}

function jobMapHtml(j){
  if(j.lat==null) return "";
  return `<h4>${L("Location & directions","위치 및 길찾기")}</h4>
    <div id="jobMap" class="job-map"></div>
    <div class="map-actions">
      <button type="button" class="btn btn-primary btn-sm" id="routeBtn">📍 ${L("Show route from my location","내 위치에서 경로 보기")}</button>
      ${directionLinks(j)}
    </div>
    <div class="fine" id="routeInfo"></div>`;
}

function initJobMap(j){
  if(jobMap){ jobMap.remove(); jobMap=null; }
  if(j.lat==null || !$("jobMap")) return;
  if(!HAS_MAP()){ $("jobMap").innerHTML=`<div class="empty" style="padding:20px">${L("Map couldn't load — use the Kakao or Google Maps buttons.","지도를 불러오지 못했어요.")}</div>`; return; }
  const dest=[j.lat,j.lng];
  jobMap = LF.map("jobMap",{scrollWheelZoom:false}).setView(dest,15);
  LF.tileLayer(OSM_TILES,{maxZoom:19,attribution:OSM_ATTR}).addTo(jobMap);
  LF.marker(dest).addTo(jobMap).bindPopup(`<b>${esc(j.co)}</b><br>${esc(j.area||j.city)}`).openPopup();
  let routeLayer=null;
  const drawRoute = ()=>{
    if(routeLayer) routeLayer.remove();
    const me=[userLoc.lat,userLoc.lng];
    routeLayer = LF.layerGroup([
      LF.circleMarker(me,{radius:9,color:"#fff",weight:3,fillColor:"#2f5bea",fillOpacity:1}).bindTooltip(L("You are here","현재 위치"),{permanent:true,direction:"top",offset:[0,-8]}),
      LF.polyline([me,dest],{color:"#ff5a36",weight:4,dashArray:"8 8"})
    ]).addTo(jobMap);
    jobMap.fitBounds(LF.latLngBounds([me,dest]),{padding:[40,40]});
    const km=distanceKm(userLoc,{lat:j.lat,lng:j.lng});
    $("routeInfo").innerHTML = `📏 <b>${fmtKm(km)}</b> ${L("in a straight line from you. Tap Kakao Map or Google Maps for bus and subway directions.","(직선거리). 버스·지하철 경로는 카카오맵이나 구글 지도를 눌러 확인하세요.")}`;
    const g=$("gmapLink"); if(g) g.href=`https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${j.lat},${j.lng}&travelmode=transit`;
  };
  $("routeBtn").onclick = async ()=>{
    const b=$("routeBtn"); b.disabled=true; b.textContent=L("Finding you…","위치 찾는 중…");
    try{ await getUserLocation(); drawRoute(); render(); b.textContent=`📍 ${L("Update my location","내 위치 새로고침")}`; }
    catch(e){ $("routeInfo").textContent=e.message; b.textContent=`📍 ${L("Show route from my location","내 위치에서 경로 보기")}`; }
    b.disabled=false;
  };
  setTimeout(()=>{ if(jobMap){ jobMap.invalidateSize(); if(userLoc) drawRoute(); } },60);
}

/* employer: pin the workplace on the job form */
function ensureFormMap(){
  if(!HAS_MAP() || !$("jfMap")) return;
  if(!formMap){
    const city=$("jobForm").elements.city.value;
    formMap = LF.map("jfMap",{scrollWheelZoom:false}).setView(CITY_CENTER[city]||CITY_CENTER.Seoul,12);
    LF.tileLayer(OSM_TILES,{maxZoom:19,attribution:OSM_ATTR}).addTo(formMap);
    formMap.on("click",e=>setFormPin(e.latlng.lat,e.latlng.lng));
  }
  setTimeout(()=>formMap.invalidateSize(),60);
}
function setFormPin(lat,lng,zoom){
  formPos = (lat==null) ? null : {lat:+lat.toFixed(6), lng:+lng.toFixed(6)};
  if(!formMap) return updateFormCoords();
  if(formPin){ formPin.remove(); formPin=null; }
  if(formPos){
    formPin = LF.marker([formPos.lat,formPos.lng],{draggable:true}).addTo(formMap);
    formPin.on("dragend",()=>{ const p=formPin.getLatLng(); formPos={lat:+p.lat.toFixed(6),lng:+p.lng.toFixed(6)}; updateFormCoords(); });
    formMap.setView([formPos.lat,formPos.lng], zoom || Math.max(formMap.getZoom(),15));
  }
  updateFormCoords();
}
function updateFormCoords(){
  $("jfCoords").textContent = formPos ? `✓ Pinned at ${formPos.lat}, ${formPos.lng} (drag the pin to adjust)` : "No location pinned yet — click the map where the workplace is.";
}
function centerFormMapOnCity(){
  if(!formMap || formPos) return;
  const c=CITY_CENTER[$("jobForm").elements.city.value]; if(c) formMap.setView(c,12);
}
$("jfCity").addEventListener("change", centerFormMapOnCity);
$("jfLocate").onclick = async ()=>{
  try{ const me=await getUserLocation(); ensureFormMap(); setFormPin(me.lat,me.lng,17); }
  catch(e){ toast(e.message); }
};

/* ---------- minimum wage check on the job form ---------- */
// Smallest legal pay for a job, from the 2026 minimum wage (₩10,320/hr).
// daily: hourly × hours per day. monthly: (weekly hours + paid weekly holiday) × 209/48 weeks, the official 209-hour month at 40 h/week.
function minPayFor(type, hrs){
  if(type==="hourly") return MIN_WAGE;
  if(!(hrs>0)) return null;
  if(type==="daily") return Math.ceil(MIN_WAGE*hrs);
  const holiday = hrs>=15 ? Math.min(hrs,40)/40*8 : 0;
  return Math.ceil(MIN_WAGE*(hrs+holiday)*209/48);
}
function updateMinPayHint(){
  const f=$("jobForm"), type=f.elements.payType.value, pay=Number(f.elements.pay.value), hrs=Number(f.elements.payHours.value);
  $("jfHoursWrap").style.display = type==="hourly" ? "none" : "";
  $("jfHoursLabel").textContent = type==="daily" ? "Hours per day *" : "Hours per week *";
  const min=minPayFor(type,hrs), box=$("jfMinPay");
  if(min==null){ box.className="min-pay"; box.textContent = type==="daily" ? "Enter hours per day to check" : "Enter hours per week to check"; $("jfSubmit").disabled=false; return; }
  const unit = type==="hourly"?"/hr":type==="daily"?"/day":"/month";
  const low = pay>0 && pay<min;
  box.className = "min-pay"+(low?" bad":"");
  box.textContent = low ? `⚠️ Below minimum wage — at least ${won(min)}${unit}` : `✓ At least ${won(min)}${unit}`;
  $("jfSubmit").disabled = low;
}
["payType","pay","payHours"].forEach(n=>$("jobForm").elements[n].addEventListener("input",updateMinPayHint));
$("jobForm").elements.payType.addEventListener("change",updateMinPayHint);

/* ---------- tools ---------- */
function calcHours(){
  const prog=$("hProg").value, topik=Number($("hTopik").value), plan=Number($("hPlan").value)||0, ko=lang==="ko";
  const rules = {d4:{need:2,low:10,high:20,wk:null},ug12:{need:3,low:10,high:25,wk:true},ug34:{need:4,low:10,high:25,wk:true},grad:{need:4,low:15,high:30,wk:true}};
  const r = rules[prog], met = topik>=r.need, limit = met?r.high:r.low;
  const over = plan>limit;
  const box=$("hResult");
  box.className = "result "+(over?"warn":"ok");
  box.innerHTML = `<div style="font-size:13px;opacity:.85">${ko?"학기 중 주중 최대":"Max weekday hours during semester"}</div>
    <div class="big">${limit} ${ko?"시간/주":"hrs / week"}</div>
    <div class="row"><span>${ko?"한국어 요건":"Korean requirement"}</span><b>TOPIK ${r.need}+ — ${met?(ko?"충족 ✓":"met ✓"):(ko?"미충족":"not met")}</b></div>
    <div class="row"><span>${ko?"주말·방학":"Weekends & vacation"}</span><b>${r.wk===null?(ko?"학교에 확인":"Check with school"):met?(ko?"제한 없음":"No limit"):(ko?"제한 적용":"Limited")}</b></div>
    <p>${over?(ko?`⚠️ 계획한 ${plan}시간은 허용 한도를 ${plan-limit}시간 초과해요. 주중 시간을 줄이거나 주말로 옮기세요.`:`⚠️ Your plan of ${plan} hrs is ${plan-limit} hrs over your limit. Cut weekday hours or move them to the weekend.`):(ko?`✓ 계획한 ${plan}시간은 허용 범위 안이에요.`:`✓ Your plan of ${plan} hrs fits within your limit.`)}</p>`;
}
["hProg","hTopik","hPlan"].forEach(id=>$(id).addEventListener("input",calcHours));

function calcPay(){
  const w=Number($("pWage").value)||0, h=Math.min(Number($("pHours").value)||0,40), ko=lang==="ko";
  const base = w*h;
  const holidayHrs = h>=15 ? (h/40)*8 : 0;
  const holiday = holidayHrs*w;
  const weekly = base+holiday, monthly = weekly*(365/7/12);
  const low = w<MIN_WAGE;
  const box=$("pResult");
  box.className="result"+(low?" warn":"");
  box.innerHTML = `<div style="font-size:13px;opacity:.85">${ko?"예상 월급":"Estimated monthly pay"}</div>
    <div class="big">${won(monthly)}</div>
    <div class="row"><span>${ko?"주급 (기본)":"Weekly base pay"}</span><b>${won(base)}</b></div>
    <div class="row"><span>${ko?"주휴수당":"Weekly holiday pay"} ${h>=15?`(${holidayHrs.toFixed(1)}h)`:""}</span><b>${h>=15?won(holiday):(ko?"해당 없음 (15시간 미만)":"Not eligible (under 15 h)")}</b></div>
    <div class="row"><span>${ko?"주급 합계":"Weekly total"}</span><b>${won(weekly)}</b></div>
    ${low?`<p>⚠️ ${ko?"최저시급 ₩10,320보다 낮아요. 불법이에요.":"This is below the 2026 minimum wage of ₩10,320 — that's illegal."}</p>`:""}`;
}
["pWage","pHours"].forEach(id=>$(id).addEventListener("input",calcPay));

/* ==========================================================================
   SMART MATCH: student schedule + home address → distance, match %, recommendations
   + DARK MODE.  (Paste this whole block right above "/* ---------- init" )
   ========================================================================== */
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_NAMES_KO = ["월","화","수","목","금","토","일"];
const dayName = i => lang==="ko" ? DAY_NAMES_KO[i] : DAY_NAMES[i];
const TIME_RE = /^\d{2}:\d{2}$/;
const toMin = t => { const [h,m]=String(t).split(":").map(Number); return h*60+(m||0); };

// Work days + times for the sample jobs (0 = Monday … 6 = Sunday)
const SAMPLE_SCHED = {
  1:{days:[5,6],start:"10:00",end:"16:00"}, 2:{days:[1,3],start:"16:00",end:"19:00"}, 3:{flexible:true},
  4:{days:[5,6],start:"14:00",end:"22:00"}, 5:{days:[4,5,6],start:"15:00",end:"21:00"}, 6:{days:[5,6],start:"09:00",end:"17:00"},
  7:{days:[0,2,4],start:"13:00",end:"17:00"}, 8:{days:[5,6],start:"11:00",end:"20:00"}, 9:{flexible:true},
  10:{days:[5,6],start:"11:00",end:"18:00"}, 11:{days:[5,6],start:"10:00",end:"19:00"}, 12:{flexible:true},
  13:{days:[5,6],start:"10:00",end:"18:00"}, 14:{days:[0,1,2,3,4],start:"18:00",end:"21:00"}, 15:{days:[1,3],start:"10:00",end:"16:00"},
  16:{flexible:true}, 17:{days:[4,5,6],start:"17:00",end:"23:00"}, 18:{flexible:true}, 19:{days:[5,6],start:"08:00",end:"13:00"},
  20:{days:[0,2],start:"10:00",end:"14:00"}
};
function cleanSched(x){
  if(!x) return {};
  if(x.flexible) return {flexible:true};
  const days = (Array.isArray(x.days)?x.days:[]).map(Number).filter(d=>d>=0&&d<=6);
  if(!days.length || !TIME_RE.test(x.start||"") || !TIME_RE.test(x.end||"")) return {};
  return {days, start:x.start, end:x.end};
}

/* --- attach schedules to every job on the board --- */
const _rebuildJobs = rebuildJobs;
rebuildJobs = function(){
  _rebuildJobs();
  JOBS.forEach(j=>{
    let raw = null;
    if(j.sample) raw = SAMPLE_SCHED[Number(String(j.id).slice(1))];
    else for(const p of postings){ const r=(p.jobs||[]).find(x=>String(x.id)===j.id); if(r){ raw=r; break; } }
    Object.assign(j, {days:null,start:null,end:null,flexible:false}, cleanSched(raw));
    j.payHours = raw && Number(raw.payHours)>0 ? Number(raw.payHours) : null;
  });
};

/* --- match score --- */
const isStudent = () => !!(account && account.loggedIn && account.role==="student");
const topikNum = t => { const m=String(t||"").match(/(\d)/); return m?Number(m[1]):0; };
const hasSchedule = () => isStudent() && Array.isArray(account.availability) && account.availability.some(d=>d&&d.on);
const hasHome = () => isStudent() && account.home && account.home.lat!=null;

function matchFor(j){
  if(!isStudent() || !(hasSchedule()||hasHome())) return null;
  const parts = {}; let km = null;
  // 1) schedule: how much of the shift falls inside the student's free time
  if(hasSchedule()){
    if(j.flexible) parts.sched = 1;
    else if(j.days && j.days.length){
      const js=toMin(j.start); let je=toMin(j.end); if(je<=js) je+=1440;
      let need=0, got=0;
      j.days.forEach(d=>{
        need += je-js;
        const a = account.availability[d];
        if(a && a.on && TIME_RE.test(a.from) && TIME_RE.test(a.to)){
          const as=toMin(a.from); let ae=toMin(a.to); if(ae<=as) ae+=1440;
          got += Math.max(0, Math.min(je,ae)-Math.max(js,as));
        }
      });
      parts.sched = need ? got/need : null;
    }
  }
  // 2) distance from home
  if(j.city==="Remote"){ parts.dist = 1; km = 0; }
  else if(hasHome() && j.lat!=null){
    km = distanceKm(account.home,{lat:j.lat,lng:j.lng});
    parts.dist = km<=2 ? 1 : km>=25 ? 0 : 1-(km-2)/23;
  }
  // 3) Korean level
  const t = topikNum(account.profile && account.profile.topik);
  parts.korean = t>=j.lvl ? 1 : Math.max(0, 1-(j.lvl-t)*0.35);
  // 4) pay: hourly-equivalent pay (minimum wage = 40%, ₩20,000/hr or more = 100%)
  const hr = hourlyPayOf(j);
  if(hr) parts.pay = Math.min(1, 0.4 + 0.6*Math.max(0, (hr-MIN_WAGE)/(20000-MIN_WAGE)));
  if(parts.sched==null && parts.dist==null) return null;
  const W = {sched:0.4, dist:0.25, pay:0.2, korean:0.15};
  let sum=0, wsum=0;
  for(const k in W) if(parts[k]!=null){ sum+=parts[k]*W[k]; wsum+=W[k]; }
  return {pct:Math.round(sum/wsum*100), parts, km};
}
// Pay per hour for any pay type (daily ÷ hours per day, monthly ÷ paid monthly hours)
function hourlyPayOf(j){
  if(!(j.pay>0)) return null;
  if(j.payType==="daily") return j.pay/(j.payHours||8);
  if(j.payType==="monthly"){
    const h=j.payHours||40, holiday=h>=15?Math.min(h,40)/40*8:0;
    return j.pay/((h+holiday)*209/48);
  }
  return j.pay;
}
const matchClass = p => p>=75 ? "m-high" : p>=50 ? "m-mid" : "m-low";
function matchReasons(j,m){
  const r=[];
  if(m.parts.sched!=null){
    if(j.flexible) r.push(L("🗓️ Flexible hours","🗓️시간 자유"));
    else if(m.parts.sched>=0.99) r.push(L("🗓️ Fits your schedule","🗓️ 일정에 맞음"));
    else if(m.parts.sched>0) r.push(L(`🗓️ ${Math.round(m.parts.sched*100)}% fits your free time`,`🗓️ 일정 ${Math.round(m.parts.sched*100)}% 일치`));
    else r.push(L("🗓️ Outside your free time","🗓️ 가능한 시간 아님"));
  }
  if(m.km!=null) r.push(j.city==="Remote" ? L("🏠 Remote — no commute","🏠 재택") : L(`📍 ${fmtKm(m.km)} from home`,`📍 집에서 ${fmtKm(m.km)}`));
  const hr=hourlyPayOf(j);
  if(hr) r.push(L(`💰 about ${won(hr)}/hr`,`💰 시급 약 ${won(hr)}`));
  r.push(m.parts.korean>=1 ? L("🇰🇷 Korean level OK","🇰🇷 한국어 충족") : L("🇰🇷 Needs more Korean","🇰🇷 한국어 부족"));
  return r;
}

/* --- % badge on every job card --- */
const _jobCard = jobCard;
jobCard = function(j){
  const html = _jobCard(j), m = matchFor(j);
  if(!m) return html;
  return html.replace('<div class="meta">', `<div class="meta"><span class="match-badge ${matchClass(m.pct)}">${m.pct}% ${L("match","일치")}</span>`);
};

/* --- "Best match" sort --- */
const _filtered = filtered;
filtered = function(){
  const list = _filtered();
  if(state.sort==="match") list.sort((a,b)=>((matchFor(b)||{pct:-1}).pct)-((matchFor(a)||{pct:-1}).pct));
  return list;
};

/* --- match breakdown inside the job details --- */
const _openJob = openJob;
openJob = function(id){
  _openJob(id);
  const j = JOBS.find(x=>x.id===id), grid = $("modal").querySelector(".m-grid");
  if(!j || !grid || !isStudent()) return;
  const m = matchFor(j);
  if(!m){
    grid.insertAdjacentHTML("afterend", `<div class="match-box"><b>${L("How well does this job fit you?","나에게 맞는 일자리인가요?")}</b><p>${L("Add your weekly free time and home address to see your match %.","가능한 시간과 집 주소를 등록하면 일치율을 볼 수 있어요.")}</p><button class="btn btn-primary btn-sm" id="mSched">🗓️ ${L("Add my schedule & home","일정·집 주소 등록")}</button></div>`);
    $("mSched").onclick = openScheduleModal; return;
  }
  const bar = (label,v,txt)=> v==null ? "" : `<div class="mb-row"><span>${label}</span><div class="mb-bar"><i style="width:${Math.round(v*100)}%"></i></div><b>${txt}</b></div>`;
  grid.insertAdjacentHTML("afterend", `<div class="match-box">
    <div class="mb-head"><span class="match-badge big ${matchClass(m.pct)}">${m.pct}%</span><div><b>${L("match for you","나와의 일치율")}</b><small>${matchReasons(j,m).join(" · ")}</small></div></div>
    ${bar(L("Schedule","일정"),m.parts.sched,Math.round((m.parts.sched||0)*100)+"%")}
    ${bar(L("Distance","거리"),m.parts.dist,j.city==="Remote"?L("Remote","재택"):m.km!=null?fmtKm(m.km):"")}
    ${bar(L("Pay","급여"),m.parts.pay,hourlyPayOf(j)?won(hourlyPayOf(j))+"/hr":"")}
    ${bar(L("Korean","한국어"),m.parts.korean,m.parts.korean>=1?"✓":"✗")}
  </div>`);
};

/* --- "Recommended for you" section --- */
function renderRecommended(){
  const sec=$("forYou"); if(!sec) return;
  if(!isStudent()){ sec.style.display="none"; return; }
  sec.style.display="";
  $("fyTitle").textContent = L("Recommended for you","추천 일자리");
  if(!(hasSchedule()||hasHome())){
    $("fyNote").textContent = "";
    $("fyList").innerHTML = `<div class="fy-empty"><b>${L("Get jobs picked for you","나에게 맞는 일자리 추천받기")}</b><p>${L("Tell us when you're free each day and where you live. We'll rank every job by schedule, distance and Korean level.","요일별 가능한 시간과 집 주소를 알려주세요. 일정·거리·한국어 수준으로 일자리를 추천해 드려요.")}</p><button class="btn btn-primary" id="fySetup">🗓️ ${L("Add my schedule & home","일정·집 주소 등록")}</button></div>`;
    $("fySetup").onclick = openScheduleModal; return;
  }
  const ranked = JOBS.map(j=>({j,m:matchFor(j)})).filter(x=>x.m).sort((a,b)=>b.m.pct-a.m.pct).slice(0,6);
  $("fyNote").innerHTML = `${L("Ranked by your schedule, distance from home and Korean level.","일정, 집과의 거리, 한국어 수준으로 정렬했어요.")} <button class="link-btn" id="fyEdit">${L("Edit my schedule & home","일정·집 주소 수정")}</button>`;
  $("fyEdit").onclick = openScheduleModal;
  $("fyList").innerHTML = ranked.length ? ranked.map(({j,m},i)=>`
    <article class="fy-card" data-id="${esc(j.id)}">
      <div class="fy-top"><span class="fy-rank">#${i+1}</span><span class="match-badge big ${matchClass(m.pct)}">${m.pct}%</span></div>
      <h3>${esc(lang==="ko"?j.ko:j.title)}</h3>
      <div class="co">${esc(j.co)} · ${esc(j.city)}</div>
      <div class="mb-bar"><i style="width:${m.pct}%"></i></div>
      <ul>${matchReasons(j,m).map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
      <div class="pay" style="font-size:15px">${payHtml(j)}</div>
    </article>`).join("") : `<div class="fy-empty">${L("No matching jobs yet.","아직 맞는 일자리가 없어요.")}</div>`;
  $("fyList").querySelectorAll(".fy-card").forEach(c=>c.onclick=()=>openJob(c.dataset.id));
}
const _renderAll = renderAll;
renderAll = function(){ _renderAll(); renderRecommended(); };

/* --- student menu: "My schedule & home" --- */
const _renderAuth = renderAuth;
renderAuth = function(){
  _renderAuth();
  const menu=$("userMenu");
  if(!menu || !isStudent()) return;
  const logout = menu.querySelector('[data-act="logout"]');
  logout.insertAdjacentHTML("beforebegin", `<button id="menuSched">🗓️ ${L("My schedule & home","내 일정·집 주소")}</button>`);
  $("menuSched").onclick = ()=>{ menu.classList.remove("open"); openScheduleModal(); };
};

/* --- the "My schedule & home" form --- */
let homeMap=null, homePin=null, homePos=null;
function openScheduleModal(){
  if(!isStudent()){ openAuth("login"); return; }
  if(homeMap){ homeMap.remove(); homeMap=null; }
  const av = Array.isArray(account.availability) ? account.availability : [];
  homePos = account.home && account.home.lat!=null ? {lat:account.home.lat,lng:account.home.lng} : null;
  openModal(`<h3 style="font-size:24px;letter-spacing:-.02em">🗓️ ${L("My schedule & home","내 일정·집 주소")}</h3>
    <p style="color:var(--muted);margin:4px 0 16px">${L("We use this to calculate distance and your match % for every job. Only you can see it.","거리와 일치율 계산에만 사용되며 본인만 볼 수 있어요.")}</p>
    <h4>${L("When are you free to work?","언제 일할 수 있나요?")}</h4>
    <div class="sched-grid">${DAY_NAMES.map((_,i)=>{ const d=av[i]||{}; return `
      <label class="sched-day"><input type="checkbox" data-day="${i}" ${d.on?"checked":""}> <b>${dayName(i)}</b></label>
      <input type="time" data-from="${i}" value="${esc(d.from||"09:00")}" ${d.on?"":"disabled"}>
      <span>–</span>
      <input type="time" data-to="${i}" value="${esc(d.to||"18:00")}" ${d.on?"":"disabled"}>`; }).join("")}</div>
    <h4 style="margin-top:20px">${L("Home address","집 주소")}</h4>
    <div class="inp"><input id="homeLabel" maxlength="80" placeholder="${L("e.g. 부산 남구 대연동","예: 부산 남구 대연동")}" value="${esc(account.home&&account.home.label||"")}"></div>
    <div id="homeMap" class="mini-map"></div>
    <div class="map-actions"><button type="button" class="btn btn-ghost btn-sm" id="homeLocate">📍 ${L("Use my current location","현재 위치 사용")}</button><span class="fine" id="homeCoords" style="margin:0"></span></div>
    <p class="fine">${L("Click the map to pin your home. You can pin a nearby spot instead of your exact address.","지도를 눌러 집 위치를 표시하세요. 정확한 주소 대신 근처를 찍어도 돼요.")}</p>
    <div id="schedErr" style="color:#c0392b;font-weight:600;font-size:14px;min-height:18px"></div>
    <div class="form-actions"><button class="btn btn-ghost" id="schedCancel">${L("Cancel","취소")}</button><button class="btn btn-primary" id="schedSave">${L("Save","저장")}</button></div>`);
  const m=$("modal");
  m.querySelectorAll("[data-day]").forEach(cb=>cb.onchange=()=>{ const i=cb.dataset.day; m.querySelector(`[data-from="${i}"]`).disabled=!cb.checked; m.querySelector(`[data-to="${i}"]`).disabled=!cb.checked; });
  const showCoords = ()=>{ $("homeCoords").textContent = homePos ? L("✓ Home pinned","✓ 집 위치 저장됨") : L("No home pinned yet","아직 집 위치가 없어요"); };
  const pin = (lat,lng,zoom)=>{
    homePos={lat:+lat.toFixed(5),lng:+lng.toFixed(5)}; showCoords();
    if(!homeMap) return;
    if(homePin) homePin.remove();
    homePin = LF.marker([homePos.lat,homePos.lng],{draggable:true}).addTo(homeMap);
    homePin.on("dragend",()=>{ const p=homePin.getLatLng(); homePos={lat:+p.lat.toFixed(5),lng:+p.lng.toFixed(5)}; });
    homeMap.setView([homePos.lat,homePos.lng], zoom||Math.max(homeMap.getZoom(),15));
  };
  if(HAS_MAP()){
    const city = account.profile && account.profile.city;
    homeMap = LF.map("homeMap",{scrollWheelZoom:false}).setView(homePos?[homePos.lat,homePos.lng]:(CITY_CENTER[city]||CITY_CENTER.Seoul), homePos?15:12);
    LF.tileLayer(OSM_TILES,{maxZoom:19,attribution:OSM_ATTR}).addTo(homeMap);
    homeMap.on("click",e=>pin(e.latlng.lat,e.latlng.lng));
    if(homePos) pin(homePos.lat,homePos.lng,15);
    setTimeout(()=>homeMap&&homeMap.invalidateSize(),60);
  } else $("homeMap").innerHTML=`<div class="empty" style="padding:20px">${L("Map couldn't load — use your current location.","지도를 불러오지 못했어요.")}</div>`;
  showCoords();
  $("homeLocate").onclick = async ()=>{ try{ const me=await getUserLocation(); pin(me.lat,me.lng,16); }catch(e){ $("schedErr").textContent=e.message; } };
  $("schedCancel").onclick = closeModal;
  $("schedSave").onclick = async ()=>{
    const availability = DAY_NAMES.map((_,i)=>{
      const on=m.querySelector(`[data-day="${i}"]`).checked, from=m.querySelector(`[data-from="${i}"]`).value, to=m.querySelector(`[data-to="${i}"]`).value;
      return on && TIME_RE.test(from) && TIME_RE.test(to) ? {on:true,from,to} : {on:false};
    });
    if(!availability.some(d=>d.on) && !homePos){ $("schedErr").textContent=L("Pick at least one day or pin your home.","하루 이상 선택하거나 집 위치를 표시해 주세요."); return; }
    account.availability = availability;
    account.home = homePos ? {lat:homePos.lat,lng:homePos.lng,label:$("homeLabel").value.trim()} : null;
    $("schedSave").disabled=true;
    await saveAccount();
    if(homeMap){ homeMap.remove(); homeMap=null; }
    closeModal(); renderAll();
    toast(L("Saved — your matches are updated","저장됐어요 — 추천이 업데이트됐어요"));
    $("forYou").scrollIntoView({behavior:"smooth"});
  };
}

/* --- employer job form: structured work days + times --- */
let pendingSched = null;
function readJobSched(){
  const f=$("jobForm");
  if(f.elements.flexible && f.elements.flexible.checked) return {flexible:true};
  const days = DAY_NAMES.map((_,i)=>f.elements["d_"+i]&&f.elements["d_"+i].checked?i:-1).filter(i=>i>=0);
  return {days, start:f.elements.startTime.value, end:f.elements.endTime.value, flexible:false};
}
function syncHoursText(){
  const s=readJobSched(), f=$("jobForm");
  if(s.flexible){ f.elements.hours.value="Flexible hours"; return; }
  if(s.days.length && TIME_RE.test(s.start) && TIME_RE.test(s.end)) f.elements.hours.value = `${s.days.map(i=>DAY_NAMES[i]).join(", ")} ${s.start}–${s.end}`;
}
function fillJobSched(x){
  const f=$("jobForm"); if(!f.elements.startTime) return;
  const s=cleanSched(x);
  DAY_NAMES.forEach((_,i)=>{ f.elements["d_"+i].checked = !!(s.days&&s.days.includes(i)); });
  f.elements.startTime.value = s.start||""; f.elements.endTime.value = s.end||"";
  f.elements.flexible.checked = !!s.flexible;
}
if($("jfDays")){
  $("jobForm").addEventListener("change", e=>{ if(/^(d_\d|startTime|endTime|flexible)$/.test(e.target.name||"")) syncHoursText(); });
  // Runs before the form's own submit handler: check the schedule and remember it.
  document.addEventListener("submit", e=>{
    if(e.target.id!=="jobForm") return;
    const s=readJobSched(), city=$("jobForm").elements.city.value;
    if(!s.flexible && city!=="Remote" && !(s.days.length && TIME_RE.test(s.start) && TIME_RE.test(s.end))){
      e.preventDefault(); e.stopPropagation();
      $("jfErr").textContent="Pick the work days and the start and end time (or tick “Flexible hours”).";
      return;
    }
    pendingSched = s.flexible ? {flexible:true,days:null,start:null,end:null} : {flexible:false,days:s.days,start:s.start,end:s.end};
  }, true);
  const _savePosting = savePosting;
  savePosting = async function(p){
    if(pendingSched && p && Array.isArray(p.jobs) && p.jobs.length){
      const target = editingJob ? p.jobs.find(x=>String(x.id)===editingJob) : p.jobs.reduce((a,b)=>(b.createdAt||0)>(a.createdAt||0)?b:a);
      if(target) Object.assign(target, pendingSched);
      pendingSched = null;
    }
    return _savePosting(p);
  };
  const _startNewJob = startNewJob;
  startNewJob = function(silent){ _startNewJob(silent); fillJobSched(null); };
  const _startEditJob = startEditJob;
  startEditJob = function(id){
    _startEditJob(id);
    const mp=myPosting(), j=mp&&(mp.jobs||[]).find(x=>String(x.id)===id);
    fillJobSched(j);
  };
}

/* --- dark mode --- */
function applyTheme(t){
  document.documentElement.dataset.theme = t;
  const tc=document.querySelector('meta[name="theme-color"]'); if(tc) tc.content = t==="dark" ? "#0f1420" : "#fbfaf7";   // P13: browser bar colour
  const b=$("themeBtn"); if(b){ b.textContent = t==="dark" ? "☀️" : "🌙"; b.title = t==="dark" ? "Light mode" : "Dark mode"; }
}
applyTheme(store.get("wah_theme", "dark"));
if($("themeBtn")) $("themeBtn").onclick = ()=>{
  const t = document.documentElement.dataset.theme==="dark" ? "light" : "dark";
  store.set("wah_theme", t); applyTheme(t);
};

/* ==========================================================================
   PROFILE PHOTO for students (P7: uploaded as a file, the profile keeps "/api/files/<id>")
   (Paste this block right above "/* ---------- init" )
   ========================================================================== */
// old profiles: a small JPEG data URL inside the document · new (P7): /api/files/<24 hex>
const PHOTO_RE = /^(data:image\/jpeg;base64,[A-Za-z0-9+/=]+|\/api\/files\/[a-f0-9]{24})$/;
let photoCtx = null;   // {value} while the student profile form is open

// Read a picked image, crop it to a square and shrink it to 512×512 JPEG (a Blob, ready to upload)
function shrinkPhoto(file){
  return new Promise((resolve,reject)=>{
    if(!file || !/^image\//.test(file.type)) return reject(new Error(L("Please choose an image file (JPG or PNG).","이미지 파일(JPG, PNG)을 선택해 주세요.")));
    if(file.size > 10*1024*1024) return reject(new Error(L("That image is too big (max 10 MB).","이미지가 너무 커요 (최대 10MB).")));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = ()=>{
      const side = Math.min(img.width,img.height), c = document.createElement("canvas");
      const out = Math.min(512, side);
      c.width = c.height = out;
      c.getContext("2d").drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,out,out);
      URL.revokeObjectURL(url);
      c.toBlob(b=> b ? resolve(b) : reject(new Error(L("Couldn't read that image.","이미지를 읽을 수 없어요."))), "image/jpeg", 0.9);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error(L("Couldn't read that image.","이미지를 읽을 수 없어요."))); };
    img.src = url;
  });
}
// shrink + upload → "/api/files/<id>". Shows "Uploading…" in msgEl and greys out the pick button meanwhile.
async function uploadPhoto(file, kind, msgEl, pickEl){
  const busy = on=>{ if(pickEl){ pickEl.style.pointerEvents=on?"none":""; pickEl.style.opacity=on?".6":""; } };
  if(msgEl){ msgEl.textContent=L("Uploading…","올리는 중…"); msgEl.style.color="var(--muted)"; }
  busy(true);
  try{
    const blob = await shrinkPhoto(file);
    if(typeof window.wahUpload!=="function") throw new Error(L("Uploads aren't ready yet. Reload the page and try again.","업로드를 준비 중이에요. 새로고침 후 다시 시도해 주세요."));
    const url = await window.wahUpload(blob, kind);
    if(msgEl){ msgEl.textContent=""; msgEl.style.color=""; }
    return url;
  }catch(e){
    const msg = (e && e.message) || L("Upload failed. Please try again.","업로드에 실패했어요. 다시 시도해 주세요.");
    if(msgEl){ msgEl.style.color=""; msgEl.textContent=msg; }
    toast(L("Upload failed: ","업로드 실패: ")+msg);
    throw e;
  }finally{ busy(false); }
}
const myPhoto = () => (account && account.role==="student" && account.profile && PHOTO_RE.test(account.profile.photo||"")) ? account.profile.photo : "";

/* --- photo picker at the top of the student profile form --- */
const _studentFormP = studentForm;
studentForm = function(){
  _studentFormP();
  const f = $("stForm"); if(!f) return;
  photoCtx = {value: myPhoto()};
  f.insertAdjacentHTML("afterbegin", `<div class="prow"><label>${L("Photo","사진")}</label>
    <div class="photo-row"><div class="photo-prev" id="photoPrev"></div>
      <div><label class="btn btn-ghost btn-sm photo-pick">📷 ${L("Choose photo","사진 선택")}<input type="file" accept="image/*" id="photoInput" hidden></label>
        <button type="button" class="link-btn" id="photoRemove" style="margin-left:10px">${L("Remove","삭제")}</button>
        <div class="fine" style="margin-top:6px">${L("JPG or PNG. We crop it to a square. Employers see it when you apply.","JPG 또는 PNG. 정사각형으로 잘라요. 지원하면 기업이 볼 수 있어요.")}</div>
        <div id="photoErr" style="color:#c0392b;font-size:13px;font-weight:600"></div></div></div></div>`);
  const show = ()=>{
    const p=$("photoPrev");
    if(photoCtx.value){ p.style.backgroundImage=`url("${photoCtx.value}")`; p.textContent=""; }
    else { p.style.backgroundImage=""; p.textContent=initials(f.elements.name.value||"?"); }
    $("photoRemove").style.display = photoCtx.value ? "" : "none";
  };
  $("photoInput").onchange = async e=>{
    $("photoErr").textContent="";
    const file = e.target.files[0]; e.target.value="";
    try{ const url = await uploadPhoto(file, "photo", $("photoErr"), f.querySelector(".photo-pick")); if(photoCtx){ photoCtx.value = url; show(); } }
    catch{ /* message already shown */ }
  };
  $("photoRemove").onclick = ()=>{ photoCtx.value=""; show(); };
  f.elements.name.addEventListener("input", ()=>{ if(!photoCtx.value) show(); });
  show();
};

/* --- keep the photo when the profile is saved --- */
const _saveAccountP = saveAccount;
saveAccount = async function(){
  if(photoCtx && account && account.role==="student"){
    account.profile = account.profile || {};
    if(photoCtx.value) account.profile.photo = photoCtx.value; else delete account.profile.photo;
  }
  return _saveAccountP();
};
const _closeModalP = closeModal;
closeModal = function(){ _closeModalP(); photoCtx = null; };

/* --- photo in the header avatar --- */
const _renderAuthP = renderAuth;
renderAuth = function(){
  _renderAuthP();
  const av = document.querySelector("#userBtn .avatar"), ph = myPhoto();
  if(av && ph){ av.style.backgroundImage=`url("${ph}")`; av.style.backgroundSize="cover"; av.style.backgroundPosition="center"; av.textContent=""; }
};

/* --- photo next to each application on the employer dashboard --- */
const _renderApplicationsP = renderApplications;
renderApplications = function(){
  _renderApplicationsP();
  document.querySelectorAll("#appList .app-status").forEach(sel=>{
    const a = applications.find(x=>x.id===sel.dataset.app), row = sel.closest(".app-row");
    if(!a || !row || row.querySelector(".app-photo")) return;
    if(PHOTO_RE.test(a.photo||"")){ const img=new Image(); img.src=a.photo; img.alt=""; img.className="app-photo"; row.prepend(img); }
    else { const d=document.createElement("div"); d.className="app-photo"; d.textContent=initials(a.name||"?"); row.prepend(d); }
  });
};

/* ---------- init ---------- */
/* ==========================================================================
   FEATURES 2: simpler front page + ⏱️ visa hours tracker + 💬 chat
   (Paste this whole block right above the line "persist(); payLabel();")
   ========================================================================== */

/* ---------- 1) simpler front page text ---------- */
EN.h1 = 'Part-time jobs in Korea, <em>made simple.</em>';
KO.h1 = '한국 알바, <em>쉽고 간단하게.</em>';
EN.lead = 'Visa-friendly jobs with clear pay and Korean level. Find a shift and apply in minutes.';
KO.lead = '비자 OK 일자리, 시급과 한국어 수준을 한눈에. 몇 분 만에 지원하세요.';
EN.minWageSub = 'Same for every worker, including international students.';
KO.minWageSub = '외국인 유학생도 똑같이 적용돼요.';
(function(){
  const d = lang==="ko" ? KO : EN;
  const h = document.querySelector('[data-i18n-html="h1"]'); if(h) h.innerHTML = d.h1;
  const l = document.querySelector('[data-i18n="lead"]'); if(l) l.textContent = d.lead;
  const m = document.querySelector('[data-i18n="minWageSub"]'); if(m) m.textContent = d.minWageSub;
})();

/* ---------- 2) ⏱️ visa hours tracker (students) ---------- */
const VISA_RULES = {
  d4:  {label:"Korean language course (D-4)", need:2, low:10, high:20, weekendFree:false},
  ug12:{label:"Undergraduate year 1–2",       need:3, low:10, high:25, weekendFree:true},
  ug34:{label:"Undergraduate year 3–4",       need:4, low:10, high:25, weekendFree:true},
  grad:{label:"Master's / PhD",               need:4, low:15, high:30, weekendFree:true}
};
let trackerWeek = 0;   // 0 = this week, -1 = last week …
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function weekStart(offset){
  const d=new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate()-((d.getDay()+6)%7)+offset*7);   // Monday
  return d;
}
function shiftHours(s){
  if(!TIME_RE.test(s.start||"")||!TIME_RE.test(s.end||"")) return 0;
  let a=toMin(s.start), b=toMin(s.end); if(b<=a) b+=1440;
  return Math.round((b-a)/6)/10;
}
function myVisaLimit(){
  const prog = account.visaProgram || (account.profile&&account.profile.visa==="D-4" ? "d4" : "ug12");
  const r = VISA_RULES[prog] || VISA_RULES.ug12;
  const met = topikNum(account.profile&&account.profile.topik) >= r.need;
  return {prog, r, met, limit: met ? r.high : r.low, weekendFree: met && r.weekendFree, vacation: !!account.vacation && met && r.weekendFree};
}
function weekSummary(offset){
  const from=weekStart(offset), to=new Date(from); to.setDate(to.getDate()+7);
  const list=(Array.isArray(account.shifts)?account.shifts:[]).filter(s=>{ const d=new Date(s.date+"T00:00"); return d>=from && d<to; })
    .sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  const v=myVisaLimit();
  let weekday=0, weekend=0, pay=0;
  list.forEach(s=>{ const h=shiftHours(s), dow=new Date(s.date+"T00:00").getDay(); (dow===0||dow===6)?weekend+=h:weekday+=h; if(s.wage>0) pay+=h*s.wage; });
  const counted = v.vacation ? 0 : (v.weekendFree ? weekday : weekday+weekend);
  return {from,list,weekday,weekend,counted,pay,v};
}
function ensureTrackerSection(){
  if($("tracker")) return;
  const anchor = $("forYou") || $("jobs");
  anchor.insertAdjacentHTML("afterend", `<section id="tracker" style="display:none;padding-top:20px"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">⏱️ ${"Visa hours"}</div><h2 id="trTitle">My work hours</h2></div><p id="trNote"></p></div>
    <div class="tracker" id="trBody"></div></div></section>`);
}
function renderTracker(){
  ensureTrackerSection();
  const sec=$("tracker");
  if(!isStudent()){ sec.style.display="none"; return; }
  sec.style.display="";
  $("trTitle").textContent = L("My work hours","나의 근무 시간");
  $("trNote").textContent = L("Log your shifts. We check them against your student-visa limit every week.","근무를 기록하면 매주 비자 허용 시간과 비교해 드려요.");
  const S=weekSummary(trackerWeek), v=S.v;
  const pct = v.vacation ? 0 : Math.min(100, S.counted/v.limit*100);
  const over = !v.vacation && S.counted>v.limit, near = !over && !v.vacation && S.counted>=v.limit*0.8;
  const cls = over?"tr-over":near?"tr-near":"tr-ok";
  const days=[...Array(7)].map((_,i)=>{ const d=new Date(S.from); d.setDate(d.getDate()+i); return d; });
  const fmtD = d => `${dayName((d.getDay()+6)%7)} ${d.getMonth()+1}/${d.getDate()}`;
  const places=[...new Set([...(Array.isArray(account.shifts)?account.shifts:[]).map(s=>s.place).filter(Boolean), ...JOBS.filter(j=>applied(j.id)).map(j=>j.co)])].slice(0,20);
  $("trBody").innerHTML = `
    <div class="tr-top">
      <div class="tr-week"><button class="icon-btn" id="trPrev">‹</button><b>${trackerWeek===0?L("This week","이번 주"):fmtD(days[0])+" – "+fmtD(days[6])}</b><button class="icon-btn" id="trNext">›</button></div>
      <div class="tr-settings">
        <select id="trProg">${Object.entries(VISA_RULES).map(([k,r])=>`<option value="${k}" ${k===v.prog?"selected":""}>${r.label}</option>`).join("")}</select>
        <label class="chk"><input type="checkbox" id="trVac" ${account.vacation?"checked":""}> ${L("School vacation","방학 중")}</label>
      </div>
    </div>
    <div class="tr-grid">
      <div class="tr-card ${cls}">
        <small>${v.vacation?L("Vacation — no weekly limit","방학 — 제한 없음"):v.weekendFree?L("Weekday hours (Mon–Fri)","평일 근무 (월–금)"):L("Hours this week","이번 주 근무")}</small>
        <div class="tr-big">${S.counted} <span>/ ${v.vacation?"∞":v.limit+" h"}</span></div>
        <div class="mb-bar"><i style="width:${pct}%"></i></div>
        <p>${v.vacation?L("You can work without a weekly limit during official school vacation.","공식 방학 기간에는 시간 제한이 없어요.")
          : over?`⚠️ ${L(`${Math.round((S.counted-v.limit)*10)/10} h over your limit. Working over the limit can cancel your permit or visa.`,`허용 시간을 ${Math.round((S.counted-v.limit)*10)/10}시간 초과했어요. 비자에 문제가 생길 수 있어요.`)}`
          : near?`🟠 ${L(`Only ${Math.round((v.limit-S.counted)*10)/10} h left this week.`,`이번 주 ${Math.round((v.limit-S.counted)*10)/10}시간 남았어요.`)}`
          : `✅ ${L(`${Math.round((v.limit-S.counted)*10)/10} h left this week.`,`이번 주 ${Math.round((v.limit-S.counted)*10)/10}시간 남았어요.`)}`}</p>
        ${!v.met?`<p class="fine">${L(`Your Korean level is below TOPIK ${v.r.need}, so your limit is ${v.r.low} h/week. Reach TOPIK ${v.r.need} for ${v.r.high} h.`,`TOPIK ${v.r.need} 미만이라 주 ${v.r.low}시간이에요.`)}</p>`:""}
      </div>
      <div class="tr-card">
        <small>${L("Weekend","주말")}</small><div class="tr-big">${S.weekend} <span>h</span></div>
        <p>${v.weekendFree?L("Weekends have no limit for you.","주말은 제한 없음"):L("Weekends count toward your limit.","주말도 제한에 포함돼요.")}</p>
        <small style="margin-top:12px;display:block">${L("Estimated pay","예상 급여")}</small><div class="tr-big" style="font-size:24px">${won(S.pay)}</div>
      </div>
    </div>
    <form class="tr-add" id="trAdd">
      <input type="date" name="date" value="${ymd(trackerWeek===0?new Date():days[0])}" required>
      <input type="time" name="start" value="10:00" required><span>–</span><input type="time" name="end" value="15:00" required>
      <input name="place" list="trPlaces" maxlength="40" placeholder="${L("Workplace","근무지")}">
      <datalist id="trPlaces">${places.map(p=>`<option value="${esc(p)}">`).join("")}</datalist>
      <input name="wage" type="number" min="0" step="10" placeholder="₩/hr">
      <button class="btn btn-primary btn-sm" type="submit">+ ${L("Add shift","근무 추가")}</button>
    </form>
    <div class="tr-list">${S.list.length?S.list.map(s=>{ const d=new Date(s.date+"T00:00"); return `<div class="tr-row"><b>${fmtD(d)}</b><span>${esc(s.start)}–${esc(s.end)}</span><span>${shiftHours(s)} h</span><span class="tr-place">${esc(s.place||"")}</span><span>${s.wage>0?won(shiftHours(s)*s.wage):""}</span><button class="icon-btn del" data-shift="${esc(s.id)}">✕</button></div>`; }).join("")
      : `<div class="empty" style="padding:20px">${L("No shifts logged this week.","이번 주 기록이 없어요.")}</div>`}</div>`;
  $("trPrev").onclick=()=>{ trackerWeek--; renderTracker(); };
  $("trNext").onclick=()=>{ trackerWeek++; renderTracker(); };
  $("trProg").onchange=async e=>{ account.visaProgram=e.target.value; await saveAccount(); renderTracker(); };
  $("trVac").onchange=async e=>{ account.vacation=e.target.checked; await saveAccount(); renderTracker(); };
  $("trBody").querySelectorAll("[data-shift]").forEach(b=>b.onclick=async()=>{ account.shifts=(account.shifts||[]).filter(s=>s.id!==b.dataset.shift); await saveAccount(); renderTracker(); });
  $("trAdd").onsubmit=async e=>{
    e.preventDefault(); const f=e.target;
    const s={id:"s"+Date.now().toString(36), date:f.elements.date.value, start:f.elements.start.value, end:f.elements.end.value, place:f.elements.place.value.trim().slice(0,40), wage:Number(f.elements.wage.value)||0};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !shiftHours(s)){ toast(L("Check the date and times.","날짜와 시간을 확인해 주세요.")); return; }
    account.shifts=[...(Array.isArray(account.shifts)?account.shifts:[]), s].slice(-300);
    await saveAccount();
    const d=new Date(s.date+"T00:00"); d.setDate(d.getDate()-((d.getDay()+6)%7));
    trackerWeek=Math.round((d-weekStart(0))/(7*86400000));
    renderTracker();
    const W=weekSummary(trackerWeek);
    toast(!W.v.vacation && W.counted>W.v.limit ? L("⚠️ This week is now over your visa limit!","⚠️ 이번 주 비자 허용 시간을 넘었어요!") : L("Shift added","근무가 추가됐어요"));
  };
}

/* ---------- 3) 💬 chat between students and employers ---------- */
const chat = {list:[], unsubs:[], uid:null, open:null, msgs:[], unsubMsgs:null, view:"list"};
const chatOn = () => backend.mode==="firebase" && account && account.loggedIn && backend.uid;
const chatIdOf = (employerUid, studentUid) => `${employerUid}_${studentUid}`;
const unreadOf = c => c.lastFrom && c.lastFrom!==backend.uid && (c.updatedAt||0) > ((c.readBy&&c.readBy[backend.uid])||0);

function ensureChatUI(){
  if($("chatFab")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <button class="chat-fab" id="chatFab" style="display:none" aria-label="Messages">💬<span class="chat-badge" id="chatBadge" style="display:none"></span></button>
    <div class="chat-panel" id="chatPanel" style="display:none">
      <div class="chat-head"><button class="icon-btn" id="chatBack" style="display:none">‹</button><b id="chatTitle">Messages</b><button class="icon-btn" id="chatClose">✕</button></div>
      <div class="chat-body" id="chatBody"></div>
      <form class="chat-send" id="chatSend" style="display:none"><input id="chatInput" maxlength="1000" autocomplete="off" placeholder="Type a message…"><button class="btn btn-primary btn-sm" type="submit">Send</button></form>
    </div>`);
  $("chatFab").onclick = ()=>{ const p=$("chatPanel"); if(p.style.display==="none"){ p.style.display=""; showChatList(); } else p.style.display="none"; };
  $("chatClose").onclick = ()=>{ $("chatPanel").style.display="none"; closeThread(); };
  $("chatBack").onclick = ()=>showChatList();
  $("chatSend").onsubmit = e=>{ e.preventDefault(); sendChat(); };
}
function watchChats(){
  ensureChatUI();
  const uid = chatOn() ? backend.uid : null;
  $("chatFab").style.display = uid ? "" : "none";
  if(!uid){ $("chatPanel").style.display="none"; }
  if(uid===chat.uid) return;
  chat.unsubs.forEach(u=>u()); chat.unsubs=[]; chat.list=[]; chat.uid=uid; closeThread();
  if(!uid) return;
  const F=backend.fb, mine={};
  ["studentUid","employerUid"].forEach(field=>{
    chat.unsubs.push(F.onSnapshot(F.query(F.collection(backend.db,"chats"),F.where(field,"==",uid)), snap=>{
      mine[field]=snap.docs.map(d=>({id:d.id,...d.data()}));
      const all={}; Object.values(mine).flat().forEach(c=>all[c.id]=c);
      chat.list=Object.values(all).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      updateChatBadge();
      if(chat.view==="list" && $("chatPanel").style.display!=="none") showChatList();
      if(chat.open){ const c=chat.list.find(x=>x.id===chat.open.id); if(c) chat.open=c; }
    }, err=>console.error("chats",err)));
  });
}
function updateChatBadge(){
  const n=chat.list.filter(unreadOf).length, b=$("chatBadge");
  b.textContent=n; b.style.display=n?"":"none";
}
function otherName(c){ return backend.uid===c.studentUid ? (c.employerName||"Employer") : (c.studentName||"Student"); }
function showChatList(){
  chat.view="list"; closeThread();
  $("chatTitle").textContent=L("Messages","메시지"); $("chatBack").style.display="none"; $("chatSend").style.display="none";
  $("chatBody").innerHTML = chat.list.length ? chat.list.map(c=>`<button class="chat-item" data-chat="${esc(c.id)}">
      <span class="avatar" style="background:var(--brand)">${esc(initials(otherName(c)))}</span>
      <span class="ci-main"><b>${esc(otherName(c))}</b><small>${esc(c.jobTitle||"")}</small><span class="ci-last">${esc(c.lastText||L("No messages yet","아직 메시지가 없어요"))}</span></span>
      ${unreadOf(c)?'<span class="chat-dot"></span>':""}</button>`).join("")
    : `<div class="empty" style="padding:24px">${L("No conversations yet. Students can message an employer from a job; employers can reply from Applications.","아직 대화가 없어요.")}</div>`;
  $("chatBody").querySelectorAll("[data-chat]").forEach(b=>b.onclick=()=>{ const c=chat.list.find(x=>x.id===b.dataset.chat); if(c) openThread(c); });
}
function closeThread(){ if(chat.unsubMsgs){ chat.unsubMsgs(); chat.unsubMsgs=null; } chat.open=null; chat.msgs=[]; }
function openThread(c){
  closeThread(); chat.view="thread"; chat.open=c;
  $("chatPanel").style.display=""; $("chatTitle").textContent=otherName(c);
  $("chatBack").style.display=""; $("chatSend").style.display="";
  $("chatBody").innerHTML=`<div class="empty" style="padding:20px">${L("Loading…","불러오는 중…")}</div>`;
  const F=backend.fb;
  chat.unsubMsgs = F.onSnapshot(F.query(F.collection(backend.db,"chats",c.id,"messages"),F.orderBy("at"),F.limit(300)), snap=>{
    chat.msgs=snap.docs.map(d=>d.data()); renderThread(); markRead();
  }, err=>{ console.error("messages",err); $("chatBody").innerHTML=`<div class="empty" style="padding:20px">${L("Couldn't load messages.","메시지를 불러오지 못했어요.")}</div>`; });
  setTimeout(()=>$("chatInput").focus(),50);
}
function renderThread(){
  const body=$("chatBody"), c=chat.open; if(!c) return;
  body.innerHTML = `<div class="chat-ctx">${esc(c.jobTitle||"")}</div>` + (chat.msgs.length ? chat.msgs.map(m=>`<div class="msg ${m.from===backend.uid?"me":""}"><span>${esc(m.text)}</span><small>${new Date(m.at).toLocaleString([], {month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</small></div>`).join("")
    : `<div class="empty" style="padding:20px">${L("Say hello 👋","인사를 건네보세요 👋")}</div>`);
  body.scrollTop = body.scrollHeight;
}
async function markRead(){
  const c=chat.open; if(!c || !unreadOf(c)) return;
  try{ await backend.fb.setDoc(backend.fb.doc(backend.db,"chats",c.id), {readBy:{[backend.uid]:Date.now()}}, {merge:true}); }catch(e){ console.error(e); }
}
async function sendChat(){
  const inp=$("chatInput"), text=inp.value.trim(), c=chat.open;
  if(!text || !c) return;
  inp.value=""; const F=backend.fb, now=Date.now();
  try{
    await F.addDoc(F.collection(backend.db,"chats",c.id,"messages"), {from:backend.uid, text:text.slice(0,1000), at:now});
    await F.setDoc(F.doc(backend.db,"chats",c.id), {lastText:text.slice(0,120), lastFrom:backend.uid, updatedAt:now, readBy:{[backend.uid]:now}}, {merge:true});
  }catch(e){ console.error("send",e); toast(L("Message not sent — check your Firestore rules.","메시지를 보내지 못했어요.")); inp.value=text; }
}
// Start (or reopen) a conversation. Both sides use the same id: employerUid_studentUid
async function startChat({employerUid, studentUid, employerName, studentName, jobTitle}){
  if(backend.mode!=="firebase"){ toast(L("Chat works on the live site (Firebase).","채팅은 Firebase가 연결된 사이트에서만 돼요.")); return; }
  if(!chatOn()){ openAuth("login"); return; }
  const id=chatIdOf(employerUid,studentUid), F=backend.fb;
  const data={employerUid, studentUid, jobTitle:String(jobTitle||"").slice(0,80)};
  if(employerName) data.employerName=String(employerName).slice(0,60);
  if(studentName) data.studentName=String(studentName).slice(0,60);
  try{ await F.setDoc(F.doc(backend.db,"chats",id), data, {merge:true}); }
  catch(e){ console.error("chat start",e); toast(L("Couldn't open chat — publish the new Firestore rules.","채팅을 열 수 없어요 — Firestore 규칙을 업데이트하세요.")); return; }
  closeModal();
  const c = chat.list.find(x=>x.id===id) || {id, ...data};
  openThread(c);
}

/* buttons: "Message employer" in the job details, "Chat" next to each application */
const _openJobC = openJob;
openJob = function(id){
  _openJobC(id);
  const j=JOBS.find(x=>x.id===id);
  if(!j || !j.live || !isStudent() || j.owner===backend.uid) return;
  const anchor=$("modal").querySelector(".apply-form") || $("modal").querySelector(".m-grid");
  if(!anchor) return;
  anchor.insertAdjacentHTML("beforebegin", `<button type="button" class="btn btn-ghost" id="msgEmployer" style="margin-top:14px">💬 ${L("Message employer","기업에 메시지")}</button>`);
  $("msgEmployer").onclick = ()=>startChat({employerUid:j.owner, studentUid:backend.uid, employerName:j.co, studentName:(account.profile&&account.profile.name)||"", jobTitle:j.title});
};
const _renderApplicationsC = renderApplications;
renderApplications = function(){
  _renderApplicationsC();
  document.querySelectorAll("#appList .app-status").forEach(sel=>{
    const a=applications.find(x=>x.id===sel.dataset.app);
    if(!a || !a.studentUid || sel.parentElement.querySelector(".app-chat")) return;
    const b=document.createElement("button"); b.className="icon-btn app-chat"; b.type="button"; b.textContent="💬 Chat";
    b.onclick=()=>startChat({employerUid:backend.uid, studentUid:a.studentUid, studentName:a.name, employerName:(myPosting()&&myPosting().company&&myPosting().company.name)||"", jobTitle:a.jobTitle});
    sel.insertAdjacentElement("beforebegin", b);
  });
};

/* hook everything into the normal page updates + student menu */
const _renderAuthF2 = renderAuth;
renderAuth = function(){
  _renderAuthF2();
  renderTracker(); watchChats();
  const menu=$("userMenu");
  if(menu && isStudent() && !$("menuTracker")){
    menu.querySelector('[data-act="logout"]').insertAdjacentHTML("beforebegin", `<button id="menuTracker">⏱️ ${L("My work hours","나의 근무 시간")}</button>`);
    $("menuTracker").onclick=()=>{ menu.classList.remove("open"); showView("main"); $("tracker").scrollIntoView({behavior:"smooth"}); };
  }
  if(menu && chatOn() && !$("menuChat")){
    menu.querySelector('[data-act="logout"]').insertAdjacentHTML("beforebegin", `<button id="menuChat">💬 ${L("Messages","메시지")}</button>`);
    $("menuChat").onclick=()=>{ menu.classList.remove("open"); $("chatPanel").style.display=""; showChatList(); };
  }
};

/* ==========================================================================
   FEATURES 3A: About · Privacy Policy · Terms pages (+ animations),
   sign-up consent, and account deletion
   ========================================================================== */
const SITE = {
  name: "Work Abroad Hub",
  // ✏️ Fill these in before you launch publicly
  owner: "Work Abroad Hub (operator name)",
  privacyOfficer: "Your name",
  contactEmail: "your-email@example.com",
  effective: "2026-11-20"
};
const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

function ensureInfoSection(){
  if($("infoPage")) return;
  $("dashboard").insertAdjacentHTML("afterend", `<section id="infoPage"><div class="wrap" id="infoBody"></div></section>`);
}
function countUp(el, to){
  if(reduceMotion()){ el.textContent = to.toLocaleString(); return; }
  const t0 = performance.now(), dur = 1200;
  const step = t=>{ const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3); el.textContent=Math.round(to*e).toLocaleString(); if(p<1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// Fade/slide elements in when they scroll into view
function revealOnScroll(root){
  const els = root.querySelectorAll(".reveal");
  if(!("IntersectionObserver" in window) || reduceMotion()){ els.forEach(e=>e.classList.add("in")); return; }
  const io = new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target);
    en.target.querySelectorAll("[data-count]").forEach(c=>countUp(c, Number(c.dataset.count)||0)); } }), {threshold:.2});
  els.forEach(e=>io.observe(e));
}

const ABOUT_STEPS = [
  {icon:"🔍", en:["Find a job","Filter by city, pay and how much Korean you need."], ko:["일자리 찾기","지역, 시급, 한국어 수준으로 찾아요."]},
  {icon:"⭐", en:["See your match","Your schedule, home and TOPIK give every job a match %."], ko:["일치율 확인","일정·집·TOPIK으로 일치율을 계산해요."]},
  {icon:"💬", en:["Apply & chat","Send your profile and talk to the employer directly."], ko:["지원 & 채팅","프로필을 보내고 기업과 바로 대화해요."]},
  {icon:"📄", en:["Get your permit","Contract + school + HiKorea before your first shift."], ko:["허가 받기","계약서 → 국제처 → 하이코리아."]},
  {icon:"⏱️", en:["Work safely","Log shifts and stay inside your visa hours."], ko:["안전하게 일하기","근무를 기록하고 비자 시간을 지켜요."]}
];

function aboutHtml(){
  const ko = lang==="ko";
  const employers = postings.filter(p=>(p.jobs||[]).length).length;
  const cities = new Set(JOBS.map(j=>j.city).filter(c=>c&&c!=="Remote")).size;
  const n = ABOUT_STEPS.length, W = 1000, gap = W/(n-1);
  return `
  <div class="about-hero reveal">
    <div class="blob b1"></div><div class="blob b2"></div>
    <div class="eyebrow">${L("About us","소개")}</div>
    <h1>${L("Helping international students work in Korea — <em>safely.</em>","유학생이 한국에서 <em>안전하게</em> 일할 수 있도록.")}</h1>
    <p class="lead">${L(`${SITE.name} connects international students with part-time jobs that fit their visa, their schedule and their Korean level — and helps employers hire them the right way.`,`${SITE.name}는 유학생과 비자·일정·한국어 수준에 맞는 알바를 연결하고, 기업이 올바르게 채용하도록 돕습니다.`)}</p>
  </div>

  <div class="about-stats reveal">
    <div><b data-count="${JOBS.length}">0</b><span>${L("open jobs","모집 공고")}</span></div>
    <div><b data-count="${cities}">0</b><span>${L("cities","도시")}</span></div>
    <div><b data-count="${employers}">0</b><span>${L("employers","기업")}</span></div>
    <div><b data-count="10320">0</b><span>${L("₩ minimum per hour","원 최저시급")}</span></div>
  </div>

  <h2 class="reveal" style="margin-top:56px">${L("How it works","이용 방법")}</h2>
  <div class="flow reveal">
    <svg class="flow-line" viewBox="0 0 ${W} 40" preserveAspectRatio="none" aria-hidden="true">
      <path id="flowPath" d="M0 20 H${W}" />
      <circle r="7" class="flow-dot">${reduceMotion()?"":`<animateMotion dur="5s" repeatCount="indefinite"><mpath href="#flowPath"/></animateMotion>`}</circle>
    </svg>
    <div class="flow-steps">${ABOUT_STEPS.map((s,i)=>`
      <div class="flow-step" style="--d:${i*0.18}s"><div class="flow-icon">${s.icon}<span>${i+1}</span></div>
      <b>${ko?s.ko[0]:s.en[0]}</b><small>${ko?s.ko[1]:s.en[1]}</small></div>`).join("")}</div>
  </div>

  <h2 class="reveal" style="margin-top:56px">${L("What makes us different","우리의 차별점")}</h2>
  <div class="about-cards">
    ${[["🛂",L("Visa rules built in","비자 규정 내장"),L("Every job shows the Korean level it needs, and the hours tracker warns you before you go over your limit.","모든 공고에 필요한 한국어 수준을 표시하고, 근무 시간이 초과되기 전에 알려줘요.")],
       ["💰",L("Minimum wage, always","항상 최저임금 이상"),L("Employers can't post a job that pays under the legal minimum wage.","최저임금보다 낮은 공고는 올릴 수 없어요.")],
       ["🔒",L("Your data stays yours","내 정보는 나만"),L("Your schedule, home location and work hours are private. You can delete your account any time.","일정, 집 위치, 근무 시간은 비공개이며 언제든 탈퇴할 수 있어요.")],
       ["🌏",L("Made for students","유학생을 위해"),L("English and Korean, simple language, and a match score so you don't waste time.","영어·한국어 지원, 쉬운 설명, 일치율로 시간을 아껴요.")]]
      .map(([i,t,d],k)=>`<div class="about-card reveal" style="transition-delay:${k*0.08}s"><div class="ac-icon">${i}</div><b>${t}</b><p>${d}</p></div>`).join("")}
  </div>

  <div class="about-cta reveal">
    <div><h3>${L("Questions or feedback?","문의나 의견이 있나요?")}</h3><p>${L("We read every message.","모든 메시지를 확인해요.")} ${esc(SITE.contactEmail)}</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#jobs" id="aboutFind">${L("Find jobs","일자리 찾기")}</a><a class="btn btn-ghost" href="#privacy">${L("Privacy Policy","개인정보처리방침")}</a></div>
  </div>`;
}

function policyShell(title, sub, sections){
  return `<div class="policy reveal in">
    <div class="eyebrow">${L("Legal","약관·정책")}</div><h1 style="font-size:clamp(30px,4vw,42px)">${title}</h1>
    <p class="fine" style="font-size:14px">${sub}</p>
    <div class="policy-draft">⚠️ ${L("Draft — review with a lawyer or the PIPC guide before public launch, and fill in the contact details.","초안입니다 — 공개 전에 변호사 또는 개인정보보호위원회 가이드로 검토하고 연락처를 입력하세요.")}</div>
    <div class="policy-grid">
      <nav class="policy-toc">${sections.map((s,i)=>`<a href="#" data-sec="ps${i}">${i+1}. ${s[0]}</a>`).join("")}</nav>
      <div class="policy-body">${sections.map((s,i)=>`<section id="ps${i}"><h3>${i+1}. ${s[0]}</h3>${s[1]}</section>`).join("")}</div>
    </div></div>`;
}
const ul = items => `<ul>${items.map(i=>`<li>${i}</li>`).join("")}</ul>`;
function privacyHtml(){
  return policyShell(L("Privacy Policy","개인정보처리방침"),
    L(`Effective ${SITE.effective}. This policy explains what ${SITE.name} collects, why, and your rights under Korea's Personal Information Protection Act.`,`시행일 ${SITE.effective}. 개인정보 보호법에 따라 수집 항목, 목적, 이용자의 권리를 안내합니다.`),[
    [L("What we collect","수집하는 개인정보"), `<table class="ptable"><tr><th>${L("Who","대상")}</th><th>${L("Information","항목")}</th></tr>
      <tr><td>${L("Everyone with an account","모든 회원")}</td><td>${L("Email address, password (stored by Firebase Authentication, never visible to us) or Google sign-in, member type","이메일, 비밀번호(Firebase 인증 보관) 또는 구글 로그인, 회원 유형")}</td></tr>
      <tr><td>${L("Students","학생")}</td><td>${L("Name, birth date, gender (optional), email, phone, city and address, visa type, Korean level, school, profile photo (optional), weekly free time, home location pin, logged work shifts and pay, saved and applied jobs","이름, 생년월일, 성별(선택), 이메일, 전화번호, 지역·주소, 비자, 한국어 수준, 학교, 사진(선택), 가능 시간, 집 위치, 근무 기록·급여, 저장·지원한 공고")}</td></tr>
      <tr><td>${L("Employers","기업")}</td><td>${L("Company name, business registration number, business type, contact person, email, phone, address, languages, job postings and workplace location","상호, 사업자등록번호, 업종, 담당자, 이메일, 전화번호, 주소, 사용 언어, 공고 및 근무지 위치")}</td></tr>
      <tr><td>${L("Both","공통")}</td><td>${L("Applications and chat messages you send","보낸 지원서와 채팅 메시지")}</td></tr></table>
      <p>${L("Your browser also keeps your saved jobs, language and dark-mode setting on your own device (local storage). We don't use advertising cookies.","저장한 공고, 언어, 다크모드 설정은 이용자의 브라우저에 저장되며 광고 쿠키는 사용하지 않아요.")}</p>`],
    [L("Why we use it","이용 목적"), ul([L("Creating and managing your account","회원 가입 및 관리"),L("Showing jobs, calculating distance and your match %","공고 제공, 거리·일치율 계산"),L("Sending your application to the employer you chose","선택한 기업에 지원서 전달"),L("Chat between students and employers","학생·기업 간 채팅"),L("Tracking your work hours against visa limits (only you see this)","비자 근무시간 확인(본인만 열람)"),L("Preventing fake or illegal job posts","허위·불법 공고 방지")])],
    [L("Who else sees it","제3자 제공"), `<p>${L("When you apply to a job, the employer receives your name, email, phone, visa, Korean level, school, photo and message. Chat messages are seen by the other person in the chat. We don't sell or give your information to anyone else unless the law requires it.","지원하면 해당 기업이 이름, 이메일, 전화번호, 비자, 한국어 수준, 학교, 사진, 메시지를 받습니다. 채팅은 대화 상대가 봅니다. 법령에 따른 경우 외에는 제3자에게 제공하지 않습니다.")}</p>`],
    [L("Service providers & overseas storage","처리위탁 및 국외 이전"), `<p>${L("We use Google Firebase (Google LLC) for login, database and hosting. Your data is stored on Google's servers and may be processed outside Korea. Map tiles come from OpenStreetMap; map pages may load them from their servers.","로그인·데이터베이스·호스팅에 Google Firebase(Google LLC)를 사용하며, 데이터가 국외 서버에서 처리될 수 있습니다. 지도는 OpenStreetMap을 이용합니다.")}</p>`],
    [L("How long we keep it","보유 및 파기"), `<p>${L("We keep your information while your account exists. When you delete your account, your profile, schedule, home location, work log and (for employers) job postings are deleted right away. Applications and chat messages you already sent stay with the other person so they can keep their records.","회원 탈퇴 시 프로필, 일정, 집 위치, 근무 기록, (기업) 공고를 즉시 삭제합니다. 이미 보낸 지원서와 채팅은 상대방 기록을 위해 남습니다.")}</p>`],
    [L("Your rights","정보주체의 권리"), ul([L("See and correct your information any time in your profile","프로필에서 언제든 열람·수정"),L("Download a copy of all your data: Settings → Your data → Download my data","내 정보 다운로드: 설정 → 내 정보 → 다운로드"),L("Delete your account: menu → Delete account (students) or Settings → Delete account (employers)","탈퇴: 메뉴 → 계정 삭제 / 설정 → 계정 삭제"),L(`Ask us anything about your data: ${SITE.contactEmail}`,`문의: ${SITE.contactEmail}`)])],
    [L("How we protect it","안전성 확보 조치"), ul([L("Encrypted connection (HTTPS) and Firebase Authentication","HTTPS 암호화 및 Firebase 인증"),L("Database rules: only you can read your profile; only the student and employer can read an application or chat","DB 규칙: 프로필은 본인만, 지원서·채팅은 당사자만 열람"),L("We never see or store your password","비밀번호를 보거나 저장하지 않음")])],
    [L("Privacy officer","개인정보 보호책임자"), `<p>${esc(SITE.privacyOfficer)} · ${esc(SITE.contactEmail)}</p><p class="fine">${L("You can also contact the Personal Information Protection Commission privacy center (privacy.kisa.or.kr, call 118).","개인정보침해 신고센터(privacy.kisa.or.kr, 국번없이 118)에도 문의할 수 있어요.")}</p>`],
    [L("Changes","변경 고지"), `<p>${L("If we change this policy we will post the new version here with a new effective date.","변경 시 이 페이지에 새 시행일과 함께 공지합니다.")}</p>`]
  ]);
}
function termsHtml(){
  return policyShell(L("Terms of Use","이용약관"), L(`Effective ${SITE.effective}. By creating an account you agree to these terms.`,`시행일 ${SITE.effective}. 회원 가입 시 본 약관에 동의하게 됩니다.`),[
    [L("The service","서비스"), `<p>${L(`${SITE.name} is a job board. We show job posts from employers and help students apply. We are not the employer and we don't sign work contracts.`,`${SITE.name}는 구인·구직 정보 제공 서비스이며, 근로계약의 당사자가 아닙니다.`)}</p>`],
    [L("Accounts","계정"), ul([L("Give true information and keep your login safe","정확한 정보 입력, 계정 보안 유지"),L("One account is either a student or an employer","하나의 계정은 학생 또는 기업 중 하나"),L("You can delete your account any time","언제든 탈퇴 가능")])],
    [L("Employers must","기업의 의무"), ul([L("Pay at least the legal minimum wage and give a written contract","최저임금 이상 지급, 서면 근로계약"),L("Post only real jobs with correct business information","실제 공고와 정확한 사업자 정보만 등록"),L("Not post jobs at bars, clubs, adult venues, construction sites or any job students can't legally do","유흥업소·건설현장 등 유학생 불가 업종 금지"),L("Provide documents students need for their part-time work permit","시간제취업 허가에 필요한 서류 제공")])],
    [L("Students must","학생의 의무"), ul([L("Get the part-time work permit before the first shift","첫 근무 전 시간제취업 허가 받기"),L("Stay within your visa hours (the tracker helps but you are responsible)","비자 허용 시간 준수(본인 책임)"),L("Give true information in applications","지원서에 사실만 기재")])],
    [L("Not allowed","금지 행위"), ul([L("Fake, misleading or illegal job posts — including scams or voice-phishing recruitment","허위·불법 공고, 보이스피싱 모집 등"),L("Harassment or discrimination in chat","채팅에서의 괴롭힘·차별"),L("Collecting other users' data or spamming","타인 정보 수집, 스팸")])],
    [L("Our rights","운영자의 권리"), `<p>${L("We can remove posts and suspend accounts that break these terms or the law.","약관이나 법령을 위반한 게시물 삭제 및 계정 정지가 가능합니다.")}</p>`],
    [L("Information on the site","정보의 정확성"), `<p>${L("Visa and wage information is general guidance. Always confirm with your school, HiKorea or the immigration office (1345). The match % and hours tracker are helpers, not legal advice.","비자·임금 정보는 일반 안내입니다. 학교, 하이코리아, 출입국(1345)에서 확인하세요.")}</p>`],
    [L("Law","준거법"), `<p>${L("These terms follow the laws of the Republic of Korea.","본 약관은 대한민국 법을 따릅니다.")}</p>`],
    [L("Contact","문의"), `<p>${esc(SITE.contactEmail)}</p>`]
  ]);
}

function showInfo(page){
  ensureInfoSection();
  document.body.classList.remove("dash");
  document.body.classList.add("info");
  const body=$("infoBody");
  body.innerHTML = page==="about" ? aboutHtml() : page==="privacy" ? privacyHtml() : termsHtml();
  body.dataset.page = page; body.dataset.jobs = String(JOBS.length);
  window.scrollTo(0,0);
  revealOnScroll(body);
  body.querySelectorAll("[data-sec]").forEach(a=>a.onclick=e=>{ e.preventDefault(); $(a.dataset.sec).scrollIntoView({behavior:"smooth",block:"start"}); });
  const f=$("aboutFind"); if(f) f.onclick=e=>{ e.preventDefault(); hideInfo(); history.replaceState(null,"","#jobs"); $("jobs").scrollIntoView({behavior:"smooth"}); };
}
function hideInfo(){ document.body.classList.remove("info"); }
const INFO_PAGES = ["about","privacy","terms"];
function routeInfo(){
  const h = location.hash.slice(1);
  if(INFO_PAGES.includes(h)) showInfo(h);
  else if(document.body.classList.contains("info")) hideInfo();
}
window.addEventListener("hashchange", routeInfo);
const _showViewI = showView;
showView = function(v){ hideInfo(); _showViewI(v); };

/* links: "About" in the menu, policy links in the footer */
(function(){
  const nav=$("navLinks");
  if(nav && !nav.querySelector('[href="#about"]')) nav.insertAdjacentHTML("beforeend", `<a href="#about" id="navAbout">About</a>`);
  const na=$("navAbout"); if(na) na.onclick=()=>$("navLinks").classList.remove("open");
  const copy=document.querySelector("footer .copy");
  if(copy && !copy.querySelector(".legal-links")) copy.insertAdjacentHTML("afterbegin", `<span class="legal-links"><a href="#about">About</a> · <a href="#privacy"><b>Privacy Policy</b></a> · <a href="#terms">Terms of Use</a></span>`);
  // other nav links leave the info page
  document.querySelectorAll('#navLinks a:not([href="#about"]), footer a[href="#jobs"], footer a[href="#tools"], footer a[href="#guide"], footer a[href="#employers"]').forEach(a=>a.addEventListener("click", hideInfo));
})();

/* sign-up: "I agree to the Terms and Privacy Policy" */
function addConsent(formId, submitId){
  const f=$(formId); if(!f || !needsCredentials() && account && account.loggedIn) return;
  const actions=f.querySelector(".form-actions"); if(!actions || f.querySelector(".consent")) return;
  actions.insertAdjacentHTML("beforebegin", `<label class="chk consent"><input type="checkbox" name="agree"> <span>${L(`I agree to the <a href="#terms" target="_blank">Terms of Use</a> and the collection and use of my information in the <a href="#privacy" target="_blank">Privacy Policy</a>.`,`<a href="#terms" target="_blank">이용약관</a> 및 <a href="#privacy" target="_blank">개인정보처리방침</a>에 동의합니다.`)}</span></label><div class="err consent-err" style="text-align:center"></div>`);
}
const _studentFormI = studentForm;
studentForm = function(){ _studentFormI(); addConsent("stForm"); };
const _employerFormI = employerForm;
employerForm = function(){ _employerFormI(); addConsent("emForm"); };
document.addEventListener("submit", e=>{
  if(!["stForm","emForm"].includes(e.target.id)) return;
  const cb=e.target.elements.agree; if(!cb) return;
  if(!cb.checked){
    e.preventDefault(); e.stopPropagation();
    const er=e.target.querySelector(".consent-err"); er.textContent=L("Please agree to the Terms and Privacy Policy to continue.","약관과 개인정보처리방침에 동의해 주세요."); er.classList.add("show");
  } else if(account){ account.agreedAt = Date.now(); }
}, true);
// remember when they agreed
const _saveAccountI = saveAccount;
saveAccount = async function(){ if(account && !account.agreedAt && document.querySelector("form .consent input:checked")) account.agreedAt=Date.now(); return _saveAccountI(); };

/* account deletion */
async function deleteMyAccount(){
  if(!account) return;
  if(backend.mode==="firebase"){
    const F=backend.fb, uid=backend.uid;
    try{
      if(account.role==="employer") await F.deleteDoc(F.doc(backend.db,"postings",uid)).catch(()=>{});
      await F.deleteDoc(F.doc(backend.db,"users",uid));
      await F.deleteUser(backend.auth.currentUser);
    }catch(e){
      console.error("delete",e);
      if(e && e.code==="auth/requires-recent-login"){ toast(L("For safety, log out and log in again, then delete your account.","보안을 위해 다시 로그인한 후 탈퇴해 주세요.")); return false; }
      toast(L("Couldn't delete your account. Try again.","탈퇴하지 못했어요. 다시 시도해 주세요.")); return false;
    }
  } else {
    ["wah_account_local","wah_posting_local","wah_apps_local","wah_saved"].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
    account=null; postings=[]; applications=[];
  }
  closeModal(); showView("main"); renderAll(); toast(L("Your account was deleted.","계정이 삭제되었어요.")); return true;
}
function openDeleteAccount(){
  openModal(`<div style="text-align:center;padding:10px 6px">
    <div style="font-size:44px">🗑️</div>
    <h3 style="font-size:22px;margin:8px 0">${L("Delete your account?","계정을 삭제할까요?")}</h3>
    <p style="color:var(--ink-2)">${L("Your profile, photo, schedule, home location, work log"+(account&&account.role==="employer"?" and all your job posts":"")+" will be deleted. This can't be undone.","프로필, 사진, 일정, 집 위치, 근무 기록"+(account&&account.role==="employer"?", 모든 공고":"")+"가 삭제되며 되돌릴 수 없어요.")}</p>
    <p class="fine">${L("Applications and messages you already sent stay with the other person.","이미 보낸 지원서와 메시지는 상대방에게 남아요.")}</p>
    <label class="chk" style="justify-content:center;margin-top:10px"><input type="checkbox" id="delSure"> ${L("I understand","확인했습니다")}</label>
    <div class="form-actions"><button class="btn btn-ghost" id="delNo">${L("Cancel","취소")}</button><button class="btn btn-danger" id="delYes" disabled>${L("Delete account","계정 삭제")}</button></div></div>`);
  $("delSure").onchange=e=>$("delYes").disabled=!e.target.checked;
  $("delNo").onclick=closeModal;
  $("delYes").onclick=async()=>{ $("delYes").disabled=true; if(!(await deleteMyAccount())) $("delYes").disabled=false; };
}
const _renderAuthI = renderAuth;
renderAuth = function(){
  _renderAuthI();
  const menu=$("userMenu");
  if(menu && account && account.loggedIn && account.role==="student" && !$("menuDelete")){
    menu.querySelector('[data-act="logout"]').insertAdjacentHTML("afterend", `<button id="menuDelete" class="danger" style="font-size:12px;opacity:.8">🗑️ ${L("Delete account","계정 삭제")}</button>`);
    $("menuDelete").onclick=()=>{ menu.classList.remove("open"); openDeleteAccount(); };
  }
};

/* ==========================================================================
   FEATURES 3B: Employer portal — sidebar, animated dashboard, My Jobs,
   Applicants, Company Profile, Notifications, Settings, Logout
   ========================================================================== */
const PORTAL_PAGES = [
  ["dashboard","🏠","Dashboard","대시보드"],["post","➕","Post a Job","공고 등록"],["jobs","💼","My Jobs","내 공고"],
  ["applicants","👥","Applicants","지원자"],["company","🏢","Company Profile","기업 정보"],["notifications","🔔","Notifications","알림"],["settings","⚙️","Settings","설정"]
];
let portalPage = "dashboard", portalBuilt = false, portalQuery = "";
const SKYLINE_SVG = `<svg viewBox="0 0 220 90" class="p-skyline" aria-hidden="true"><path d="M0 90V70h14V58h10v12h8V50h12v20h10V62h8v8h12V40h6V18h2V6h2v12h2v22h6v30h10V56h14v14h8V46h12v24h10V60h10v10h14V52h12v18h10v20z" fill="currentColor"/><circle cx="85" cy="12" r="3" fill="#ff8a3d"/></svg>`;

function buildPortal(){
  if(portalBuilt) return;
  portalBuilt = true;
  const dash=$("dashboard"), wrap=dash.querySelector(".wrap");
  const appPanel=$("appList").closest(".panel"), jobsPanel=$("myJobs").closest(".panel"), formPanel=$("jobFormPanel"),
        coPanel=$("coInfo").closest(".panel"), rulesPanel=[...dash.querySelectorAll(".panel")].find(p=>p.textContent.includes("Posting rules"));
  wrap.insertAdjacentHTML("beforebegin", `<div class="portal" id="portal">
    <aside class="p-side" id="pSide">
      <div class="p-logo"><div class="logo-mark">W</div><div><b>Work Abroad Hub</b><small>Employer Portal</small></div></div>
      <nav id="pNav">${PORTAL_PAGES.map(([k,i,en,ko])=>`<button data-p="${k}"><span>${i}</span>${L(en,ko)}<em class="p-count" id="pc_${k}"></em></button>`).join("")}
        <hr><button id="pBoard"><span>🌐</span>${L("View job board","채용 게시판 보기")}</button><button id="pLogout"><span>↪️</span>${L("Logout","로그아웃")}</button></nav>
      <div class="p-promo">${SKYLINE_SVG}<b>${L("Hire Global Talent","글로벌 인재 채용")}<br>${L("in South Korea","대한민국에서")} 🇰🇷</b></div>
    </aside>
    <div class="p-main">
      <div class="p-top">
        <button class="icon-btn p-burger" id="pBurger">☰</button>
        <label class="p-search">🔍<input id="pSearch" placeholder="${L("Search jobs or applicants…","공고, 지원자 검색…")}"></label>
        <button class="p-bell" id="pBell">🔔<span id="pBellN"></span></button>
        <button class="theme-btn" id="pTheme"></button>
        <div class="p-me" id="pMe"><span class="avatar" id="pAvatar" style="background:var(--ink)"></span><b id="pName"></b></div>
      </div>
      <div id="pBanner"></div>
      <div class="p-page" data-page="dashboard" id="pg_dashboard"></div>
      <div class="p-page" data-page="post" id="pg_post"><div class="p-head"><div><h2>${L("Post a Job","공고 등록")}</h2><p>${L("Fill in the details. Students see the visa info and minimum-wage check automatically.","내용을 입력하세요. 비자 정보와 최저임금 확인이 자동으로 표시돼요.")}</p></div></div><div class="p-two" id="pPostWrap"></div></div>
      <div class="p-page" data-page="jobs" id="pg_jobs"><div class="p-head"><div><h2>${L("My Jobs","내 공고")}</h2><p>${L("Manage all your job listings: edit, close or reopen them.","공고를 수정·마감·재오픈하세요.")}</p></div><button class="btn btn-primary" data-go="post">+ ${L("Post a New Job","새 공고")}</button></div>
        <div class="p-filters"><label class="p-search">🔍<input id="pJobQ" placeholder="${L("Search job title…","공고 검색…")}"></label><input type="hidden" id="pJobS" value=""></div>
        <div class="p-tabs p-jfbar" id="pJobFilter" role="group" aria-label="${L("Filter jobs by status","상태별 공고 필터")}"></div><div id="pJobsWrap"></div></div>
      <div class="p-page" data-page="applicants" id="pg_applicants"><div class="p-head"><div><h2>${L("Applicants","지원자")}</h2><p>${L("View and manage applications for your jobs.","지원서를 확인하고 관리하세요.")}</p></div></div>
        <div class="p-filters"><label class="p-search">🔍<input id="pAppQ" placeholder="${L("Search applicant…","지원자 검색…")}"></label><select id="pAppJ"></select><select id="pAppS"><option value="">${L("All status","전체 상태")}</option>${Object.entries(APP_STATUS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div><div id="pAppsWrap"></div></div>
      <div class="p-page" data-page="company" id="pg_company"></div>
      <div class="p-page" data-page="notifications" id="pg_notifications"></div>
      <div class="p-page" data-page="settings" id="pg_settings"></div>
    </div></div>`);
  // move the existing working panels into the new pages (their buttons keep working)
  $("pPostWrap").append(formPanel); if(rulesPanel) $("pPostWrap").append(rulesPanel);
  $("pJobsWrap").append(jobsPanel); $("pAppsWrap").append(appPanel);
  coPanel.style.display="none"; $("pg_company").append(coPanel);
  $("pBanner").append($("dashBanner"));
  wrap.style.display="none";

  $("pNav").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{ if(b.dataset.p==="post") startNewJob(); else setPortalPage(b.dataset.p); });
  const portalGo = g => {
    if(g.dataset.go==="post"){ startNewJob(); return; }
    if(g.dataset.jf!==undefined){ $("pJobQ").value=""; $("pJobS").value=g.dataset.jf; }
    if(g.dataset.af!==undefined){ portalQuery=""; $("pSearch").value=""; $("pAppQ").value=""; $("pAppJ").value=""; $("pAppS").value=""; }
    setPortalPage(g.dataset.go);
  };
  $("portal").addEventListener("click", e=>{ const f=e.target.closest("[data-jfset]"); if(f){ $("pJobS").value=f.dataset.jfset; filterPortalLists(); return; }
    const g=e.target.closest("[data-go]"); if(g) portalGo(g); });
  $("portal").addEventListener("keydown", e=>{ if(e.key!=="Enter" && e.key!==" ") return; const g=e.target.closest('[data-go][role="button"]'); if(g){ e.preventDefault(); portalGo(g); } });
  $("pBoard").onclick=()=>{ showView("main"); window.scrollTo(0,0); };
  $("pLogout").onclick=openLogoutConfirm;
  $("pBurger").onclick=()=>$("pSide").classList.toggle("open");
  $("pBell").onclick=()=>setPortalPage("notifications");
  $("pTheme").onclick=()=>{ $("themeBtn").click(); renderPortal(); };
  attachMeMenu($("pMe"), ()=>[
    ["🏢", L("Company Profile","기업 정보"), ()=>setPortalPage("company")],
    ["⚙️", L("Settings","설정"), ()=>setPortalPage("settings")],
    ["-"],
    ["↪️", L("Logout","로그아웃"), openLogoutConfirm]
  ]);
  $("pSearch").oninput=e=>{ portalQuery=e.target.value.trim().toLowerCase(); $("pAppQ").value=e.target.value; if(portalPage!=="applicants" && portalPage!=="jobs") setPortalPage("applicants"); filterPortalLists(); };
  ["pJobQ","pJobS","pAppQ","pAppJ","pAppS"].forEach(id=>$(id).addEventListener("input", filterPortalLists));
}
function setPortalPage(p){
  portalPage = p;
  document.querySelectorAll("#portal .p-page").forEach(el=>el.classList.toggle("on", el.dataset.page===p));
  document.querySelectorAll("#pNav [data-p]").forEach(b=>b.classList.toggle("on", b.dataset.p===p));
  $("pSide").classList.remove("open");
  renderPortal(); window.scrollTo(0,0);
}

/* ---- data helpers ---- */
const dayKey = t => { const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
function portalData(){
  const mp=myPosting(), co=(mp&&mp.company)||{}, jobs=(mp&&Array.isArray(mp.jobs)?mp.jobs:[]).slice();
  const now=Date.now(), expired=j=>j.deadline && new Date(j.deadline+"T23:59:59")<new Date();
  const active=jobs.filter(j=>j.status==="open"&&!expired(j)), closed=jobs.filter(j=>j.status!=="open"&&!expired(j)), exp=jobs.filter(expired);
  const soon=active.filter(j=>j.deadline && (new Date(j.deadline+"T23:59:59")-now)<7*86400000);
  const apps=applications.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return {co,jobs,active,closed,exp,soon,apps};
}
function series(items, days, cumulative){
  const today=dayKey(Date.now()), out=[];
  for(let i=days-1;i>=0;i--){ const d=today-i*86400000; out.push(items.filter(t=>cumulative ? dayKey(t)<=d : dayKey(t)===d).length); }
  return out;
}
function sparkSvg(vals, color){
  const max=Math.max(1,...vals), w=120, h=36;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*w},${h-3-(v/max)*(h-8)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="draw"/></svg>`;
}
function lineChartSvg(vals, labels){
  const W=640, H=220, P=34, max=Math.max(4, Math.ceil(Math.max(...vals)*1.2));
  const x=i=>P+(i/(vals.length-1))*(W-P-10), y=v=>H-P-(v/max)*(H-P-14);
  const pts=vals.map((v,i)=>[x(i),y(v)]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=line+` L${x(vals.length-1)} ${H-P} L${x(0)} ${H-P} Z`;
  const ticks=[0,.25,.5,.75,1].map(f=>Math.round(max*f));
  return `<svg viewBox="0 0 ${W} ${H}" class="lchart">
    <defs><linearGradient id="lcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--blue)" stop-opacity=".28"/><stop offset="1" stop-color="var(--blue)" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map(t=>`<line x1="${P}" x2="${W-10}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${P-8}" y="${y(t)+4}" text-anchor="end">${t}</text>`).join("")}
    ${labels.map((l,i)=>l?`<text x="${x(i)}" y="${H-10}" text-anchor="middle">${l}</text>`:"").join("")}
    <path d="${area}" fill="url(#lcg)" class="fadein"/>
    <path d="${line}" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="draw" pathLength="1"/>
    ${pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${vals[i]?4.5:0}" class="pt" data-tip="${labels[i]||""}"><title>${vals[i]} ${L("applications","지원")}</title></circle>`).join("")}
  </svg>`;
}
function donutSvg(parts){
  const total=parts.reduce((s,p)=>s+p.v,0)||1, r=52, C=2*Math.PI*r; let off=0;
  return `<svg viewBox="0 0 140 140" class="donut"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--line)" stroke-width="16"/>
    ${parts.map(p=>{ const len=p.v/total*C; const s=`<circle cx="70" cy="70" r="${r}" fill="none" stroke="${p.c}" stroke-width="16" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" class="seg"/>`; off+=len; return p.v?s:""; }).join("")}
  </svg>`;
}
function animateNumbers(root){ root.querySelectorAll("[data-count]").forEach(el=>countUp(el, Number(el.dataset.count)||0)); }
const relTime = t => { const s=(Date.now()-t)/1000; if(s<3600) return Math.max(1,Math.round(s/60))+L(" min ago","분 전"); if(s<86400) return Math.round(s/3600)+L(" hours ago","시간 전"); return Math.round(s/86400)+L(" days ago","일 전"); };
const avatarHtml = a => PHOTO_RE.test(a.photo||"") ? `<img class="p-av" src="${a.photo}" alt="">` : `<span class="p-av">${esc(initials(a.name||"?"))}</span>`;
const statusPill = s => `<span class="p-pill st-${esc(s||"new")}">${esc(APP_STATUS[s]||"New")}</span>`;

// P8: the list comes from the SERVER (same on every device); "Job expiring soon" is still worked out here
function notifItems(){
  const D=portalData(), items=NS.items.map(srvItem);
  D.soon.forEach(j=>items.push({t:Date.now()-1, type:"job", ref:String(j.id), key:`job-soon:${j.id}:${j.deadline}`, icon:"⏰", title:L("Job expiring soon","마감 임박"), text:`“${j.title}” ${L("closes on","마감:")} ${j.deadline}`}));
  items.forEach(n=>{ if(!n.key) n.key=`${n.type}:${n.ref}:${n.t}`; });
  return items.sort((a,b)=>b.t-a.t);
}
const seenKey = () => "wah_seen_"+backend.uid;
/* per-item read state: a list of "type:ref:time" keys (newest 300) */
const readKey = () => "wah_read_"+backend.uid;
const readSet = () => new Set(store.get(readKey(),[]));
function markNotifRead(key){
  if(!key) return; const list=store.get(readKey(),[]).filter(k=>k!==key); list.push(key);
  store.set(readKey(), list.slice(-300));
}
function isUnread(n, seen, rs){ return n.srv ? !n.read : n.t>seen && !rs.has(n.key); }
function unseenCount(){ const seen=store.get(seenKey(),0), rs=readSet(); return NS.unread + notifItems().filter(n=>!n.srv && isUnread(n,seen,rs)).length; }
/* attributes that make a notification row clickable */
const notifAttrs = n => `role="button" tabindex="0" data-ntype="${esc(n.type)}" data-nref="${esc(n.ref||"")}" data-njob="${esc(n.jobId||"")}" data-nkey="${esc(n.key||"")}"${n.srv?` data-nid="${esc(n.id)}"`:""}`;
function flashEl(el){
  if(!el) return; el.scrollIntoView({behavior:"smooth", block:"center"});
  el.classList.remove("p-flash"); void el.offsetWidth; el.classList.add("p-flash");
  setTimeout(()=>el.classList.remove("p-flash"), 2200);
}
const gone = () => toast(L("This item is no longer available.","더 이상 볼 수 없는 항목이에요."));
function openChatById(id){
  const c=(typeof chat!=="undefined"?chat.list:[]).find(x=>String(x.id)===String(id));
  if(!c) return gone();
  $("chatPanel").style.display=""; openThread(c);
}
/* employer portal: open what a notification is about */
function openPortalNotif(type, ref, jobId, key){
  markNotifRead(key);
  const D=portalData();
  if(type==="job"){
    const j=D.jobs.find(x=>String(x.id)===ref); if(!j){ renderPortal(); return gone(); }
    $("pJobQ").value=""; $("pJobS").value="";
    setPortalPage("jobs");
    const btn=document.querySelector(`#myJobs [data-edit="${CSS.escape(ref)}"]`);
    requestAnimationFrame(()=>flashEl(btn&&btn.closest(".my-job")));
    if(j.status==="open" && JOBS.some(x=>x.id===ref)) setTimeout(()=>openJob(ref), 350);
  } else if(type==="app"){
    const a=D.apps.find(x=>String(x.id)===ref); if(!a){ renderPortal(); return gone(); }
    portalQuery=""; $("pSearch").value=""; $("pAppQ").value=""; $("pAppS").value="";
    setPortalPage("applicants");
    $("pAppJ").value=String(a.jobId||jobId||""); filterPortalLists();
    const sel=document.querySelector(`#appList .app-status[data-app="${CSS.escape(ref)}"]`);
    requestAnimationFrame(()=>flashEl(sel&&sel.closest(".app-row")));
  } else if(type==="chat"){
    renderPortal(); openChatById(ref);
  }
}
/* student dashboard: open what an activity item is about */
function openStudentNotif(type, ref){
  if(type==="app"){
    setStudentPage("apps");
    const card=document.querySelector(`#sp_apps .st-app[data-jid="${CSS.escape(ref)}"]`);
    if(!card) return gone();
    requestAnimationFrame(()=>flashEl(card));
  } else if(type==="chat") openChatById(ref);
  else if(type==="job"){ if(JOBS.some(x=>x.id===ref)) openJob(ref); else gone(); }
  else if(type==="shift") setStudentPage("hours");
}
function handleNotifActivate(e){
  const r=e.target.closest("[data-ntype]"); if(!r) return;
  if(e.type==="keydown"){ if(e.key!=="Enter" && e.key!==" ") return; e.preventDefault(); }
  const {ntype, nref, njob, nkey, nid}=r.dataset;
  if(nid){ const n=NS.items.find(x=>x.id===nid); readNotif(nid); if(n){ openNotifLink(n.link); return; } }
  if(r.closest("#stDash")) openStudentNotif(ntype, nref); else openPortalNotif(ntype, nref, njob, nkey);
}
document.addEventListener("click", handleNotifActivate);
document.addEventListener("keydown", handleNotifActivate);

/* ---- page renderers ---- */
function renderPortal(){
  if(!portalBuilt) return;
  const D=portalData(), name=D.co.name||"Employer";
  document.querySelectorAll("#pNav [data-p]").forEach(b=>{ const p=PORTAL_PAGES.find(x=>x[0]===b.dataset.p); if(p && b.childNodes[1]) b.childNodes[1].textContent=L(p[2],p[3]); });
  $("pName").textContent=name; $("pAvatar").textContent=initials(name);
  $("pTheme").textContent=document.documentElement.dataset.theme==="dark"?"☀️":"🌙";
  const n=unseenCount(); $("pBellN").textContent=n||""; $("pBellN").style.display=n?"":"none";
  const newApps=D.apps.filter(a=>a.status==="new").length;
  $("pc_applicants").textContent=newApps||""; $("pc_notifications").textContent=n||"";
  if(portalPage==="dashboard") renderPortalDashboard(D);
  if(portalPage==="company") renderPortalCompany(D);
  if(portalPage==="notifications") renderPortalNotifications();
  if(portalPage==="settings") renderPortalSettings(D);
  if(portalPage==="applicants"){ const sel=$("pAppJ"), cur=sel.value; sel.innerHTML=`<option value="">${L("All jobs","전체 공고")}</option>`+D.jobs.map(j=>`<option value="${esc(j.id)}" ${cur===String(j.id)?"selected":""}>${esc(j.title)}</option>`).join(""); }
  filterPortalLists();
}
function renderPortalDashboard(D){
  const name=D.co.name||"Employer", el=$("pg_dashboard");
  const days=30, appS=series(D.apps.map(a=>a.createdAt||0),days,false);
  const labels=[...Array(days)].map((_,i)=>{ const d=new Date(Date.now()-(days-1-i)*86400000); return i%5===0||i===days-1 ? `${d.toLocaleString("en",{month:"short"})} ${d.getDate()}` : ""; });
  const jobT=D.jobs.map(j=>j.createdAt||0), appT=D.apps.map(a=>a.createdAt||0);
  const cards=[
    ["💼",L("Total Jobs Posted","전체 공고"),D.jobs.length,L("All-time job listings","누적 공고"),sparkSvg(series(jobT,14,true),"#2f5bea"),"c-blue",'data-go="jobs" data-jf=""',L("Show all my jobs","내 공고 전체 보기")],
    ["🚩",L("Active Jobs","진행 중"),D.active.length,L("Currently hiring","채용 중"),sparkSvg(series(jobT,14,true),"#0f9d8a"),"c-teal",'data-go="jobs" data-jf="open"',L("Show open jobs","진행 중인 공고 보기")],
    ["👥",L("Total Applications","전체 지원"),D.apps.length,L("Applications received","받은 지원서"),sparkSvg(series(appT,14,true),"#7c3aed"),"c-purple",'data-go="applicants" data-af=""',L("Show all applicants","전체 지원자 보기")],
    ["⏰",L("Expiring Soon","마감 임박"),D.soon.length,L("Within 7 days","7일 이내"),sparkSvg([0,0,1,0,1,1,D.soon.length],"#ff8a3d"),"c-orange",'data-go="jobs" data-jf="soon"',L("Show jobs closing within 7 days","7일 이내 마감 공고 보기")]];
  const parts=[{k:"Active",f:"open",v:D.active.length,c:"#16a34a"},{k:"Closed",f:"closed",v:D.closed.length,c:"#7c3aed"},{k:"Expired",f:"expired",v:D.exp.length,c:"#60a5fa"}];
  const recent=D.jobs.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,4);
  const timeline=notifItems().slice(0,4);
  el.innerHTML = `
    <div class="p-welcome"><div><h1>${L("Welcome back","다시 오신 걸 환영해요")}, ${esc(name)}! <span class="wave">👋</span></h1><p>${L("Here's what's happening with your recruitment today.","오늘의 채용 현황이에요.")}</p></div>
      <span class="p-date">📅 ${new Date().toLocaleDateString("en",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span></div>
    <div class="p-dgrid">
      <div class="p-col">
        <div class="p-stats">${cards.map(([i,t,v,s,sp,c,go,aria],k)=>`<div class="p-stat p-stat-link ${c}" style="--d:${k*0.08}s" ${go} role="button" tabindex="0" aria-label="${esc(aria)}: ${v}"><div class="ps-top"><span class="ps-ic">${i}</span><div><small>${t}</small><b data-count="${v}">0</b></div></div><div class="ps-bot"><span>${s}</span>${sp}</div></div>`).join("")}</div>
        <div class="p-row2">
          <div class="p-card"><div class="pc-head"><b>${L("Job Performance","지원 추이")}</b><span class="p-chip">${L("Last 30 days","최근 30일")}</span></div>
            ${D.apps.length?lineChartSvg(appS,labels):`<div class="empty" style="padding:40px">${L("No applications yet — they'll show up here as a chart.","아직 지원서가 없어요.")}</div>`}</div>
          <div class="p-card"><div class="pc-head"><b>${L("Job Status","공고 상태")}</b></div>
            <div class="donut-wrap"><div class="donut-box">${donutSvg(parts)}<div class="donut-c"><b data-count="${D.jobs.length}">0</b><small>${L("Total Jobs","전체")}</small></div></div>
            <ul class="legend">${parts.map(p=>`<li class="p-link" data-go="jobs" data-jf="${p.f}" role="button" tabindex="0" aria-label="${L("Show","보기:")} ${p.k} ${L("jobs","공고")}: ${p.v}"><i style="background:${p.c}"></i>${p.k}<b>${p.v}</b></li>`).join("")}</ul></div></div>
        </div>
        <div class="p-row2">
          <div class="p-card"><div class="pc-head"><b>${L("Recent Job Listings","최근 공고")}</b><a href="#" data-go="jobs">${L("View all →","전체 보기 →")}</a></div>
            ${recent.length?`<table class="p-table"><tr><th>${L("Job","공고")}</th><th>${L("Location","지역")}</th><th>👥</th><th>${L("Status","상태")}</th></tr>${recent.map(j=>{ const c=CATS[j.cat]||CATS.office, n=D.apps.filter(a=>String(a.jobId)===String(j.id)).length, open=D.active.includes(j); return `<tr><td><b>${esc(j.title)}</b><small>${new Date(j.createdAt||Date.now()).toLocaleDateString()}</small></td><td>📍 ${esc(j.area||j.city)}</td><td>${n}</td><td><span class="p-pill ${open?"st-hired":"st-rejected"}">${open?"Active":"Closed"}</span></td></tr>`; }).join("")}</table>`:`<div class="empty" style="padding:24px">${L("No jobs yet.","공고가 없어요.")} <button class="link-btn" data-go="post">${L("Post your first job","첫 공고 올리기")}</button></div>`}</div>
          <div class="p-card"><div class="pc-head"><b>${L("Recent Applications","최근 지원")}</b><a href="#" data-go="applicants">${L("View all →","전체 보기 →")}</a></div>
            ${D.apps.length?D.apps.slice(0,4).map(a=>`<div class="p-app">${avatarHtml(a)}<div><b>${esc(a.name)}</b><small>${esc(a.jobTitle)}</small></div><small>${new Date(a.createdAt||Date.now()).toLocaleDateString()}</small>${statusPill(a.status)}</div>`).join(""):`<div class="empty" style="padding:24px">${L("No applications yet.","지원서가 없어요.")}</div>`}</div>
        </div>
      </div>
      <div class="p-col p-right">
        <div class="p-hero-card"><h3>${L("Post a New Job","새 공고 올리기")}</h3><p>${L("Find talented international students for your team.","팀에 맞는 유학생 인재를 찾아보세요.")}</p><button class="btn" data-go="post">+ ${L("Post a Job","공고 등록")}</button>${SKYLINE_SVG}</div>
        <div class="p-card"><div class="pc-head"><b>${L("Quick Actions","빠른 메뉴")}</b></div>
          <div class="p-quick"><button data-go="post" class="q1">➕<span>${L("Post a Job","공고 등록")}</span></button><button data-go="jobs" class="q2">💼<span>${L("View All Jobs","공고 보기")}</span></button><button data-go="applicants" class="q3">👥<span>${L("Manage Applicants","지원자 관리")}</span></button><button data-go="company" class="q4">🏢<span>${L("Edit Company","기업 정보")}</span></button></div></div>
        <div class="p-card"><div class="pc-head"><b>${L("Activity Timeline","활동")}</b><a href="#" data-go="notifications">${L("View all →","전체 →")}</a></div>
          ${timeline.length?`<ul class="p-timeline">${timeline.map(n=>`<li class="p-click" ${notifAttrs(n)}><span class="tl-ic">${n.icon}</span><div><b>${esc(n.title)}</b><small>${esc(n.text)}</small></div><em>${relTime(n.t)}</em></li>`).join("")}</ul>`:`<div class="empty" style="padding:20px">${L("Nothing yet.","아직 없어요.")}</div>`}</div>
      </div>
    </div>`;
  el.querySelectorAll("a[data-go]").forEach(a=>a.addEventListener("click",e=>e.preventDefault()));
  animateNumbers(el);
}
function renderPortalCompany(D){
  const co=D.co, el=$("pg_company"), panel=$("coInfo").closest(".panel");
  el.innerHTML = `<div class="p-head"><div><h2>${L("Company Profile","기업 정보")}</h2><p>${L("Your company information and public profile.","기업 정보와 공개 프로필이에요.")}</p></div><button class="btn btn-primary" id="pEditCo">✏️ ${L("Edit Profile","수정")}</button></div>
    <div class="p-card p-cover"><div class="p-banner"><span>${esc(co.name||"")}</span></div>
      <div class="p-cohead"><div class="p-colo">${esc(initials(co.name||"WA"))}</div><div><h3>${esc(co.name||"—")}</h3><small>${esc((CATS[co.type]||{}).en||"")} · ${esc(co.city||"")}</small></div></div>
      <div class="p-cogrid">${[["🏷️",L("Business type","업종"),(CATS[co.type]||{}).en],["📞",L("Phone","전화"),co.phone],["👤",L("Contact person","담당자"),co.contact],["📍",L("Address","주소"),[co.city,co.address].filter(Boolean).join(", ")],["✉️",L("Email","이메일"),co.email],["🗣️",L("Languages","언어"),co.langs],["🧾",L("Business no.","사업자번호"),co.biz]]
        .filter(r=>r[2]).map(([i,k,v])=>`<div><span class="pi">${i}</span><div><small>${k}</small><b>${esc(v)}</b></div></div>`).join("")}</div></div>`;
  el.append(panel);
  $("pEditCo").onclick=()=>openAuth("employer");
}
function renderPortalNotifications(){
  const el=$("pg_notifications"), seen=store.get(seenKey(),0), rs=readSet(), items=notifItems();
  const tab=el.dataset.tab||"all", shown=items.filter(n=>tab==="all"||n.type===tab);
  const cnt=t=>items.filter(n=>t==="all"||n.type===t).length;
  el.innerHTML = `<div class="p-head"><div><h2>${L("Notifications","알림")}</h2><p>${L("Updates on applications and your jobs.","지원서와 공고 소식이에요.")}</p></div><button class="btn btn-ghost" id="pMarkRead">${L("Mark all as read","모두 읽음")}</button></div>
    <div class="p-tabs">${[["all","All"],["app","Applications"],["job","Jobs"],["chat","Messages"]].map(([k,l])=>`<button data-tab="${k}" class="${tab===k?"on":""}">${l} (${cnt(k)})</button>`).join("")}</div>
    <div class="p-card">${shown.length?shown.map(n=>`<div class="p-note p-click ${isUnread(n,seen,rs)?"unread":""}" ${notifAttrs(n)}><span class="tl-ic">${n.icon}</span><div><b>${esc(n.title)}</b><small>${esc(n.text)}</small></div><em>${relTime(n.t)}</em></div>`).join(""):`<div class="empty" style="padding:30px">${L("No notifications.","알림이 없어요.")}</div>`}</div>
    ${NS.more?`<div style="text-align:center;margin-top:12px"><button class="btn btn-ghost btn-sm" id="pNotifMore">${L("Load older","이전 알림 더 보기")}</button></div>`:""}`;
  el.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{ el.dataset.tab=b.dataset.tab; renderPortalNotifications(); });
  $("pMarkRead").onclick=()=>{ store.set(seenKey(),Date.now()); markAllNotifsRead(); };
  if($("pNotifMore")) $("pNotifMore").onclick=loadMoreNotifs;
}
/* ---- P5: "Security" card used by BOTH settings pages (employer portal + student dashboard) ---- */
function securityCardHTML(){
  return `<div class="p-card p-set"><h3>🔒 ${L("Security","보안")}</h3>
      <div class="p-setrow"><span>${L("Change password","비밀번호 변경")}</span><button class="btn btn-ghost btn-sm" data-sec="toggle">${L("Change","변경")}</button></div>
      <form class="p-pwform" data-sec="form" hidden novalidate>
        <label>${L("Current password","현재 비밀번호")}<input type="password" name="cur" autocomplete="current-password" maxlength="72"></label>
        <label>${L("New password","새 비밀번호")}<input type="password" name="pw1" autocomplete="new-password" maxlength="72" placeholder="${L("8+ characters, a letter and a number","8자 이상, 영문과 숫자 포함")}"></label>
        <label>${L("Confirm new password","새 비밀번호 확인")}<input type="password" name="pw2" autocomplete="new-password" maxlength="72"></label>
        <p class="p-pwerr" data-sec="err" role="alert"></p>
        <div class="p-pwbtns"><button type="button" class="btn btn-ghost btn-sm" data-sec="cancel">${L("Cancel","취소")}</button><button type="submit" class="btn btn-primary btn-sm">${L("Save password","비밀번호 저장")}</button></div>
      </form>
      <div class="p-setrow"><span>${L("Log out of all devices (phones, other computers)","모든 기기에서 로그아웃 (휴대폰, 다른 컴퓨터)")}</span><button class="btn btn-ghost btn-sm" data-sec="all">${L("Log out everywhere","모든 기기 로그아웃")}</button></div></div>`;
}
function bindSecurityCard(el){
  const f=el.querySelector('[data-sec="form"]'), err=el.querySelector('[data-sec="err"]');
  if(!f) return;
  const open=on=>{ f.hidden=!on; err.textContent=""; if(on) f.elements.cur.focus(); else f.reset(); };
  el.querySelector('[data-sec="toggle"]').onclick=()=>open(f.hidden);
  el.querySelector('[data-sec="cancel"]').onclick=()=>open(false);
  f.onsubmit=async e=>{
    e.preventDefault(); err.textContent="";
    const cur=f.elements.cur.value, pw1=f.elements.pw1.value, pw2=f.elements.pw2.value, email=(backend.user&&backend.user.email)||"";
    if(!cur){ err.textContent=L("Please type your current password.","현재 비밀번호를 입력해 주세요."); return; }
    const bad=passwordProblem(pw1,email); if(bad){ err.textContent=bad; return; }
    if(pw1!==pw2){ err.textContent=L("The two new passwords don't match.","새 비밀번호가 서로 달라요."); return; }
    if(!window.wahAuth){ err.textContent=L("Not available right now.","지금은 사용할 수 없어요."); return; }
    const btn=f.querySelector('[type="submit"]'); btn.disabled=true;
    try{ await window.wahAuth.changePassword(cur,pw1); open(false); toast(L("Password changed. Other devices were logged out.","비밀번호가 변경됐어요. 다른 기기는 로그아웃됐어요.")); }
    catch(e2){ err.textContent=e2.fromServer?e2.message:authErr(e2); }
    finally{ btn.disabled=false; }
  };
  el.querySelector('[data-sec="all"]').onclick=async()=>{
    if(!window.wahAuth) return;
    if(!confirm(L("Log out on every device, including this one?","이 기기를 포함한 모든 기기에서 로그아웃할까요?"))) return;
    try{ await window.wahAuth.logoutAll(); toast(L("Logged out everywhere","모든 기기에서 로그아웃됐어요")); setTimeout(()=>location.reload(),700); }
    catch(e2){ toast(e2.fromServer?e2.message:authErr(e2)); }
  };
}
function renderPortalSettings(D){
  const el=$("pg_settings"), email=(backend.user&&backend.user.email)||D.co.email||"";
  el.innerHTML = `<div class="p-head"><div><h2>${L("Settings","설정")}</h2><p>${L("Manage your account and preferences.","계정과 환경을 관리하세요.")}</p></div></div>
    <div class="p-card p-set"><h3>👤 ${L("Account","계정")}</h3><div class="p-setrow"><span>${L("Login email","로그인 이메일")}</span><b>${esc(email||"—")}</b></div><div class="p-setrow"><span>${L("Member type","회원 유형")}</span><b>Employer</b></div>
      <div class="p-setrow"><span>${L("Company details","기업 정보")}</span><button class="btn btn-ghost btn-sm" id="pSetCo">${L("Edit","수정")}</button></div></div>
    ${securityCardHTML()}${emailNotifCardHTML()}
    <div class="p-card p-set"><h3>🎨 ${L("Appearance","화면")}</h3>
      <div class="p-setrow"><span>${L("Dark mode","다크 모드")}</span><label class="switch"><input type="checkbox" id="pSetDark" ${document.documentElement.dataset.theme==="dark"?"checked":""}><i></i></label></div>
      <div class="p-setrow"><span>${L("Language","언어")}</span><div class="lang"><button data-l="en" class="${lang==="en"?"on":""}">EN</button><button data-l="ko" class="${lang==="ko"?"on":""}">한국어</button></div></div></div>
    <div class="p-card p-set"><h3>📄 ${L("Legal","약관")}</h3><div class="p-setrow"><span><a href="#privacy">Privacy Policy</a> · <a href="#terms">Terms of Use</a></span></div></div>
    <div class="p-card p-set"><h3>📦 ${L("Your data","내 정보")}</h3><div class="p-setrow"><span>${L("Download a copy of everything we store about you (JSON file).","저장된 내 정보 전체를 내려받습니다 (JSON 파일).")}</span><a class="btn btn-ghost btn-sm" href="/api/fb/auth/me/export" download>${L("Download my data","내 정보 다운로드")}</a></div></div>
    <div class="p-card p-set danger"><h3>⚠️ ${L("Danger zone","위험 구역")}</h3><div class="p-setrow"><span>${L("Delete your account and all your job posts.","계정과 모든 공고를 삭제합니다.")}</span><button class="btn btn-danger btn-sm" id="pSetDel">${L("Delete account","계정 삭제")}</button></div></div>`;
  $("pSetCo").onclick=()=>openAuth("employer");
  $("pSetDark").onchange=()=>{ $("themeBtn").click(); renderPortal(); };
  el.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>document.querySelector(`.lang button[data-lang="${b.dataset.l}"]`).click());
  $("pSetDel").onclick=openDeleteAccount;
  bindSecurityCard(el); bindEmailNotifCard(el);
  el.querySelectorAll('a[href="#privacy"],a[href="#terms"]').forEach(a=>a.addEventListener("click",()=>document.body.classList.remove("dash")));
}
function filterPortalLists(){
  if(!portalBuilt) return;
  const jq=$("pJobQ").value.trim().toLowerCase(), js=$("pJobS").value;
  const JF=[["",L("All","전체")],["open",L("Open","진행 중")],["closed",L("Closed","마감")],["expired",L("Expired","기한 만료")],["soon",L("Expiring soon","마감 임박")]];
  const cur=JF.find(f=>f[0]===js);
  $("pJobFilter").innerHTML = JF.map(([k,l])=>`<button type="button" data-jfset="${k}" class="${js===k?"on":""}" aria-pressed="${js===k}">${l}</button>`).join("")
    + (js&&cur?`<button type="button" class="p-jfclear" data-jfset="" aria-label="${L("Clear filter","필터 지우기")}">${esc(cur[1])} ✕ ${L("clear","지우기")}</button>`:"");
  document.querySelectorAll("#myJobs .my-job").forEach(r=>{ const st=r.dataset.jst;
    const ok = !js || (js==="soon" ? r.dataset.soon==="1" : st===js);
    r.style.display = (!jq || r.textContent.toLowerCase().includes(jq)) && ok ? "" : "none"; });
  const aq=($("pAppQ").value||portalQuery).trim().toLowerCase(), aj=$("pAppJ").value, as=$("pAppS").value;
  document.querySelectorAll("#appList .app-row").forEach(r=>{ const sel=r.querySelector(".app-status"), a=sel&&applications.find(x=>x.id===sel.dataset.app);
    r.style.display = (!aq || r.textContent.toLowerCase().includes(aq)) && (!aj || (a&&String(a.jobId)===aj)) && (!as || (a&&a.status===as)) ? "" : "none"; });
}
function openLogoutConfirm(){
  openModal(`<div style="text-align:center;padding:14px 6px"><div class="logout-ic">🚪</div><h3 style="font-size:24px;margin:10px 0 6px">${L("Log Out","로그아웃")}</h3>
    <p style="color:var(--ink-2)">${L("Are you sure you want to log out of your employer account?","기업 계정에서 로그아웃할까요?")}</p>
    <div class="form-actions"><button class="btn btn-ghost" id="loNo">${L("Cancel","취소")}</button><button class="btn btn-primary" id="loYes">↪ ${L("Log Out","로그아웃")}</button></div></div>`);
  $("loNo").onclick=closeModal; $("loYes").onclick=()=>{ closeModal(); doLogout(); };
}

/* ---- account menu on the top-bar avatar/name chip ---- */
// items: [[icon, label, onClick], ...]
function attachMeMenu(chip, items){
  chip.classList.add("p-me-btn");
  chip.setAttribute("role","button"); chip.setAttribute("tabindex","0");
  chip.setAttribute("aria-haspopup","menu"); chip.setAttribute("aria-expanded","false");
  const close=()=>{ const m=chip.querySelector(".p-me-menu"); if(m) m.remove(); chip.setAttribute("aria-expanded","false"); };
  const open=()=>{
    const m=document.createElement("div"); m.className="p-me-menu"; m.setAttribute("role","menu");
    items().forEach(([ic,label,fn])=>{
      if(ic==="-"){ m.append(document.createElement("hr")); return; }
      const b=document.createElement("button"); b.type="button"; b.setAttribute("role","menuitem");
      b.innerHTML=`<span>${ic}</span>${esc(label)}`;
      b.onclick=e=>{ e.stopPropagation(); close(); fn(); };
      m.append(b);
    });
    chip.append(m); chip.setAttribute("aria-expanded","true");
    const first=m.querySelector("button"); if(first) first.focus();
  };
  const toggle=()=>chip.querySelector(".p-me-menu") ? close() : open();
  chip.addEventListener("click", e=>{ if(e.target.closest(".p-me-menu")) return; e.stopPropagation(); toggle(); });
  chip.addEventListener("keydown", e=>{
    if((e.key==="Enter"||e.key===" ") && !e.target.closest(".p-me-menu")){ e.preventDefault(); toggle(); }
    else if(e.key==="Escape"){ close(); chip.focus(); }
  });
  document.addEventListener("click", e=>{ if(!chip.contains(e.target)) close(); });
}

/* ---- hook into the existing dashboard code ---- */
const _renderDashboardP = renderDashboard;
renderDashboard = function(){ _renderDashboardP(); buildPortal(); renderPortal(); };
const _showViewP = showView;
showView = function(v){ _showViewP(v); if(v==="dashboard" && document.body.classList.contains("dash")){ buildPortal(); setPortalPage(portalPage||"dashboard"); } };
const _startNewJobP = startNewJob;
startNewJob = function(silent){ if(portalBuilt && portalPage!=="post" && !silent) setPortalPage("post"); _startNewJobP(silent); };
const _startEditJobP = startEditJob;
startEditJob = function(id){ if(portalBuilt) setPortalPage("post"); _startEditJobP(id); };
const _renderApplicationsP3 = renderApplications;
renderApplications = function(){ _renderApplicationsP3(); filterPortalLists(); };

// after a job is saved, show the list of jobs
const _savePostingP = savePosting;
savePosting = async function(...args){ const fromForm=$("jfSubmit").disabled; const r = await _savePostingP.apply(this,args); if(r && fromForm && portalBuilt && portalPage==="post") setTimeout(()=>setPortalPage("jobs"),0); return r; };
// About numbers: refresh once the jobs have loaded
const _renderAllInfo = renderAll;
renderAll = function(){ _renderAllInfo(); const b=$("infoBody"); if(b && document.body.classList.contains("info") && b.dataset.page==="about" && b.dataset.jobs!==String(JOBS.length)){ const y=window.scrollY; showInfo("about"); window.scrollTo(0,y); } };
// first load: open About / Privacy / Terms if the link points there
routeInfo();

/* ==========================================================================
   FEATURES 4: Company profile builder
   logo, cover, about, website, size, founded year, perks
   + students see a company card on each job and can open the company page
   ========================================================================== */
const CO_SIZES = ["1–4","5–9","10–49","50–99","100+"];
const CO_PERKS = [
  ["meal","🍱","Free meals","식사 제공"],["flex","🕒","Flexible hours","유연 근무"],["transport","🚌","Transport fee","교통비 지원"],
  ["visa","🛂","Permit paperwork help","허가 서류 도움"],["housing","🏠","Housing support","숙소 지원"],["bonus","🎁","Bonus","보너스"],
  ["training","📚","Training provided","교육 제공"],["korean","🗣️","Korean practice","한국어 연습"]];
const CO_COVERS = {
  ocean:"linear-gradient(120deg,#1d4ed8,#ff8a3d)", mint:"linear-gradient(120deg,#0f9d8a,#60a5fa)", berry:"linear-gradient(120deg,#7c3aed,#ec4899)",
  sunset:"linear-gradient(120deg,#ff5a36,#fbbf24)", night:"linear-gradient(120deg,#14213d,#2f5bea)", forest:"linear-gradient(120deg,#166534,#84cc16)"};
const CO_EXTRA = ["logo","cover","about","website","kakao","size","founded","perks"];
const coLogo = co => co && PHOTO_RE.test(co.logo||"") ? co.logo : "";
const coCover = co => CO_COVERS[(co&&co.cover)||"ocean"] || CO_COVERS.ocean;
const safeUrl = u => /^https?:\/\/[^\s"'<>]+$/i.test(u||"") ? u : "";
const perkChips = co => (Array.isArray(co.perks)?co.perks:[]).map(k=>CO_PERKS.find(p=>p[0]===k)).filter(Boolean)
  .map(p=>`<span class="co-perk">${p[1]} ${L(p[2],p[3])}</span>`).join("");

function coCompleteness(co){
  co = co || {};
  const checks = [co.name, co.type, co.phone, co.email, co.city||co.address, co.contact, coLogo(co), (co.about||"").length>=30,
                  co.website, co.size, co.founded, Array.isArray(co.perks)&&co.perks.length];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}
function coLogoHtml(co, cls){
  const lg = coLogo(co);
  return lg ? `<div class="${cls} has-img"><img src="${lg}" alt=""></div>` : `<div class="${cls}">${esc(initials(co.name||"WA"))}</div>`;
}
// The public company card (used by the preview, the job pop-up and the company page)
function companyCardHtml(co, opts){
  opts = opts || {};
  const site = safeUrl(co.website), meta = [ (CATS[co.type]||{}).en, co.city, co.size?co.size+" "+L("employees","명"):"", co.founded?L("Since ","설립 ")+co.founded:"" ].filter(Boolean);
  return `<div class="co-card">
    <div class="co-cover" style="background:${coCover(co)}"></div>
    <div class="co-body">
      ${coLogoHtml(co,"co-logo")}
      <h3>${esc(co.name||L("Your company","회사 이름"))}${verBadge({verified:co.verified===true})}</h3>
      <div class="co-meta">${meta.map(esc).join(" · ")}</div>
      ${co.about?`<p class="co-about">${esc(co.about)}</p>`:opts.preview?`<p class="co-about" style="color:var(--muted)">${L("Write a few lines about your company…","회사 소개를 적어 주세요…")}</p>`:""}
      ${perkChips(co)?`<div class="co-perks">${perkChips(co)}</div>`:""}
      <div class="co-links">${site?`<a href="${esc(site)}" target="_blank" rel="noopener nofollow">🌐 ${esc(site.replace(/^https?:\/\//,"").replace(/\/$/,""))}</a>`:""}${co.kakao?`<span>💬 Kakao: ${esc(co.kakao)}</span>`:""}${opts.jobsBtn||""}</div>
    </div></div>`;
}

/* ---- employer: Company Profile page with builder form + live preview ---- */
let coDraft = null;
renderPortalCompany = function(D){
  const el=$("pg_company"), panel=$("coInfo").closest(".panel"), co=D.co||{};
  if(!myPosting()||!co.name){
    el.innerHTML = `<div class="p-head"><div><h2>${L("Company Profile","기업 정보")}</h2></div></div>
      <div class="p-card" style="text-align:center;padding:40px"><div style="font-size:44px">🏢</div><h3>${L("Add your company first","먼저 회사 정보를 등록하세요")}</h3>
      <p style="color:var(--muted);margin:6px 0 16px">${L("Name, business number and contact — then you can add a logo and more.","상호명, 사업자번호, 연락처를 먼저 입력하세요.")}</p><button class="btn btn-primary" id="coStart">${L("Add company info","회사 정보 등록")}</button></div>`;
    el.append(panel); $("coStart").onclick=()=>openAuth("employer"); return;
  }
  coDraft = JSON.parse(JSON.stringify(co)); coDraft.perks = Array.isArray(coDraft.perks)?coDraft.perks:[];
  const pct = coCompleteness(coDraft);
  el.innerHTML = `<div class="p-head"><div><h2>${L("Company Profile","기업 정보")}</h2><p>${L("This is what students see on every job you post.","학생들이 공고에서 보는 회사 정보예요.")}</p></div>
      <button class="btn btn-ghost" id="coBasic">✏️ ${L("Edit name, phone, address","상호·연락처·주소 수정")}</button></div>
    <div class="p-card co-progress"><div><b>${L("Profile strength","프로필 완성도")}</b><small id="coTip"></small></div><div class="co-bar"><i id="coBarFill" style="width:0"></i></div><b id="coPct" data-count="${pct}">0</b><b>%</b></div>
    <div class="co-builder">
      <form class="p-card co-form" id="coForm" novalidate>
        <h3>🖼️ ${L("Logo & cover","로고 · 커버")}</h3>
        <div class="co-logo-row">
          <div id="coLogoBox">${coLogoHtml(coDraft,"co-logo big")}</div>
          <div><label class="btn btn-ghost btn-sm" for="coLogoIn">📷 ${L("Upload logo","로고 올리기")}</label><input type="file" id="coLogoIn" accept="image/*" hidden>
            <button type="button" class="btn btn-ghost btn-sm" id="coLogoDel">${L("Remove","삭제")}</button>
            <small class="hint">${L("Square image works best. We shrink it automatically.","정사각형 이미지가 좋아요. 자동으로 줄여요.")}</small><div class="err" id="coLogoErr"></div></div>
        </div>
        <div class="co-covers">${Object.entries(CO_COVERS).map(([k,g])=>`<button type="button" data-cover="${k}" style="background:${g}" class="${(coDraft.cover||"ocean")===k?"on":""}" aria-label="${k}"></button>`).join("")}</div>
        <h3>📝 ${L("About the company","회사 소개")}</h3>
        <div class="inp"><textarea name="about" maxlength="600" rows="5" placeholder="${L("What you do, what a shift is like, why students like working here…","하는 일, 근무 분위기, 학생들이 좋아하는 점…")}">${esc(coDraft.about||"")}</textarea><small class="hint" style="text-align:right;display:block"><span id="coAboutN">0</span>/600</small></div>
        <div class="co-two">
          <div class="inp"><label>${L("Company size","직원 수")}</label><select name="size"><option value="">—</option>${CO_SIZES.map(s=>`<option ${coDraft.size===s?"selected":""}>${s}</option>`).join("")}</select></div>
          <div class="inp"><label>${L("Founded (year)","설립 연도")}</label><input name="founded" type="number" min="1900" max="${new Date().getFullYear()}" value="${esc(coDraft.founded||"")}" placeholder="2018"></div>
          <div class="inp"><label>${L("Website","웹사이트")}</label><input name="website" maxlength="120" value="${esc(coDraft.website||"")}" placeholder="https://..."></div>
          <div class="inp"><label>${L("KakaoTalk ID (optional)","카카오톡 ID (선택)")}</label><input name="kakao" maxlength="40" value="${esc(coDraft.kakao||"")}"></div>
        </div>
        <h3>🎁 ${L("Perks for students","복지 · 혜택")}</h3>
        <div class="co-perk-pick">${CO_PERKS.map(([k,i,en,ko])=>`<label><input type="checkbox" name="perk" value="${k}" ${coDraft.perks.includes(k)?"checked":""}><span>${i} ${L(en,ko)}</span></label>`).join("")}</div>
        <div class="err" id="coErr"></div>
        <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-primary" type="submit" id="coSave">💾 ${L("Save profile","저장")}</button>
          <button class="btn btn-ghost" type="button" id="coView">👀 ${L("See it as a student","학생 화면으로 보기")}</button></div>
      </form>
      <div class="co-preview-wrap"><small class="co-live">● ${L("Live preview","미리보기")}</small><div id="coPreview"></div></div>
    </div>`;
  el.append(panel);
  const f=$("coForm");
  const refresh = ()=>{
    const v=n=>f.elements[n].value.trim();
    Object.assign(coDraft,{about:v("about"),size:v("size"),founded:v("founded"),website:v("website"),kakao:v("kakao"),
      perks:[...f.querySelectorAll("[name=perk]:checked")].map(x=>x.value)});
    $("coAboutN").textContent = coDraft.about.length;
    const draftShown = {...coDraft, website: coDraft.website && !/^https?:\/\//i.test(coDraft.website) ? "https://"+coDraft.website : coDraft.website};
    $("coPreview").innerHTML = companyCardHtml(draftShown,{preview:true});
    $("coLogoBox").innerHTML = coLogoHtml(coDraft,"co-logo big");
    const p=coCompleteness(coDraft); $("coPct").textContent=p; $("coBarFill").style.width=p+"%";
    $("coBarFill").className = p>=80?"good":p>=50?"ok":"";
    const missing = !coLogo(coDraft)?L("Add a logo","로고를 추가하세요"):(coDraft.about||"").length<30?L("Write a short intro","소개를 적어 주세요"):!coDraft.perks.length?L("Pick some perks","혜택을 골라 주세요"):!coDraft.website?L("Add your website","웹사이트를 추가하세요"):p<100?L("Almost there!","거의 다 됐어요!"):L("Perfect profile 🎉","완벽해요 🎉");
    $("coTip").textContent = " · "+missing;
  };
  f.addEventListener("input", refresh); f.addEventListener("change", refresh);
  f.querySelectorAll("[data-cover]").forEach(b=>b.onclick=()=>{ coDraft.cover=b.dataset.cover; f.querySelectorAll("[data-cover]").forEach(x=>x.classList.toggle("on",x===b)); refresh(); });
  $("coLogoIn").onchange = async e=>{
    $("coLogoErr").textContent="";
    const file = e.target.files[0]; e.target.value="";
    $("coLogoErr").classList.add("show");
    try{ coDraft.logo = await uploadPhoto(file, "logo", $("coLogoErr"), f.querySelector('label[for="coLogoIn"]')); $("coLogoErr").classList.remove("show"); refresh(); }
    catch{ /* message already shown */ }
  };
  $("coLogoDel").onclick=()=>{ delete coDraft.logo; refresh(); };
  $("coBasic").onclick=()=>openAuth("employer");
  $("coView").onclick=()=>openCompany(backend.uid, coDraft);
  f.onsubmit = async e=>{
    e.preventDefault(); refresh();
    const err=$("coErr"); err.classList.remove("show");
    const yr=new Date().getFullYear();
    if(coDraft.founded && !(+coDraft.founded>=1900 && +coDraft.founded<=yr)) { err.textContent=L(`Founded year must be between 1900 and ${yr}.`,`설립 연도는 1900~${yr} 사이여야 해요.`); err.classList.add("show"); return; }
    if(coDraft.website && !/^https?:\/\//i.test(coDraft.website)) coDraft.website="https://"+coDraft.website;
    if(coDraft.website && !safeUrl(coDraft.website)){ err.textContent=L("That website address doesn't look right.","웹사이트 주소를 확인해 주세요."); err.classList.add("show"); return; }
    const mp=myPosting(); const p=JSON.parse(JSON.stringify(mp)); delete p.uid;
    p.company = {...(p.company||{})};
    CO_EXTRA.forEach(k=>{ const val=coDraft[k]; if(val===undefined||val===""||(Array.isArray(val)&&!val.length)) delete p.company[k]; else p.company[k]= k==="founded"?Number(val):val; });
    $("coSave").disabled=true;
    const ok = await savePosting(p);
    $("coSave").disabled=false;
    if(ok){ toast(L("Company profile saved","기업 정보가 저장됐어요")); renderPortal(); }
  };
  refresh();
  requestAnimationFrame(()=>{ animateNumbers(el); });
};

// keep logo/about/perks when the employer edits name/phone in the sign-up form
const _savePostingCo = savePosting;
savePosting = async function(p, ...rest){
  const old = myPosting() && myPosting().company;
  if(p && p.company && old) CO_EXTRA.forEach(k=>{ if(p.company[k]===undefined && old[k]!==undefined) p.company[k]=old[k]; });
  return _savePostingCo(p, ...rest);
};

/* ---- students: logo on job cards, company card in the job pop-up, company page ---- */
const coOf = uid => { const p=postings.find(x=>x.uid===uid); return p && p.company ? p.company : null; };
const _jobCardCo = jobCard;
jobCard = function(j){
  const html=_jobCardCo(j), co=j.owner&&coOf(j.owner), lg=coLogo(co);
  return lg ? html.replace(/<div class="logo-sq" style="[^"]*">[^<]*<\/div>/, `<div class="logo-sq has-img"><img src="${lg}" alt=""></div>`) : html;
};
const _openJobCo = openJob;
openJob = function(id){
  _openJobCo(id);
  const j=JOBS.find(x=>x.id===id); if(!j || !j.live || !j.owner) return;
  const co=coOf(j.owner); if(!co) return;
  const m=$("modal"), head=m.querySelector(".m-head .logo-sq");
  if(head && coLogo(co)){ head.classList.add("has-img"); head.style.background=""; head.innerHTML=`<img src="${coLogo(co)}" alt="">`; }
  const n=JOBS.filter(x=>x.owner===j.owner).length;
  const box=document.createElement("div");
  box.innerHTML = `<h4>${L("About the company","회사 정보")}</h4>`+companyCardHtml(co,{jobsBtn:`<button class="link-btn" id="coAllJobs">${L(`See all ${n} job${n>1?"s":""} →`,`공고 ${n}개 모두 보기 →`)}</button>`});
  const before = m.querySelector(".apply-form") || m.querySelector("#mLogin")?.parentElement || m.querySelector(".check-visa:last-child");
  before ? before.before(box) : m.append(box);
  $("coAllJobs").onclick=()=>openCompany(j.owner);
};
function openCompany(uid, override){
  const co = override || coOf(uid); if(!co) return;
  const jobs = JOBS.filter(x=>x.owner===uid);
  openModal(companyCardHtml(co)+`<h4 style="margin-top:18px">${L("Open jobs","채용 중인 공고")} (${jobs.length})</h4>
    <div class="co-jobs">${jobs.length?jobs.map(j=>`<button class="co-job" data-job="${esc(j.id)}"><b>${esc(lang==="ko"?j.ko:j.title)}</b><small>📍 ${esc(j.area||j.city)} · ${esc(j.hours)}</small><span>${payHtml(j)}</span></button>`).join(""):`<div class="empty" style="padding:20px">${L("No open jobs right now.","지금은 채용 중인 공고가 없어요.")}</div>`}</div>`, "co-modal");
  $("modal").querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>openJob(b.dataset.job));
}

// portal top bar shows the logo too
const _renderPortalCo = renderPortal;
renderPortal = function(){
  _renderPortalCo();
  if(!portalBuilt) return;
  const co=(myPosting()&&myPosting().company)||{}, a=$("pAvatar"), lg=coLogo(co);
  if(lg){ a.textContent=""; a.style.background=`center/cover url(${lg})`; } else a.style.background="var(--ink)";
};

/* ==========================================================================
   FEATURES 5: Student dashboard (like the employer portal)
   + "Smart match %" explained on the About page
   ========================================================================== */

/* ---- About page: Smart match card ---- */
const MATCH_WEIGHTS = [["🗓️",L("Your schedule","내 일정"),40,"#2f5bea"],["📍",L("Distance from home","집과의 거리"),25,"#0f9d8a"],["💰",L("Hourly pay","시급"),20,"#ff8a3d"],["🇰🇷",L("Korean level","한국어 수준"),15,"#7c3aed"]];
function matchRing(pct, size, cls){
  const r=size/2-6, C=2*Math.PI*r, col = pct>=75?"#16a34a":pct>=50?"#f59e0b":"#ef4444";
  return `<svg class="mring ${cls||""}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="--c:${C.toFixed(1)};--o:${(C*(1-pct/100)).toFixed(1)}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="6"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-pct/100)).toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})" class="mring-arc"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-weight="800" font-size="${size/4.2}" fill="currentColor">${pct}%</text></svg>`;
}
const _aboutHtmlM = aboutHtml;
aboutHtml = function(){
  const card = `<div class="about-match reveal">
    <div class="am-text"><div class="ac-icon">🎯</div>
      <b>${L("Smart match % — jobs ranked just for you","스마트 일치율 — 나에게 맞춘 추천")}</b>
      <p>${L("Tell us when you're free each day and where you live. Every job then gets a match score from 0 to 100%, and the best ones are recommended first. Your schedule and address stay private.","요일별 가능한 시간과 집 위치를 알려주세요. 모든 공고에 0~100% 일치율이 계산되고 가장 잘 맞는 공고부터 추천해요. 일정과 주소는 비공개예요.")}</p>
      <ul class="am-list">
        <li>🗓️ <b>${L("Schedule","일정")}</b> — ${L("how much of the shift falls in your free time","근무 시간이 내 가능 시간과 겹치는 정도")}</li>
        <li>📍 <b>${L("Location","위치")}</b> — ${L("closer to home scores higher (2 km = full score)","집에서 가까울수록 높음 (2km 이내 만점)")}</li>
        <li>💰 <b>${L("Hourly pay","시급")}</b> — ${L("daily and monthly pay are turned into an hourly rate, so you can compare fairly","일급·월급도 시급으로 환산해 공정하게 비교")}</li>
        <li>🇰🇷 <b>${L("Korean level","한국어")}</b> — ${L("your TOPIK level vs. what the job needs","내 TOPIK과 공고 요구 수준 비교")}</li>
      </ul></div>
    <div class="am-demo">
      <div class="am-job"><div><small>${L("Example","예시")}</small><b>Café barista · Mapo</b><span>Sat–Sun 10:00–16:00 · ₩12,000/hr</span></div>${matchRing(87,92,"am-ring")}</div>
      ${MATCH_WEIGHTS.map(([i,t,w,c],k)=>`<div class="am-row"><span>${i} ${t}</span><div class="am-bar"><i style="--w:${w*2.5}%;--d:${0.3+k*0.15}s;background:${c}"></i></div><b>${w}%</b></div>`).join("")}
      <small class="am-note">${L("How much each part counts in the final %","최종 일치율에서 각 항목의 비중")}</small>
    </div></div>`;
  return _aboutHtmlM().replace('<div class="about-cards">', card+'<div class="about-cards">');
};

/* ---- the student's own applications (with the status the employer set) ---- */
let myApps = [], unsubMyApps = null, myAppsUid = null;
function watchMyApps(){
  if(!isStudent()){ if(unsubMyApps){ unsubMyApps(); unsubMyApps=null; } myApps=[]; myAppsUid=null; return; }
  if(backend.mode!=="firebase"){ myApps = applications.filter(a=>!a.studentUid || a.studentUid===backend.uid); return; }
  if(myAppsUid===backend.uid && unsubMyApps) return;
  if(unsubMyApps) unsubMyApps();
  myAppsUid = backend.uid; const F=backend.fb;
  unsubMyApps = F.onSnapshot(F.query(F.collection(backend.db,"applications"), F.where("studentUid","==",backend.uid)), snap=>{
    myApps = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if(document.body.classList.contains("sdash")) renderStudentDash();
  }, err=>console.error("my applications", err));
}

/* ---- portal shell ---- */
const ST_PAGES = [["home","🏠","Dashboard","대시보드"],["jobs","🎯","Recommended","추천 일자리"],["apps","📨","My Applications","내 지원"],["saved","★","Saved Jobs","저장한 공고"],
  ["hours","⏱️","Work Hours","근무 시간"],["messages","💬","Messages","메시지"],["profile","👤","My Profile","내 프로필"],["notifications","🔔","Notifications","알림"],["settings","⚙️","Settings","설정"]];
let stPage="home", stBuilt=false, stAppFilter="";
function buildStudentDash(){
  if(stBuilt) return; stBuilt=true;
  document.body.insertAdjacentHTML("beforeend", `<section id="stDash"><div class="portal st-portal">
    <aside class="p-side" id="sSide">
      <div class="p-logo"><div class="logo-mark">W</div><div><b>Work Abroad Hub</b><small>${L("Student","학생")}</small></div></div>
      <nav id="sNav">${ST_PAGES.map(([k,i,en,ko])=>`<button data-s="${k}"><span>${i}</span>${L(en,ko)}<em class="p-count" id="sc_${k}"></em></button>`).join("")}
        <hr><button id="sBoard"><span>🌐</span>${L("Job board","채용 게시판")}</button><button id="sLogout"><span>↪️</span>${L("Logout","로그아웃")}</button></nav>
      <div class="p-promo st-promo"><b>🛂 ${L("Work safely","안전하게 일하기")}</b><small>${L("Always get your permit before the first shift.","첫 근무 전 반드시 허가를 받으세요.")}</small></div>
    </aside>
    <div class="p-main">
      <div class="p-top"><button class="icon-btn p-burger" id="sBurger">☰</button>
        <label class="p-search">🔍<input id="sSearch" placeholder="${L("Search jobs…","일자리 검색…")}"></label>
        <button class="theme-btn" id="sTheme"></button>
        <div class="p-me" id="sMe"></div></div>
      ${ST_PAGES.map(([k])=>`<div class="p-page" data-page="${k}" id="sp_${k}"></div>`).join("")}
    </div></div></section>`);
  $("sNav").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>setStudentPage(b.dataset.s));
  $("stDash").addEventListener("click", e=>{
    const f=e.target.closest("[data-safset]"); if(f){ stAppFilter=f.dataset.safset; renderStudentDash(); return; }
    const g=e.target.closest("[data-sgo]"); if(g){ e.preventDefault(); setStudentPage(g.dataset.sgo, g.dataset.sf); return; }
    const j=e.target.closest("[data-job]"); if(j && !e.target.closest("button:not([data-job])")) openJob(j.dataset.job);
  });
  $("stDash").addEventListener("keydown", e=>{
    const g=e.target.closest('[data-sgo][role="button"]'); if(g && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); setStudentPage(g.dataset.sgo, g.dataset.sf); }
  });
  $("sBoard").onclick=()=>closeStudentDash();
  $("sLogout").onclick=()=>{
    openModal(`<div style="text-align:center;padding:14px 6px"><div class="logout-ic">🚪</div><h3 style="font-size:24px;margin:10px 0 6px">${L("Log Out","로그아웃")}</h3>
      <p style="color:var(--ink-2)">${L("Are you sure you want to log out?","로그아웃할까요?")}</p>
      <div class="form-actions"><button class="btn btn-ghost" id="loNo">${L("Cancel","취소")}</button><button class="btn btn-primary" id="loYes">↪ ${L("Log Out","로그아웃")}</button></div></div>`);
    $("loNo").onclick=closeModal; $("loYes").onclick=()=>{ closeModal(); closeStudentDash(); doLogout(); };
  };
  $("sBurger").onclick=()=>$("sSide").classList.toggle("open");
  $("sTheme").onclick=()=>{ $("themeBtn").click(); renderStudentDash(); };
  attachMeMenu($("sMe"), ()=>[
    ["👤", L("My Profile","내 프로필"), ()=>setStudentPage("profile")],
    ["⚙️", L("Settings","설정"), ()=>setStudentPage("settings")],
    ["-"],
    ["↪️", L("Logout","로그아웃"), ()=>$("sLogout").click()]
  ]);
  $("sSearch").onkeydown=e=>{ if(e.key!=="Enter") return; const q=e.target.value; closeStudentDash();
    $("qInput").value=q; $("heroSearch").requestSubmit(); };
}
function openStudentDash(page){
  if(!isStudent()){ openAuth("login"); return; }
  buildStudentDash(); watchMyApps();
  document.body.classList.remove("dash","info"); document.body.classList.add("sdash");
  if(location.hash!=="#me") history.replaceState(null,"","#me");
  setStudentPage(page||stPage||"home");
}
function closeStudentDash(){
  document.body.classList.remove("sdash");
  if(location.hash==="#me") history.replaceState(null,"","#top");
  // put the hours tracker back on the main page
  const tr=$("tracker"), anchor=$("forYou")||$("jobs"); if(tr && anchor && tr.closest("#stDash")) anchor.after(tr);
  window.scrollTo(0,0);
}
function setStudentPage(p, filter){
  stPage=p; if(p==="apps") stAppFilter=filter||"";
  document.querySelectorAll("#stDash .p-page").forEach(el=>el.classList.toggle("on", el.dataset.page===p));
  document.querySelectorAll("#sNav [data-s]").forEach(b=>b.classList.toggle("on", b.dataset.s===p));
  $("sSide").classList.remove("open");
  renderStudentDash(); window.scrollTo(0,0);
}

/* ---- data ---- */
function stData(){
  const pf=account.profile||{};
  const ranked = JOBS.map(j=>({j,m:matchFor(j)})).filter(x=>x.m).sort((a,b)=>b.m.pct-a.m.pct);
  const apps = myApps.length ? myApps : [];
  const appliedIds = Array.isArray(account.applied)?account.applied:[];
  const savedJobs = saved.map(id=>JOBS.find(j=>j.id===id)).filter(Boolean);
  const S = weekSummary(0);
  const unread = (typeof chat!=="undefined") ? chat.list.filter(unreadOf).length : 0;
  return {pf, ranked, apps, appliedIds, savedJobs, S, unread};
}
function stCompleteness(){
  const pf=account.profile||{};
  const items=[[pf.name,L("Name","이름")],[pf.phone,L("Phone","전화")],[pf.visa,L("Visa","비자")],[pf.topik,"TOPIK"],[pf.school,L("School","학교")],
    [myPhoto(),L("Photo","사진")],[hasSchedule(),L("Weekly schedule","주간 일정")],[hasHome(),L("Home location","집 위치")]];
  return {pct:Math.round(items.filter(x=>x[0]).length/items.length*100), missing:items.filter(x=>!x[0]).map(x=>x[1])};
}
const stAvatar = (pf,cls) => myPhoto() ? `<img class="${cls}" src="${myPhoto()}" alt="">` : `<span class="${cls}">${esc(initials(pf.name||"?"))}</span>`;
const PIPE = [["new","📨",L("Applied","지원")],["contacted","📞",L("Contacted","연락")],["interview","🗣️",L("Interview","면접")],["hired","🎉",L("Hired","합격")]];
const pipeIdx = s => s==="rejected" ? -1 : Math.max(0, PIPE.findIndex(p=>p[0]===s));
function appStepper(status){
  const i=pipeIdx(status);
  if(i<0) return `<div class="st-steps rej"><span>❌ ${L("Not selected this time — keep going!","이번엔 불합격이에요. 힘내요!")}</span></div>`;
  return `<div class="st-steps">${PIPE.map((p,k)=>`<div class="${k<=i?"done":""} ${k===i?"cur":""}"><i>${p[1]}</i><small>${p[2]}</small></div>`).join("")}<b style="--p:${i/(PIPE.length-1)*100}%"></b></div>`;
}
function stJobRow(j, m){
  return `<div class="st-job" data-job="${esc(j.id)}">
    ${m?matchRing(m.pct,64,"anim"):`<div class="logo-sq" style="background:${(CATS[j.cat]||CATS.office).color}">${esc(initials(j.co))}</div>`}
    <div class="st-job-main"><b>${esc(lang==="ko"?j.ko:j.title)}</b><small>${esc(j.co)} · ${esc(j.city)}${j.area&&j.city!=="Remote"?", "+esc(j.area):""} · 🕒 ${esc(j.hours)}</small>
      ${m?`<div class="st-reasons">${matchReasons(j,m).map(r=>`<span>${esc(r)}</span>`).join("")}</div>`:""}</div>
    <div class="st-job-pay">${payHtml(j)}${applied(j.id)?`<span class="p-pill st-hired">${L("Applied ✓","지원 완료")}</span>`:""}</div></div>`;
}

/* ---- pages ---- */
function renderStudentDash(){
  if(!stBuilt || !document.body.classList.contains("sdash")) return;
  if(!isStudent()){ closeStudentDash(); return; }
  const D=stData(), pf=D.pf;
  $("sMe").innerHTML = `${stAvatar(pf,"p-av")}<b>${esc(pf.name||"")}</b>`;
  $("sTheme").textContent=document.documentElement.dataset.theme==="dark"?"☀️":"🌙";
  document.querySelectorAll("#sNav [data-s]").forEach(b=>{ const p=ST_PAGES.find(x=>x[0]===b.dataset.s); if(p&&b.childNodes[1]) b.childNodes[1].textContent=L(p[2],p[3]); });
  $("sc_saved").textContent=D.savedJobs.length||""; $("sc_messages").textContent=D.unread||""; $("sc_notifications").textContent=NS.unread||"";
  $("sc_apps").textContent=D.apps.filter(a=>a.status==="interview"||a.status==="contacted").length||"";
  const el=$("sp_"+stPage); if(!el) return;
  ({home:stHome,jobs:stJobs,apps:stApps,saved:stSaved,hours:stHours,messages:stMessages,profile:stProfile,notifications:stNotifications,settings:stSettings})[stPage](el,D);
  animateNumbers(el);
}
function stHome(el,D){
  const pf=D.pf, S=D.S, v=S.v, comp=stCompleteness();
  const limit=v.vacation?null:v.limit, hpct=limit?Math.min(100,S.counted/limit*100):0;
  const inProg=D.apps.filter(a=>a.status==="contacted"||a.status==="interview").length;
  const cards=[["📨",L("Applications","지원"),D.apps.length||D.appliedIds.length,L("Jobs you applied to","지원한 공고"),"c-blue","apps","",L("Show all my applications","내 지원 전체 보기")],
    ["🗣️",L("In progress","진행 중"),inProg,L("Contacted or interview","연락·면접 단계"),"c-purple","apps","progress",L("Show applications in progress","진행 중인 지원 보기")],
    ["★",L("Saved jobs","저장한 공고"),D.savedJobs.length,L("Waiting for you","관심 공고"),"c-orange","saved","",L("Show saved jobs","저장한 공고 보기")],
    ["⏱️",L("Hours this week","이번 주 근무"),S.counted,limit?L(`of ${limit} h allowed`,`허용 ${limit}시간 중`):L("Vacation — no limit","방학 — 제한 없음"),"c-teal","hours","",L("Open work hours","근무 시간 보기")]];
  // hours per day this week
  const perDay=[0,0,0,0,0,0,0]; S.list.forEach(s=>{ const d=(new Date(s.date+"T00:00").getDay()+6)%7; perDay[d]+=shiftHours(s); });
  const maxH=Math.max(4,...perDay), today=(new Date().getDay()+6)%7;
  const gaugeCol = !limit?"#16a34a":S.counted>limit?"#ef4444":S.counted>=limit*0.8?"#f59e0b":"#16a34a";
  const counts=PIPE.map(p=>D.apps.filter(a=>(a.status||"new")===p[0]).length);
  const av=Array.isArray(account.availability)?account.availability:[];
  const top=D.ranked.slice(0,3);
  const activity=[...D.apps.map(a=>({t:a.createdAt||0,type:"app",ref:String(a.jobId),icon:"📨",title:L("Application sent","지원 완료"),text:`${a.jobTitle} · ${a.company||""}`,st:a.status})),
    ...(typeof chat!=="undefined"?chat.list.map(c=>({t:c.updatedAt||0,type:"chat",ref:String(c.id),icon:"💬",title:L("Message","메시지"),text:`${c.employerName||""}: ${c.lastText||""}`})):[]),
    ...(Array.isArray(account.shifts)?account.shifts:[]).slice(-3).map(s=>({t:new Date(s.date+"T"+s.start).getTime(),type:"shift",ref:s.date,icon:"⏱️",title:L("Shift logged","근무 기록"),text:`${s.date} ${s.start}–${s.end} ${s.place||""}`}))]
    .filter(a=>a.t).sort((a,b)=>b.t-a.t).slice(0,5);
  el.innerHTML = `
    <div class="p-welcome"><div><h1>${L("Hi","안녕하세요")}, ${esc((pf.name||"").split(" ")[0])}! <span class="wave">👋</span></h1><p>${L("Here's your job search at a glance.","나의 구직 현황이에요.")}</p></div>
      <span class="p-date">📅 ${new Date().toLocaleDateString("en",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span></div>
    ${comp.pct<100?`<div class="p-card st-complete p-link" data-sgo="profile" role="button" tabindex="0" aria-label="${L("Finish your profile","프로필 완성하기")}: ${comp.pct}%"><div class="st-cring">${matchRing(comp.pct,56,"anim")}</div><div><b>${L("Complete your profile for better matches","프로필을 완성하면 추천이 더 정확해요")}</b><small>${L("Missing:","부족한 항목:")} ${comp.missing.join(", ")}</small></div><span class="btn btn-primary btn-sm" aria-hidden="true">${L("Finish profile","프로필 완성")}</span></div>`:""}
    <div class="p-dgrid">
      <div class="p-col">
        <div class="p-stats">${cards.map(([i,t,v2,s,c,go,sf,aria],k)=>`<div class="p-stat p-stat-link ${c}" style="--d:${k*0.08}s" data-sgo="${go}"${sf?` data-sf="${sf}"`:""} role="button" tabindex="0" aria-label="${esc(aria)}: ${v2}"><div class="ps-top"><span class="ps-ic">${i}</span><div><small>${t}</small><b data-count="${v2}">0</b></div></div><div class="ps-bot"><span>${s}</span></div></div>`).join("")}</div>
        <div class="p-card"><div class="pc-head"><b>🎯 ${L("Top matches for you","나에게 맞는 공고")}</b><a href="#" data-sgo="jobs">${L("See all →","전체 보기 →")}</a></div>
          ${!(hasSchedule()||hasHome())?`<div class="fy-empty" style="padding:20px"><b>${L("Get your match %","일치율 받기")}</b><p>${L("Add your free time and home so we can rank jobs by schedule, distance and hourly pay.","가능한 시간과 집 위치를 등록하면 일정·거리·시급으로 추천해요.")}</p><button class="btn btn-primary btn-sm" id="sSetup">🗓️ ${L("Add my schedule & home","일정·집 주소 등록")}</button></div>`
            : top.length?top.map(({j,m})=>stJobRow(j,m)).join(""):`<div class="empty" style="padding:20px">${L("No matches yet.","아직 없어요.")}</div>`}</div>
        <div class="p-row2">
          <div class="p-card"><div class="pc-head"><b>📨 ${L("Application progress","지원 진행 상황")}</b><a href="#" data-sgo="apps">${L("View all →","전체 →")}</a></div>
            <div class="st-pipe">${PIPE.map((p,k)=>`<div style="--d:${k*0.12}s"><i>${p[1]}</i><b data-count="${counts[k]}">0</b><small>${p[2]}</small></div>`).join('<span class="st-pipe-arrow">›</span>')}</div>
            ${D.apps.slice(0,2).map(a=>`<div class="st-app-mini"><div><b>${esc(a.jobTitle)}</b><small>${esc(a.company||"")}</small></div>${statusPill(a.status)}</div>`).join("")}</div>
          <div class="p-card"><div class="pc-head"><b>🗓️ ${L("My free time","내 가능 시간")}</b><button class="link-btn" id="sEditSched">${L("Edit","수정")}</button></div>
            <div class="st-week">${DAY_NAMES.map((d,i)=>{ const a=av[i]||{}; const ok=a.on&&TIME_RE.test(a.from||"")&&TIME_RE.test(a.to||""); const s=ok?(toMin(a.from)-360)/1080*100:0, w=ok?Math.max(4,(Math.min(1440,toMin(a.to)<=toMin(a.from)?1440:toMin(a.to))-toMin(a.from))/1080*100):0;
              return `<div class="${i===today?"today":""}"><span>${dayName(i)}</span><div class="st-wbar">${ok?`<i style="left:${Math.max(0,s)}%;width:${Math.min(100-Math.max(0,s),w)}%;--d:${i*0.06}s"></i>`:""}</div><small>${ok?esc(a.from)+"–"+esc(a.to):"—"}</small></div>`; }).join("")}
              <div class="st-wscale"><span></span><div><small>6</small><small>12</small><small>18</small><small>24</small></div><small></small></div></div></div>
        </div>
      </div>
      <div class="p-col p-right">
        <div class="p-card st-gauge-card"><div class="pc-head"><b>🛂 ${L("Visa work hours","비자 근무 시간")}</b><a href="#" data-sgo="hours">${L("Log →","기록 →")}</a></div>
          <div class="st-gauge"><svg viewBox="0 0 200 110"><path d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke="var(--line)" stroke-width="16" stroke-linecap="round"/>
            <path d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke="${gaugeCol}" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="${hpct} 100" class="gauge-arc" style="--g:${hpct}"/></svg>
            <div><b data-count="${S.counted}">0</b><small>${limit?`/ ${limit} h`:"∞"}</small></div></div>
          <p class="st-gauge-note">${!limit?L("School vacation: no weekly limit.","방학: 주간 제한 없음."):S.counted>limit?`⚠️ ${L("Over your limit! This can risk your visa.","허용 시간 초과! 비자에 위험해요.")}`:`✅ ${Math.round((limit-S.counted)*10)/10} ${L("h left this week","시간 남음")}`}${v.weekendFree&&limit?` · ${L("weekends free","주말 무제한")}`:""}</p>
          <div class="st-bars">${perDay.map((h,i)=>`<div class="${i===today?"today":""}"><i style="--h:${h/maxH*100}%;--d:${i*0.07}s" title="${h} h"></i><small>${dayName(i)[0]}</small></div>`).join("")}</div></div>
        <div class="p-card st-me-card">${stAvatar(pf,"st-big-av")}<b>${esc(pf.name||"")}</b><small>${esc(pf.school||"")}</small>
          <div class="st-tags"><span>${esc(pf.visa||"—")}</span><span>${esc(pf.topik||"—")}</span><span>📍 ${esc(pf.city||"—")}</span></div>
          <button class="btn btn-ghost btn-sm" data-sgo="profile">${L("View profile","프로필 보기")}</button></div>
        <div class="p-card"><div class="pc-head"><b>${L("Recent activity","최근 활동")}</b></div>
          ${activity.length?`<ul class="p-timeline">${activity.map(n=>`<li class="p-click" ${notifAttrs(n)}><span class="tl-ic">${n.icon}</span><div><b>${esc(n.title)}</b><small>${esc(n.text)}</small></div><em>${relTime(n.t)}</em></li>`).join("")}</ul>`:`<div class="empty" style="padding:20px">${L("Nothing yet — apply to a job!","아직 없어요. 지원해 보세요!")}</div>`}</div>
      </div>
    </div>`;
  const ss=$("sSetup"); if(ss) ss.onclick=openScheduleModal;
  $("sEditSched").onclick=openScheduleModal;
}
function stJobs(el,D){
  const set=hasSchedule()||hasHome();
  el.innerHTML = `<div class="p-head"><div><h2>🎯 ${L("Recommended for you","추천 일자리")}</h2><p>${L("Every job ranked by your schedule (40%), distance (25%), hourly pay (20%) and Korean level (15%).","일정(40%), 거리(25%), 시급(20%), 한국어(15%)로 순위를 매겼어요.")}</p></div>
    <button class="btn btn-ghost" id="sEditSched2">🗓️ ${L("Edit schedule & home","일정·집 주소 수정")}</button></div>
    ${set?`<div class="p-card">${D.ranked.map(({j,m})=>stJobRow(j,m)).join("")||`<div class="empty">${L("No jobs yet.","공고가 없어요.")}</div>`}</div>`
      :`<div class="p-card fy-empty" style="text-align:center;padding:40px"><div style="font-size:44px">🗓️</div><b>${L("Add your free time and home first","먼저 가능한 시간과 집 위치를 등록하세요")}</b><p>${L("Then every job gets a match %.","그러면 모든 공고에 일치율이 표시돼요.")}</p></div>`}`;
  $("sEditSched2").onclick=openScheduleModal;
}
function stApps(el,D){
  const all = D.apps.length ? D.apps : D.appliedIds.map(id=>{ const j=JOBS.find(x=>x.id===id); return j?{jobId:id,jobTitle:j.title,company:j.co,status:"new",createdAt:0}:null; }).filter(Boolean);
  const f=stAppFilter, list = f==="progress" ? all.filter(a=>a.status==="contacted"||a.status==="interview") : all;
  const bar = all.length ? `<div class="p-tabs" role="group" aria-label="${L("Filter applications","지원 필터")}">${[["",L("All","전체")+` (${all.length})`],["progress",L("In progress","진행 중")+` (${all.filter(a=>a.status==="contacted"||a.status==="interview").length})`]].map(([k,l])=>`<button type="button" data-safset="${k}" class="${f===k?"on":""}" aria-pressed="${f===k}">${l}</button>`).join("")}${f?`<button type="button" class="p-jfclear" data-safset="" aria-label="${L("Clear filter","필터 지우기")}">${L("In progress","진행 중")} ✕ ${L("clear","지우기")}</button>`:""}</div>` : "";
  el.innerHTML = `<div class="p-head"><div><h2>📨 ${L("My Applications","내 지원 현황")}</h2><p>${L("The status updates when the employer reviews your application.","기업이 지원서를 확인하면 상태가 바뀌어요.")}</p></div></div>
    ${bar}${f && !list.length && all.length ? `<div class="p-card empty" style="text-align:center;padding:30px">${L("No applications at the contacted or interview stage yet.","연락·면접 단계의 지원이 아직 없어요.")}</div>` : ""}
    ${list.length?list.map(a=>{ const j=JOBS.find(x=>x.id===String(a.jobId)); return `<div class="p-card st-app" data-jid="${esc(String(a.jobId))}">
      <div class="st-app-top"><div><b>${esc(a.jobTitle)}</b><small>${esc(a.company||"")}${a.createdAt?" · "+new Date(a.createdAt).toLocaleDateString():""}</small></div>${statusPill(a.status)}</div>
      ${appStepper(a.status||"new")}
      <div class="st-app-actions">${j?`<button class="btn btn-ghost btn-sm" data-job="${esc(j.id)}">${L("View job","공고 보기")}</button>`:""}${a.employerUid&&chatOn()?`<button class="btn btn-ghost btn-sm" data-chat="${esc(a.employerUid)}" data-co="${esc(a.company||"")}" data-jt="${esc(a.jobTitle||"")}">💬 ${L("Message employer","기업에 메시지")}</button>`:""}</div></div>`; }).join("")
      :all.length?"":`<div class="p-card" style="text-align:center;padding:40px"><div style="font-size:44px">📨</div><b>${L("No applications yet","아직 지원한 공고가 없어요")}</b><p style="color:var(--muted);margin:6px 0 14px">${L("Your best matches are waiting.","나에게 맞는 공고가 기다려요.")}</p><button class="btn btn-primary" data-sgo="jobs">${L("See recommended jobs","추천 공고 보기")}</button></div>`}`;
  el.querySelectorAll("[data-chat]").forEach(b=>b.onclick=()=>startChat({employerUid:b.dataset.chat, studentUid:backend.uid, employerName:b.dataset.co, studentName:(account.profile||{}).name||"", jobTitle:b.dataset.jt}));
}
function stSaved(el,D){
  el.innerHTML = `<div class="p-head"><div><h2>★ ${L("Saved Jobs","저장한 공고")}</h2><p>${L("Jobs you bookmarked to look at later.","나중에 보려고 저장한 공고예요.")}</p></div></div>
    ${D.savedJobs.length?`<div class="p-card">${D.savedJobs.map(j=>stJobRow(j,matchFor(j)).replace('<div class="st-job-pay">',`<div class="st-job-pay"><button class="icon-btn" data-unsave="${esc(j.id)}" title="Remove">✕</button>`)).join("")}</div>`
      :`<div class="p-card" style="text-align:center;padding:40px"><div style="font-size:44px">★</div><b>${L("No saved jobs","저장한 공고가 없어요")}</b><p style="color:var(--muted);margin-top:6px">${L("Tap the bookmark on any job to save it.","공고의 북마크를 눌러 저장하세요.")}</p></div>`}`;
  el.querySelectorAll("[data-unsave]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); toggleSave(b.dataset.unsave); renderStudentDash(); });
}
function stHours(el){
  if(!el.querySelector("#tracker")){ el.innerHTML=""; renderTracker(); const tr=$("tracker"); if(tr){ el.append(tr); tr.style.paddingTop="0"; } }
  else renderTracker();
}
function stMessages(el){
  const list=(typeof chat!=="undefined"?chat.list:[]);
  el.innerHTML = `<div class="p-head"><div><h2>💬 ${L("Messages","메시지")}</h2><p>${L("Chat with employers about your applications.","지원한 기업과 대화하세요.")}</p></div></div>
    <div class="p-card">${!chatOn()?`<div class="empty" style="padding:24px">${L("Chat works when the site is connected to Firebase.","Firebase 연결 시 사용할 수 있어요.")}</div>`
      : list.length?list.map((c,i)=>`<div class="p-note ${unreadOf(c)?"unread":""}" data-ci="${i}" style="cursor:pointer"><span class="tl-ic">🏢</span><div><b>${esc(c.employerName||"Employer")}</b><small>${esc(c.jobTitle||"")} — ${esc(c.lastText||"")}</small></div><em>${c.updatedAt?relTime(c.updatedAt):""}</em></div>`).join("")
      : `<div class="empty" style="padding:24px">${L("No messages yet. Open a job and tap “Message employer”.","아직 메시지가 없어요.")}</div>`}</div>`;
  el.querySelectorAll("[data-ci]").forEach(r=>r.onclick=()=>{ $("chatPanel").style.display=""; openThread(list[Number(r.dataset.ci)]); });
}
function stProfile(el){
  const pf=account.profile||{}, comp=stCompleteness(), av=Array.isArray(account.availability)?account.availability:[];
  const rows=[["🎓",L("School","학교"),pf.school],["🛂",L("Visa","비자"),pf.visa],["🇰🇷","TOPIK",pf.topik],["📞",L("Phone","전화"),pf.phone],["✉️",L("Email","이메일"),pf.email],
    ["🎂",L("Birth date","생년월일"),pf.birth],["📍",L("City","도시"),[pf.city,pf.address].filter(Boolean).join(", ")],["🏠",L("Home pin","집 위치"),hasHome()?L("Saved ✓ (private)","저장됨 ✓ (비공개)"):""]];
  el.innerHTML = `<div class="p-head"><div><h2>👤 ${L("My Profile","내 프로필")}</h2><p>${L("Employers see your name, visa, Korean level, school and contact when you apply.","지원하면 기업이 이름, 비자, 한국어, 학교, 연락처를 볼 수 있어요.")}</p></div>
      <button class="btn btn-primary" id="sEditPf">✏️ ${L("Edit profile & photo","프로필·사진 수정")}</button></div>
    <div class="p-card co-progress"><div><b>${L("Profile strength","프로필 완성도")}</b><small> · ${comp.missing.length?L("Add: ","추가: ")+comp.missing.join(", "):L("Perfect 🎉","완벽해요 🎉")}</small></div><div class="co-bar"><i class="${comp.pct>=80?"good":comp.pct>=50?"ok":""}" style="width:${comp.pct}%"></i></div><b data-count="${comp.pct}">0</b><b>%</b></div>
    <div class="p-card p-cover"><div class="p-banner st-banner"><span>${esc(pf.school||"")}</span></div>
      <div class="p-cohead">${stAvatar(pf,"p-colo st-colo")}<div><h3>${esc(pf.name||"")}</h3><small>${esc(pf.visa||"")} · ${esc(pf.topik||"")}</small></div></div>
      <div class="p-cogrid">${rows.filter(r=>r[2]).map(([i,k,v])=>`<div><span class="pi">${i}</span><div><small>${k}</small><b>${esc(v)}</b></div></div>`).join("")}</div></div>
    <div class="p-card" style="margin-top:18px"><div class="pc-head"><b>🗓️ ${L("Weekly free time","주간 가능 시간")}</b><button class="btn btn-ghost btn-sm" id="sEditSched3">${L("Edit schedule & home","일정·집 수정")}</button></div>
      <div class="st-days">${DAY_NAMES.map((d,i)=>{ const a=av[i]||{}; return `<div class="${a.on?"on":""}"><b>${dayName(i)}</b><small>${a.on?esc(a.from)+"–"+esc(a.to):L("Busy","불가")}</small></div>`; }).join("")}</div></div>`;
  $("sEditPf").onclick=()=>openAuth("student");
  $("sEditSched3").onclick=openScheduleModal;
}
function stSettings(el){
  const email=(backend.user&&backend.user.email)||(account.profile||{}).email||"";
  el.innerHTML = `<div class="p-head"><div><h2>⚙️ ${L("Settings","설정")}</h2></div></div>
    <div class="p-card p-set"><h3>👤 ${L("Account","계정")}</h3><div class="p-setrow"><span>${L("Login email","로그인 이메일")}</span><b>${esc(email||"—")}</b></div><div class="p-setrow"><span>${L("Member type","회원 유형")}</span><b>${L("Student","학생")}</b></div></div>
    ${securityCardHTML()}${emailNotifCardHTML()}
    <div class="p-card p-set"><h3>🎨 ${L("Appearance","화면")}</h3>
      <div class="p-setrow"><span>${L("Dark mode","다크 모드")}</span><label class="switch"><input type="checkbox" id="sSetDark" ${document.documentElement.dataset.theme==="dark"?"checked":""}><i></i></label></div>
      <div class="p-setrow"><span>${L("Language","언어")}</span><div class="lang"><button data-l="en" class="${lang==="en"?"on":""}">EN</button><button data-l="ko" class="${lang==="ko"?"on":""}">한국어</button></div></div></div>
    <div class="p-card p-set"><h3>📄 ${L("Legal","약관")}</h3><div class="p-setrow"><span><a href="#privacy">Privacy Policy</a> · <a href="#terms">Terms of Use</a></span></div></div>
    <div class="p-card p-set"><h3>📦 ${L("Your data","내 정보")}</h3><div class="p-setrow"><span>${L("Download a copy of everything we store about you (JSON file).","저장된 내 정보 전체를 내려받습니다 (JSON 파일).")}</span><a class="btn btn-ghost btn-sm" href="/api/fb/auth/me/export" download>${L("Download my data","내 정보 다운로드")}</a></div></div>
    <div class="p-card p-set danger"><h3>⚠️ ${L("Danger zone","위험 구역")}</h3><div class="p-setrow"><span>${L("Delete your account, profile, schedule and work hours.","계정, 프로필, 일정, 근무 기록을 삭제합니다.")}</span><button class="btn btn-danger btn-sm" id="sSetDel">${L("Delete account","계정 삭제")}</button></div></div>`;
  $("sSetDark").onchange=()=>{ $("themeBtn").click(); renderStudentDash(); };
  el.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{ document.querySelector(`.lang button[data-lang="${b.dataset.l}"]`).click(); renderStudentDash(); });
  el.querySelectorAll('a[href="#privacy"],a[href="#terms"]').forEach(a=>a.addEventListener("click",()=>closeStudentDash()));
  $("sSetDel").onclick=openDeleteAccount;
  bindSecurityCard(el); bindEmailNotifCard(el);
}

/* ---- hooks ---- */
const _renderAuthSD = renderAuth;
renderAuth = function(){
  _renderAuthSD();
  watchMyApps();
  const menu=$("userMenu");
  if(menu && isStudent() && !$("menuStDash")){
    menu.insertAdjacentHTML("afterbegin", `<button id="menuStDash">📊 ${L("My dashboard","내 대시보드")}</button>`);
    $("menuStDash").onclick=()=>{ menu.classList.remove("open"); openStudentDash("home"); };
    const mt=$("menuTracker"); if(mt) mt.onclick=()=>{ menu.classList.remove("open"); openStudentDash("hours"); };
  }
  if(document.body.classList.contains("sdash")){ if(isStudent()) renderStudentDash(); else closeStudentDash(); }
};
const _renderAllSD = renderAll;
renderAll = function(){ _renderAllSD(); if(document.body.classList.contains("sdash")) renderStudentDash(); };
const _showViewSD = showView;
showView = function(v){ if(document.body.classList.contains("sdash")) closeStudentDash(); _showViewSD(v); };

/* ==========================================================================
   P8: NOTIFICATIONS FROM THE SERVER — same list and read state on every device,
   new ones arrive live (socket), optional emails (Settings → Email notifications)
   ========================================================================== */
const nApi = () => window.wahNotifications;
const N_ICON = {application:"👥", status:"📨", message:"💬", job:"✅", system:"ℹ️"};
// server notification → the item shape the lists already use
function srvItem(n){
  const lk=n.link||{}, type=lk.kind==="chat"?"chat":lk.kind==="job"?"job":"app";
  const ref = type==="app" ? (isStudent() ? (lk.jobId||"") : (lk.id||"")) : (lk.id||"");
  return {srv:true, id:n.id, read:!!n.read, t:new Date(n.createdAt).getTime()||0, type, ref, jobId:lk.jobId||"", key:"srv:"+n.id,
          icon:N_ICON[n.type]||"🔔", title:n.title, text:(n.body||"")+(n.count>1?` · ${L(`${n.count} messages`,`메시지 ${n.count}개`)}`:"")};
}
function refreshNotifUI(){
  if(portalBuilt && document.body.classList.contains("dash")) renderPortal();
  if(document.body.classList.contains("sdash")) renderStudentDash();
}
async function loadNotifs(){
  const uid = backend.mode==="firebase" && nApi() ? backend.uid : null;
  if(!uid){ Object.assign(NS,{items:[],unread:0,more:false,uid:null,settings:null}); return; }
  try{
    const d=await nApi().list(null, 50);
    if(backend.uid!==uid) return;                     // logged out / switched account meanwhile
    if(NS.uid!==uid) NS.settings=null;                // other account → its own email settings
    Object.assign(NS,{items:d.items, unread:d.unreadCount, more:!!d.more, uid});
  }catch(e){ console.warn("notifications", e); }
  refreshNotifUI();
}
async function loadMoreNotifs(){
  const last=NS.items[NS.items.length-1]; if(!last) return;
  try{
    const d=await nApi().list(last.createdAt, 50), have=new Set(NS.items.map(n=>n.id));
    NS.items.push(...d.items.filter(n=>!have.has(n.id))); NS.more=!!d.more; refreshNotifUI();
  }catch(e){ toast(L("Couldn't load more notifications.","알림을 더 불러오지 못했어요.")); }
}
function readNotif(id){
  const n=NS.items.find(x=>x.id===id);
  if(n && !n.read){ n.read=true; NS.unread=Math.max(0,NS.unread-1); refreshNotifUI(); }
  if(nApi()) nApi().markRead([id]).then(d=>{ NS.unread=d.unreadCount; refreshNotifUI(); }).catch(e=>console.warn("mark read",e));
}
async function markAllNotifsRead(){
  NS.items.forEach(n=>n.read=true); NS.unread=0; refreshNotifUI();
  try{ await nApi().markRead("all"); }catch(e){ toast(L("Couldn't mark them as read — try again.","읽음 처리하지 못했어요.")); loadNotifs(); }
}
// live: a new (or grouped, updated) notification / some were read on another device / reconnected
let notifWired=false;
function initNotifs(){
  if(notifWired || !nApi()) return; notifWired=true;
  nApi().onNew(n=>{
    if(!backend.uid) return;
    const i=NS.items.findIndex(x=>x.id===n.id), wasUnread=i>-1 && !NS.items[i].read;
    if(i>-1) NS.items.splice(i,1);
    NS.items.unshift(n);
    if(!n.read && !wasUnread) NS.unread++;
    const watching = n.link && n.link.kind==="chat" && chat.open && chat.open.id===n.link.chatId;
    if(!watching) toast("🔔 "+n.title);
    refreshNotifUI();
  });
  nApi().onRead(d=>{
    NS.items.forEach(n=>{ if(d.all || (d.ids&&d.ids.includes(n.id)) || (d.chatId && n.link && n.link.chatId===d.chatId)) n.read=true; });
    NS.unread=d.unreadCount; refreshNotifUI();
  });
  nApi().onSync(()=>{ if(backend.uid) loadNotifs(); });
}

/* ---- open what a notification points to: {kind:"application"|"chat"|"job", id, jobId} ---- */
async function waitFor(fn, ms=6000){
  const t0=Date.now();
  for(;;){ let v; try{ v=fn(); }catch{ v=null; } if(v || Date.now()-t0>ms) return v; await new Promise(r=>setTimeout(r,200)); }
}
async function openNotifLink(lk){
  if(!lk || !lk.kind || !lk.id) return;
  const id=String(lk.id);
  if(isStudent()){
    if(lk.kind==="job"){ const j=await waitFor(()=>JOBS.find(x=>x.id===id)); return j ? openJob(j.id) : gone(); }
    if(lk.kind==="chat"){ const c=await waitFor(()=>chat.list.find(x=>x.id===id)); return c ? openChatById(id) : gone(); }
    openStudentDash("apps");                          // application → My Applications, highlighted
    const jobId = lk.jobId || await waitFor(()=>{ const a=myApps.find(x=>String(x.id)===id); return a && String(a.jobId); });
    const card = jobId && await waitFor(()=>document.querySelector(`#sp_apps .st-app[data-jid="${CSS.escape(String(jobId))}"]`));
    return card ? flashEl(card) : gone();
  }
  if(account && account.role==="employer"){
    if(!document.body.classList.contains("dash")) showView("dashboard");
    if(lk.kind==="application"){ await waitFor(()=>applications.find(a=>String(a.id)===id)); return openPortalNotif("app", id, lk.jobId||""); }
    if(lk.kind==="job"){ await waitFor(()=>myPosting()); return openPortalNotif("job", id); }
    if(lk.kind==="chat"){ await waitFor(()=>chat.list.find(x=>x.id===id)); return openPortalNotif("chat", id); }
  }
}

/* ---- ?open=application:<id> | chat:<id> | job:<id>  (the button in notification emails) ---- */
let pendingOpen = (()=>{
  const m=/^(application|chat|job):([A-Za-z0-9_\-]{1,128})$/.exec(new URLSearchParams(location.search).get("open")||"");
  return m ? {kind:m[1], id:m[2]} : null;
})();
function cleanOpenParam(){
  const p=new URLSearchParams(location.search); if(!p.has("open")) return;
  p.delete("open"); const q=p.toString();
  history.replaceState(null,"",location.pathname+(q?"?"+q:"")+location.hash);
}
if(!pendingOpen) cleanOpenParam();                    // a broken ?open=… is just removed
// runs after every login / logout (see onAuthStateChanged)
function afterAuthP8(){
  initNotifs(); loadNotifs();
  if(!pendingOpen) return;
  if(!backend.uid){ toast(L("Please log in to see this.","로그인 후 볼 수 있어요.")); openAuth("login"); return; }
  if(!account || account.pending) return;             // still finishing sign-up
  const p=pendingOpen; pendingOpen=null;
  setTimeout(()=>{ openNotifLink(p); cleanOpenParam(); }, 0);
}

/* ---- student dashboard: 🔔 Notifications page ---- */
function stNotifications(el){
  const items=NS.items.map(srvItem);
  el.innerHTML = `<div class="p-head"><div><h2>🔔 ${L("Notifications","알림")}</h2><p>${L("Application updates and new messages — the same on all your devices.","지원 상태와 새 메시지 소식이에요. 모든 기기에서 똑같이 보여요.")}</p></div>
      <button class="btn btn-ghost" id="sMarkRead" ${NS.unread?"":"disabled"}>${L("Mark all as read","모두 읽음")}</button></div>
    <div class="p-card">${items.length?items.map(n=>`<div class="p-note p-click ${n.read?"":"unread"}" ${notifAttrs(n)}><span class="tl-ic">${n.icon}</span><div><b>${esc(n.title)}</b><small>${esc(n.text)}</small></div><em>${relTime(n.t)}</em></div>`).join("")
      :`<div class="empty" style="padding:30px">${L("No notifications yet. You'll see application updates and messages here.","아직 알림이 없어요. 지원 상태와 메시지가 여기 표시돼요.")}</div>`}</div>
    ${NS.more?`<div style="text-align:center;margin-top:12px"><button class="btn btn-ghost btn-sm" id="sNotifMore">${L("Load older","이전 알림 더 보기")}</button></div>`:""}`;
  $("sMarkRead").onclick=markAllNotifsRead;
  if($("sNotifMore")) $("sNotifMore").onclick=loadMoreNotifs;
}

/* ---- Settings (both portals): email notification switches ---- */
function emailNotifCardHTML(){
  const rows = isStudent()
    ? [["status",L("My application status changes","지원 상태가 바뀔 때")],["message",L("New messages (if still unread after 10 minutes)","새 메시지 (10분 동안 안 읽으면)")]]
    : [["application",L("New applications","새 지원서")],["message",L("New messages (if still unread after 10 minutes)","새 메시지 (10분 동안 안 읽으면)")]];
  return `<div class="p-card p-set" data-nset><h3>📧 ${L("Email notifications","이메일 알림")}</h3>
    ${rows.map(([k,l])=>`<div class="p-setrow"><span>${l}</span><label class="switch"><input type="checkbox" data-nk="${k}" ${NS.settings?(NS.settings[k]!==false?"checked":""):"disabled"}><i></i></label></div>`).join("")}
    <p class="fine" data-nmsg style="margin:6px 0 0;color:var(--muted)">${L("You always see notifications here on the site. Emails go to your confirmed email address.","사이트 알림은 항상 보여요. 이메일은 인증된 주소로 보내요.")}</p></div>`;
}
async function bindEmailNotifCard(el){
  const card=el.querySelector("[data-nset]"); if(!card) return;
  const boxes=[...card.querySelectorAll("[data-nk]")];
  if(!nApi()){ boxes.forEach(b=>b.disabled=true); return; }
  if(!NS.settings){
    try{ NS.settings=await nApi().settings(); }
    catch{ card.querySelector("[data-nmsg]").textContent=L("Couldn't load your email settings.","이메일 설정을 불러오지 못했어요."); return; }
    boxes.forEach(b=>{ b.checked=NS.settings[b.dataset.nk]!==false; b.disabled=false; });
  }
  boxes.forEach(b=>b.onchange=async()=>{
    b.disabled=true;
    try{ NS.settings=await nApi().saveSettings({[b.dataset.nk]:b.checked}); toast(L("Email settings saved","이메일 설정이 저장됐어요")); }
    catch(e){ b.checked=!b.checked; toast(e.fromServer?e.message:L("Couldn't save — try again.","저장하지 못했어요.")); }
    finally{ b.disabled=false; }
  });
}
const _saveAccountSD = saveAccount;
saveAccount = async function(){ const r=await _saveAccountSD(); if(document.body.classList.contains("sdash")) setTimeout(renderStudentDash,0); return r; };
const _closeModalSD = closeModal;
closeModal = function(){ _closeModalSD(); if(document.body.classList.contains("sdash")) renderStudentDash(); };
window.addEventListener("hashchange", ()=>{ if(location.hash==="#me") openStudentDash(); else if(document.body.classList.contains("sdash") && location.hash!=="#me") closeStudentDash(); });
// open the dashboard right after a student logs in from "#me"
setTimeout(()=>{ if(location.hash==="#me"){ const t=setInterval(()=>{ if(backend.mode!=="loading"){ clearInterval(t); if(isStudent()) openStudentDash(); } },200); } },0);

/* ===== FEATURES 5B: simpler user menu (everything else is inside the dashboard) ===== */
const _renderAuthMenu = renderAuth;
renderAuth = function(){
  _renderAuthMenu();
  const menu = $("userMenu");
  if(!menu || !account || !account.loggedIn) return;
  const hide = isStudent()
    ? ['[data-act="saved"]','[data-act="editst"]','#menuDelete']
    : ['[data-act="editco"]'];
  hide.forEach(s => { const b = menu.querySelector(s); if(b) b.remove(); });
  const mt = $("menuTracker");
  if(mt && isStudent()) mt.onclick = () => { menu.classList.remove("open"); openStudentDash("hours"); };
};

/* ===== FEATURES 6: home address <-> map pin (auto address) ===== */
// Free address lookup from OpenStreetMap (Nominatim). Max ~1 request per second, so we wait a bit.
const GEO_URL = "https://nominatim.openstreetmap.org";
function addrFromOSM(a){
  if(!a) return "";
  const parts = [a.province||a.state||"", a.city||a.town||"", a.borough||a.city_district||a.county||"",
                 a.suburb||a.quarter||a.neighbourhood||a.village||"", a.road||""];
  return [...new Set(parts.map(s=>String(s).trim()).filter(Boolean))].join(" ");
}
async function reverseGeocode(lat, lng){
  const r = await fetch(`${GEO_URL}/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=ko,en&lat=${lat}&lon=${lng}`);
  if(!r.ok) throw new Error("geo "+r.status);
  const d = await r.json();
  return addrFromOSM(d.address) || String(d.display_name||"").split(",").slice(0,4).reverse().join(" ").trim();
}
async function forwardGeocode(q){
  const r = await fetch(`${GEO_URL}/search?format=jsonv2&limit=1&countrycodes=kr&accept-language=ko,en&q=${encodeURIComponent(q)}`);
  if(!r.ok) throw new Error("geo "+r.status);
  const d = await r.json();
  return d && d[0] ? {lat:+d[0].lat, lng:+d[0].lon} : null;
}

const _openScheduleModalG = openScheduleModal;
openScheduleModal = function(){
  _openScheduleModalG();
  const input = $("homeLabel"), status = $("homeCoords"); if(!input) return;
  input.insertAdjacentHTML("afterend", `<div class="geo-row"><button type="button" class="btn btn-ghost btn-sm" id="homeFind">🔍 ${L("Find on map","지도에서 찾기")}</button><small class="fine" id="geoMsg"></small></div>`);
  const msg = $("geoMsg");
  let last = homePos ? homePos.lat+","+homePos.lng : "", timer = null, busy = false;
  // 1) pin moved (map click, drag, or "Use my current location") -> fill in the address
  const watch = setInterval(async ()=>{
    if(!document.body.contains(input)){ clearInterval(watch); return; }
    if(!homePos || busy) return;
    const key = homePos.lat+","+homePos.lng;
    if(key===last) return;
    last = key; clearTimeout(timer);
    timer = setTimeout(async ()=>{
      busy = true; msg.textContent = "📍 "+L("Finding the address…","주소 찾는 중…");
      input.classList.add("geo-loading");
      try{
        const addr = await reverseGeocode(homePos.lat, homePos.lng);
        if(addr){ input.value = addr; msg.textContent = "✓ "+L("Address filled in from the pin","핀 위치로 주소를 채웠어요"); input.classList.add("geo-flash"); setTimeout(()=>input.classList.remove("geo-flash"),900); }
        else msg.textContent = L("No address found here — type it yourself.","주소를 찾지 못했어요. 직접 입력해 주세요.");
      }catch(e){ msg.textContent = L("Couldn't look up the address — type it yourself.","주소를 불러오지 못했어요. 직접 입력해 주세요."); }
      input.classList.remove("geo-loading"); busy = false;
    }, 700);
  }, 400);
  // 2) typed an address -> move the pin there
  const find = async ()=>{
    const q = input.value.trim(); if(q.length<2){ msg.textContent=L("Type an area first, e.g. 부산 남구 대연동","먼저 주소를 입력하세요"); return; }
    msg.textContent = "🔍 "+L("Searching…","검색 중…");
    try{
      const p = await forwardGeocode(q);
      if(!p){ msg.textContent = L("Not found — try a shorter address (city + district + dong).","찾지 못했어요. 시·구·동으로 입력해 보세요."); return; }
      last = (+p.lat.toFixed(5))+","+(+p.lng.toFixed(5));   // don't overwrite what they typed
      if(homeMap){ homeMap.fire("click",{latlng:LF.latLng(p.lat,p.lng)}); homeMap.setView([p.lat,p.lng],16); }
      else { homePos = {lat:+p.lat.toFixed(5), lng:+p.lng.toFixed(5)}; status.textContent = L("✓ Home pinned","✓ 집 위치 저장됨"); }
      msg.textContent = "✓ "+L("Pinned on the map — drag the pin to adjust.","지도에 표시했어요. 핀을 끌어 조정하세요.");
    }catch(e){ msg.textContent = L("Search failed — click the map instead.","검색 실패 — 지도를 눌러 주세요."); }
  };
  $("homeFind").onclick = find;
  input.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); find(); } });
};

/* ===== FEATURES 6B: job form — pin the workplace -> City + District/area fill in automatically ===== */
let jfLast = null, jfArmed = 0;
document.addEventListener("pointerdown", e=>{ if(e.target.closest("#jfMap, #jfLocate")) jfArmed = Date.now(); }, true);
setInterval(async ()=>{
  const key = formPos ? formPos.lat+","+formPos.lng : null;
  if(key===jfLast) return;
  jfLast = key;
  if(!formPos || Date.now()-jfArmed > 15000) return;   // only after the employer clicks the map / "Use my location"
  jfArmed = 0;
  const f = $("jobForm"), area = f && f.elements.area; if(!area) return;
  const note = $("jfCoords"), old = note ? note.textContent : "";
  if(note) note.textContent = "📍 "+L("Finding the address…","주소 찾는 중…");
  area.classList.add("geo-loading");
  try{
    const r = await fetch(`${GEO_URL}/reverse?format=jsonv2&zoom=16&addressdetails=1&accept-language=en&lat=${formPos.lat}&lon=${formPos.lng}`);
    const a = (await r.json()).address || {};
    const gu = a.borough || a.city_district || a.county || "", dong = a.suburb || a.quarter || a.neighbourhood || a.village || "";
    const txt = [gu, dong].map(x=>x.replace(/\s*\([^)]*\)/g,"")).filter(Boolean).join(", ").slice(0,40);
    if(txt){ area.value = txt; area.classList.add("geo-flash"); setTimeout(()=>area.classList.remove("geo-flash"),900); }
    const cityName = String(a.city || a.province || a.state || "").toLowerCase();
    const sel = $("jfCity");
    if(sel && cityName){
      const opt = [...sel.options].find(o=>o.value && cityName.startsWith(o.value.toLowerCase()));
      if(opt && sel.value!==opt.value){ sel.value = opt.value; sel.dispatchEvent(new Event("change",{bubbles:true})); }
    }
    if(note) note.textContent = old + (txt ? "  ·  ✓ "+L("Area filled in","지역 자동 입력") : "");
  }catch(e){ if(note) note.textContent = old; }
  area.classList.remove("geo-loading");
}, 500);

/* ===== FEATURES 7: delete a chat (just for me) =====
   The other person keeps their copy. If they send a new message, the chat comes back
   with only the new messages — like KakaoTalk / WhatsApp. */
const clearedAt = c => (c && c.cleared && c.cleared[backend.uid]) || 0;
const chatHidden = c => clearedAt(c) && (c.updatedAt||0) <= clearedAt(c);
// every place that reads chat.list (badge, panel, dashboards) now skips deleted chats
(function(){
  let raw = chat.list;
  Object.defineProperty(chat, "list", { get(){ return raw.filter(c=>!chatHidden(c)); }, set(v){ raw = v; }, configurable:true });
})();

async function deleteChat(c){
  if(!c || !chatOn()) return;
  const now = Date.now();
  try{
    await backend.fb.setDoc(backend.fb.doc(backend.db,"chats",c.id), {cleared:{[backend.uid]:now}, readBy:{[backend.uid]:now}}, {merge:true});
    c.cleared = {...(c.cleared||{}), [backend.uid]:now};
    if(chat.open && chat.open.id===c.id) showChatList(); else if(chat.view==="list" && $("chatPanel").style.display!=="none") showChatList();
    updateChatBadge();
    if(typeof renderStudentDash==="function") renderStudentDash();
    toast(L("Chat deleted","대화를 삭제했어요"));
  }catch(e){ console.error("delete chat", e); toast(L("Couldn't delete the chat.","대화를 삭제하지 못했어요.")); }
}
// small "are you sure?" box shown inside the chat row
function askDeleteChat(row, c){
  if(row.querySelector(".ci-confirm")) return;
  row.insertAdjacentHTML("beforeend", `<div class="ci-confirm" role="dialog">
    <span>${L("Delete this chat? It's removed only for you.","이 대화를 삭제할까요? 나에게서만 삭제돼요.")}</span>
    <span class="ci-btns"><span role="button" tabindex="0" class="ci-no">${L("Cancel","취소")}</span><span role="button" tabindex="0" class="ci-yes">🗑 ${L("Delete","삭제")}</span></span></div>`);
  const box = row.querySelector(".ci-confirm");
  box.addEventListener("click", e=>e.stopPropagation());
  box.querySelector(".ci-no").onclick = ()=>box.remove();
  box.querySelector(".ci-yes").onclick = ()=>{ row.classList.add("ci-leaving"); setTimeout(()=>deleteChat(c), 250); };
}

// 1) trash button on every row of the chat list
const _showChatListD = showChatList;
showChatList = function(){
  _showChatListD();
  const del = $("chatDel"); if(del) del.style.display = "none";
  $("chatBody").querySelectorAll(".chat-item[data-chat]").forEach(row=>{
    const c = chat.list.find(x=>x.id===row.dataset.chat); if(!c) return;
    row.insertAdjacentHTML("beforeend", `<span class="ci-del" role="button" tabindex="0" title="${L("Delete chat","대화 삭제")}" aria-label="Delete chat">🗑</span>`);
    const t = row.querySelector(".ci-del");
    t.onclick = e=>{ e.stopPropagation(); askDeleteChat(row, c); };
    t.onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); e.stopPropagation(); askDeleteChat(row, c); } };
  });
};
// 2) trash button in the open conversation header
const _openThreadD = openThread;
openThread = function(c){
  _openThreadD(c);
  let del = $("chatDel");
  if(!del){
    $("chatClose").insertAdjacentHTML("beforebegin", `<button class="icon-btn" id="chatDel" title="${L("Delete chat","대화 삭제")}">🗑</button>`);
    del = $("chatDel");
    del.onclick = ()=>{ const cur = chat.open; if(!cur) return;
      const body = $("chatBody"); if(body.querySelector(".ci-confirm")) return;
      body.insertAdjacentHTML("afterbegin", `<div class="ci-confirm top"><span>${L("Delete this chat? It's removed only for you.","이 대화를 삭제할까요? 나에게서만 삭제돼요.")}</span>
        <span class="ci-btns"><span role="button" tabindex="0" class="ci-no">${L("Cancel","취소")}</span><span role="button" tabindex="0" class="ci-yes">🗑 ${L("Delete","삭제")}</span></span></div>`);
      const box = body.querySelector(".ci-confirm"); body.scrollTop = 0;
      box.querySelector(".ci-no").onclick = ()=>box.remove();
      box.querySelector(".ci-yes").onclick = ()=>deleteChat(cur);
    };
  }
  del.style.display = "";
};
// 3) after deleting, old messages stay hidden for me (new ones still show)
const _renderThreadD = renderThread;
renderThread = function(){
  const all = chat.msgs, since = clearedAt(chat.open);
  if(since) chat.msgs = all.filter(m=>(m.at||0) > since);
  _renderThreadD();
  chat.msgs = all;
};
// 4) student dashboard → Messages page gets the same trash button
if(typeof stMessages==="function"){
  const _stMessagesD = stMessages;
  stMessages = function(el, D){
    _stMessagesD(el, D);
    const list = chat.list;
    el.querySelectorAll("[data-ci]").forEach(row=>{
      const c = list[Number(row.dataset.ci)]; if(!c) return;
      row.insertAdjacentHTML("beforeend", `<span class="ci-del" role="button" tabindex="0" title="${L("Delete chat","대화 삭제")}">🗑</span>`);
      row.querySelector(".ci-del").onclick = e=>{ e.stopPropagation(); askDeleteChat(row, c); };
    });
  };
}

/* ===== FEATURES 8: remove messages + "Seen" =====
   • Your own message: "Unsend" (removed for both) or "Delete for me"
   • Their message: "Delete for me"
   • Under your last message: "Sent ✓" → "Seen ✓✓ 11:20" once they open the chat */
let msgMenuOpen = null, unsubChatDoc = null;
const otherUidOf = c => c ? (c.studentUid===backend.uid ? c.employerUid : c.studentUid) : null;
const hiddenForMe = c => (c && c.hidden && c.hidden[backend.uid]) || {};
const timeShort = t => new Date(t).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

// listen to messages WITH their ids, and to the chat itself (for "Seen")
const _openThreadS = openThread;
openThread = function(c){
  _openThreadS(c);
  if(unsubChatDoc){ unsubChatDoc(); unsubChatDoc=null; }
  if(!chat.open || !chatOn()) return;
  const F = backend.fb, id = c.id;
  if(chat.unsubMsgs) chat.unsubMsgs();
  chat.unsubMsgs = F.onSnapshot(F.query(F.collection(backend.db,"chats",id,"messages"), F.orderBy("at"), F.limit(300)), snap=>{
    if(!chat.open || chat.open.id!==id) return;
    chat.msgs = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderThread(); markSeen();
  }, err=>console.error("messages", err));
  unsubChatDoc = F.onSnapshot(F.doc(backend.db,"chats",id), snap=>{
    if(!chat.open || chat.open.id!==id || !snap.exists()) return;
    chat.open = {id, ...snap.data()};
    renderThread();
  }, err=>console.error("chat doc", err));
};
const _closeThreadS = closeThread;
closeThread = function(){ if(unsubChatDoc){ unsubChatDoc(); unsubChatDoc=null; } msgMenuOpen=null; _closeThreadS(); };

// I opened the chat and their newest message is newer than my last "read" → mark it read
async function markSeen(){
  const c = chat.open; if(!c || document.hidden) return;
  const theirs = chat.msgs.filter(m=>m.from!==backend.uid);
  const lastTheirs = theirs.length ? theirs[theirs.length-1].at||0 : 0;
  const mine = (c.readBy && c.readBy[backend.uid]) || 0;
  if(!lastTheirs || lastTheirs <= mine) return;
  try{ await backend.fb.setDoc(backend.fb.doc(backend.db,"chats",c.id), {readBy:{[backend.uid]:Date.now()}}, {merge:true}); }catch(e){ console.error(e); }
}
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden && chat.open) markSeen(); });

// draw the conversation
renderThread = function(){
  const body = $("chatBody"), c = chat.open; if(!c) return;
  const since = (c.cleared && c.cleared[backend.uid]) || 0, hid = hiddenForMe(c);
  const list = chat.msgs.filter(m => (m.at||0) > since && !(m.id && hid[m.id]));
  const theyRead = (c.readBy && c.readBy[otherUidOf(c)]) || 0;
  let lastMine = -1; list.forEach((m,i)=>{ if(m.from===backend.uid && !m.deleted) lastMine = i; });
  const keepScroll = body.scrollHeight - body.scrollTop - body.clientHeight > 80;
  const oldTop = body.scrollTop;
  body.innerHTML = `<div class="chat-ctx">${esc(c.jobTitle||"")}</div>` + (list.length ? list.map((m,i)=>{
    const me = m.from===backend.uid;
    const status = i===lastMine ? (theyRead >= (m.at||0)
      ? `<div class="msg-seen seen">✓✓ ${L("Seen","읽음")} · ${timeShort(theyRead)}</div>`
      : `<div class="msg-seen">✓ ${L("Sent","전송됨")}</div>`) : "";
    return `<div class="msg ${me?"me":""} ${m.deleted?"deleted":""}" data-mid="${esc(m.id||"")}">
      <span>${m.deleted ? "🚫 "+(me?L("You unsent a message","메시지를 취소했어요"):L("This message was removed","삭제된 메시지예요")) : esc(m.text)}</span>
      <small>${new Date(m.at).toLocaleString([], {month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</small>
      ${m.id && !m.deleted ? `<button type="button" class="msg-more" aria-label="Message options">⋯</button>` : ""}
      ${msgMenuOpen===m.id ? `<div class="msg-menu">${me?`<button type="button" data-unsend="${esc(m.id)}">↩️ ${L("Unsend for everyone","모두에게서 삭제")}</button>`:""}<button type="button" data-hideme="${esc(m.id)}">🗑 ${L("Delete for me","나에게서 삭제")}</button></div>` : ""}
    </div>${status}`;
  }).join("") : `<div class="empty" style="padding:20px">${L("Say hello 👋","인사를 건네보세요 👋")}</div>`);
  body.scrollTop = (keepScroll || msgMenuOpen) ? oldTop : body.scrollHeight;
  body.querySelectorAll(".msg-more").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const id=b.closest(".msg").dataset.mid; msgMenuOpen = msgMenuOpen===id ? null : id; renderThread(); });
  body.querySelectorAll("[data-unsend]").forEach(b=>b.onclick=()=>unsendMsg(b.dataset.unsend));
  body.querySelectorAll("[data-hideme]").forEach(b=>b.onclick=()=>hideMsgForMe(b.dataset.hideme));
};
document.addEventListener("click", e=>{ if(msgMenuOpen && !e.target.closest(".msg-menu,.msg-more")){ msgMenuOpen=null; if(chat.open) renderThread(); } });

async function unsendMsg(id){
  const c = chat.open, m = chat.msgs.find(x=>x.id===id); if(!c || !m || m.from!==backend.uid) return;
  msgMenuOpen = null; const F = backend.fb;
  try{
    await F.setDoc(F.doc(backend.db,"chats",c.id,"messages",id), {from:m.from, at:m.at, text:"", deleted:true});
    const last = chat.msgs[chat.msgs.length-1];
    if(last && last.id===id) await F.setDoc(F.doc(backend.db,"chats",c.id), {lastText: "🚫 "+L("Message removed","삭제된 메시지")}, {merge:true});
    toast(L("Message unsent","메시지를 취소했어요"));
  }catch(e){ console.error("unsend", e); toast(L("Couldn't unsend — update your Firestore rules (see instructions).","취소하지 못했어요 — Firestore 규칙을 업데이트하세요.")); renderThread(); }
}
async function hideMsgForMe(id){
  const c = chat.open; if(!c) return;
  msgMenuOpen = null;
  c.hidden = {...(c.hidden||{}), [backend.uid]: {...hiddenForMe(c), [id]:true}}; renderThread();
  try{ await backend.fb.setDoc(backend.fb.doc(backend.db,"chats",c.id), {hidden:{[backend.uid]:{[id]:true}}}, {merge:true}); }
  catch(e){ console.error("hide msg", e); toast(L("Couldn't delete the message.","메시지를 삭제하지 못했어요.")); }
}

/* ==========================================================================
   FEATURES 9: Log-in page + phone-friendly header
   • "Log in" opens a full page (#login) instead of a pop-up
   • After logging out you land on the log-in page
   • On phones: Log in + Sign up always visible; language, dark mode and
     Saved move into the ☰ menu
   ========================================================================== */
let loginReturn = "#top";
const LOGIN_ART = `<div class="lp-float f1"><span class="lp-ring">92%</span><div><b>Café barista · Mapo</b><small>Sat–Sun · ₩12,000/hr</small></div></div>
  <div class="lp-float f2">✓✓ <b>Seen</b> · “See you Saturday!”</div>
  <div class="lp-float f3">🛂 <b>14 h</b> <small>left this week</small></div>`;

function buildLoginPage(){
  if($("loginPage")) return;
  document.body.insertAdjacentHTML("beforeend", `<section id="loginPage" aria-label="Log in">
    <div class="lp">
      <div class="lp-art">
        <a href="#top" class="logo lp-logo" id="lpHome"><div class="logo-mark">W</div>Work Abroad <span>Hub</span></a>
        <div class="lp-copy"><h2 id="lpHead"></h2><p id="lpSub"></p></div>
        <div class="lp-cards">${LOGIN_ART}</div>
        <div class="lp-blob b1"></div><div class="lp-blob b2"></div>
      </div>
      <div class="lp-side">
        <div class="lp-top"><button class="link-btn" id="lpBrowse"></button>
          <div class="lp-tools"><div class="lang lp-lang"><button data-l="en">EN</button><button data-l="ko">한국어</button></div><button class="theme-btn" id="lpTheme"></button></div></div>
        <form class="lp-form" id="lpForm" novalidate></form>
      </div>
    </div></section>`);
  $("lpHome").onclick = e=>{ e.preventDefault(); hideLoginPage("#top"); };
  $("lpBrowse").onclick = ()=>hideLoginPage("#top");
  $("lpTheme").onclick = ()=>{ $("themeBtn").click(); renderLoginPage(); };
  document.querySelectorAll(".lp-lang [data-l]").forEach(b=>b.onclick=()=>{ document.querySelector(`.nav-right .lang button[data-lang="${b.dataset.l}"]`).click(); renderLoginPage(); });
}
function renderLoginPage(){
  if(!$("loginPage")) return;
  const fb = backend.mode==="firebase";
  $("lpHead").textContent = L("Welcome back 👋","다시 오신 걸 환영해요 👋");
  $("lpSub").textContent = L("Visa-friendly part-time jobs, matched to your schedule.","비자에 맞는 알바, 내 일정에 맞춰 추천해요.");
  $("lpBrowse").textContent = "← "+L("Browse jobs","일자리 둘러보기");
  $("lpTheme").textContent = document.documentElement.dataset.theme==="dark" ? "☀️" : "🌙";
  document.querySelectorAll(".lp-lang [data-l]").forEach(b=>b.classList.toggle("on", b.dataset.l===lang));
  const f = $("lpForm");
  f.innerHTML = `<h1>${L("Log in","로그인")}</h1><p class="lp-lead">${L("Good to see you again. Log in to apply, chat and track your hours.","다시 만나서 반가워요. 로그인하고 지원·채팅·근무 시간을 관리하세요.")}</p>
    ${fb ? `
    <label class="lp-field"><span>${L("Email","이메일")}</span><div class="lp-input"><i>✉️</i><input name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required></div></label>
    <label class="lp-field"><span>${L("Password","비밀번호")}</span><div class="lp-input"><i>🔒</i><input name="password" type="password" autocomplete="current-password" placeholder="••••••••" required><button type="button" class="lp-eye" id="lpEye" aria-label="Show password">👁️</button></div></label>
    <div class="lp-row"><span></span><button type="button" class="link-btn" id="lpForgot">${L("Forgot password?","비밀번호를 잊으셨나요?")}</button></div>
    <div class="lp-err" id="lpErr" role="alert"></div>
    <button class="btn btn-primary lp-submit" type="submit" id="lpSubmit">${L("Log in","로그인")}</button>
    <div class="or"><span>${L("or","또는")}</span></div>
    <button type="button" class="btn btn-ghost lp-google" id="lpGoogle">${GOOGLE_SVG} ${L("Continue with Google","Google로 계속하기")}</button>`
    : `<div class="lp-err show" style="color:var(--ink-2)">${L("Preview mode — no Firebase connected. Your account lives in this browser only.","미리보기 모드 — 계정이 이 브라우저에만 저장돼요.")}</div>
       <button class="btn btn-primary lp-submit" type="submit" id="lpSubmit">${account && account.role ? L("Continue as ","계속하기: ")+esc(displayName()) : L("Create an account","계정 만들기")}</button>`}
    <p class="lp-signup">${L("New here?","처음이신가요?")} <button type="button" class="link-btn" id="lpSignup">${L("Create an account","회원가입")}</button></p>
    <p class="lp-safe">🔒 ${L("Secured by Firebase Authentication","Firebase 인증으로 보호돼요")}</p>`;
  $("lpSignup").onclick = ()=>openAuth("choose");
  if(!fb){
    f.onsubmit = e=>{ e.preventDefault();
      if(account && account.role){ account.loggedIn=true; saveAccount(); renderAll(); toast(L("Welcome back, ","환영해요, ")+displayName()); }
      else openAuth("choose"); };
    return;
  }
  const F = backend.fb, err = $("lpErr");
  const showErr = (t, ok)=>{ err.textContent=t; err.classList.toggle("ok", !!ok); err.classList.add("show"); if(!ok){ f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); } };
  $("lpEye").onclick = ()=>{ const p=f.elements.password; p.type = p.type==="password" ? "text" : "password"; $("lpEye").textContent = p.type==="password" ? "👁️" : "🙈"; };
  $("lpForgot").onclick = async ()=>{
    const email=f.elements.email.value.trim();
    if(!EMAIL_RE.test(email)){ showErr(L("Type your email above first, then tap “Forgot password?”.","위에 이메일을 먼저 입력해 주세요.")); f.elements.email.focus(); return; }
    try{ await F.sendPasswordResetEmail(backend.auth,email); showErr(L("If this email has an account, we sent a reset link. It works for 30 minutes — check your inbox (and spam).","이 이메일로 가입된 계정이 있으면 재설정 링크를 보냈어요. 30분 동안 유효해요. 받은편지함(스팸함)을 확인해 주세요."), true); }
    catch(e){ showErr(authErr(e)); }
  };
  $("lpGoogle").onclick = async ()=>{
    err.classList.remove("show"); backend.awaitingLogin=true;
    try{ await F.signInWithPopup(backend.auth,new F.GoogleAuthProvider()); }
    catch(e){ backend.awaitingLogin=false; showErr(authErr(e)); }
  };
  f.onsubmit = async e=>{
    e.preventDefault();
    const email=f.elements.email.value.trim(), pw=f.elements.password.value;
    if(!EMAIL_RE.test(email)||!pw){ showErr(L("Enter your email and password.","이메일과 비밀번호를 입력해 주세요.")); return; }
    const btn=$("lpSubmit"); btn.disabled=true; btn.classList.add("loading"); err.classList.remove("show");
    backend.awaitingLogin=true;
    try{ await F.signInWithEmailAndPassword(backend.auth,email,pw); }
    catch(er){ backend.awaitingLogin=false; showErr(authErr(er)); }
    btn.disabled=false; btn.classList.remove("loading");
  };
}
function showLoginPage(){
  if(account && account.loggedIn && account.role) return;   // already logged in
  buildLoginPage();
  const h = location.hash;
  if(h && h!=="#login") loginReturn = h;
  try{ closeModal(); }catch(e){}
  document.body.classList.remove("dash","info","sdash");
  document.body.classList.add("loginpg");
  if(location.hash!=="#login") history.replaceState(null,"","#login");
  renderLoginPage(); window.scrollTo(0,0);
  setTimeout(()=>{ const em=$("lpForm").elements.email; if(em && window.innerWidth>760) em.focus(); }, 60);
}
function hideLoginPage(to){
  if(!document.body.classList.contains("loginpg")) return;
  document.body.classList.remove("loginpg");
  if(location.hash==="#login") history.replaceState(null,"", to || loginReturn || "#top");
  if(to==="#top") window.scrollTo(0,0);
}

// every "Log in" button now opens the page
const _openAuthLP = openAuth;
openAuth = function(step){
  if(step==="login" && backend.mode!=="loading"){ showLoginPage(); return; }
  return _openAuthLP(step);
};
// after logging in: leave the page and go back to where you were
const _renderAuthLP = renderAuth;
renderAuth = function(){
  _renderAuthLP();
  if(document.body.classList.contains("loginpg")){
    if(account && account.loggedIn && account.role){
      const back = loginReturn; hideLoginPage();
      if(account.role==="student" && back==="#me" && typeof openStudentDash==="function") openStudentDash("home");
    } else renderLoginPage();
  }
  mobileMenuExtras();
};
// after logging out: show the log-in page
const _doLogoutLP = doLogout;
doLogout = async function(){
  await _doLogoutLP();
  loginReturn = "#top";
  setTimeout(showLoginPage, 50);
};
window.addEventListener("hashchange", ()=>{
  if(location.hash==="#login") showLoginPage();
  else if(document.body.classList.contains("loginpg")) document.body.classList.remove("loginpg");
});
// opened the site with …/#login
(function waitLP(){ if(backend.mode==="loading") return setTimeout(waitLP,150); if(location.hash==="#login") showLoginPage(); })();

/* ---- phones: language / dark mode / Saved inside the ☰ menu ---- */
function mobileMenuExtras(){
  const nav = $("navLinks"); if(!nav) return;
  let box = $("navMobile");
  if(!box){
    nav.insertAdjacentHTML("beforeend", `<div class="nav-mobile" id="navMobile">
      <div class="nm-row"><span id="nmLangL"></span><div class="lang"><button data-nl="en">EN</button><button data-nl="ko">한국어</button></div></div>
      <div class="nm-row"><span id="nmDarkL"></span><label class="switch"><input type="checkbox" id="nmDark"><i></i></label></div>
      <button class="btn btn-ghost nm-saved" id="nmSaved"></button></div>`);
    box = $("navMobile");
    box.querySelectorAll("[data-nl]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); document.querySelector(`.nav-right .lang button[data-lang="${b.dataset.nl}"]`).click(); mobileMenuExtras(); });
    $("nmDark").onchange = ()=>{ $("themeBtn").click(); mobileMenuExtras(); };
    $("nmSaved").onclick = ()=>{ nav.classList.remove("open"); $("savedBtn").click(); };
  }
  $("nmLangL").textContent = L("Language","언어");
  $("nmDarkL").textContent = L("Dark mode","다크 모드");
  $("nmDark").checked = document.documentElement.dataset.theme==="dark";
  box.querySelectorAll("[data-nl]").forEach(b=>b.classList.toggle("on", b.dataset.nl===lang));
  $("nmSaved").innerHTML = `★ ${L("Saved jobs","저장한 공고")} <span class="saved-count">${$("savedCount") ? $("savedCount").textContent : 0}</span>`;
}
mobileMenuExtras();

/* ==========================================================================
   FEATURES 10: more languages (नेपाली · বাংলা · 中文) + side log-in box
   + "Your Korea journey" motivation section on the home page
   ========================================================================== */
// English text -> [Nepali, Bengali, Chinese]. Anything not in this list stays in English.
const TR = {
 // header & menus
 "Find jobs":["काम खोज्नुहोस्","কাজ খুঁজুন","找工作"],
 "Visa hours & pay":["भिसा घण्टा र तलब","ভিসার সময় ও বেতন","签证工时与工资"],
 "Work permit guide":["काम अनुमति गाइड","কাজের অনুমতি গাইড","打工许可指南"],
 "FAQ":["प्रश्नोत्तर","প্রশ্নোত্তর","常见问题"],
 "For employers":["रोजगारदाताका लागि","নিয়োগকর্তাদের জন্য","雇主专区"],
 "About":["हाम्रो बारेमा","আমাদের সম্পর্কে","关于我们"],
 "Saved":["सेभ गरिएको","সেভ করা","已收藏"],
 "Log in":["लग इन","লগ ইন","登录"],
 "Sign up":["साइन अप","সাইন আপ","注册"],
 "Log out":["लग आउट","লগ আউট","退出登录"],
 "Language":["भाषा","ভাষা","语言"],
 "Dark mode":["डार्क मोड","ডার্ক মোড","深色模式"],
 "Messages":["सन्देशहरू","মেসেজ","消息"],
 "Send":["पठाउनुहोस्","পাঠান","发送"],
 "📊 My dashboard":["📊 मेरो ड्यासबोर्ड","📊 আমার ড্যাশবোর্ড","📊 我的主页"],
 "🗓️ My schedule & home":["🗓️ मेरो समय तालिका र घर","🗓️ আমার সময়সূচি ও বাসা","🗓️ 我的时间表与住址"],
 "⏱️ My work hours":["⏱️ मेरो काम गर्ने घण्टा","⏱️ আমার কাজের ঘণ্টা","⏱️ 我的工时"],
 "💬 Messages":["💬 सन्देशहरू","💬 মেসেজ","💬 消息"],
 "★ Saved jobs":["★ सेभ गरिएका काम","★ সেভ করা কাজ","★ 收藏的工作"],
 "Saved jobs":["सेभ गरिएका काम","সেভ করা কাজ","收藏的工作"],
 // hero & search
 "Part-time jobs in Korea,":["कोरियामा पार्ट-टाइम काम,","কোরিয়ায় পার্ট-টাইম কাজ,","在韩国找兼职，"],
 "made simple.":["अब सजिलो।","এখন সহজ।","从未如此简单。"],
 "Visa-friendly jobs with clear pay and Korean level. Find a shift and apply in minutes.":["भिसा नियम मिल्ने काम, स्पष्ट तलब र कोरियाली भाषा स्तरसहित। केही मिनेटमै काम खोजेर आवेदन दिनुहोस्।","ভিসা-বান্ধব কাজ, পরিষ্কার বেতন ও কোরিয়ান লেভেলসহ। কয়েক মিনিটেই শিফট খুঁজে আবেদন করুন।","符合签证规定的工作，工资和韩语要求一目了然。几分钟即可找到班次并申请。"],
 "What":["के","কী","职位"],
 "Where":["कहाँ","কোথায়","地点"],
 "Korean level":["कोरियाली भाषा स्तर","কোরিয়ান লেভেল","韩语水平"],
 "Search":["खोज्नुहोस्","খুঁজুন","搜索"],
 "Popular:":["लोकप्रिय:","জনপ্রিয়:","热门："],
 "English OK":["अंग्रेजी चल्छ","ইংরেজি চলবে","可用英语"],
 "Weekend only":["सप्ताहान्त मात्र","শুধু সপ্তাহান্তে","仅周末"],
 "Tutoring":["ट्युसन","টিউশন","家教"],
 "Translation":["अनुवाद","অনুবাদ","翻译"],
 "Remote":["घरबाट","রিমোট","远程"],
 "All cities":["सबै शहर","সব শহর","所有城市"],
 "Any":["जुनसुकै","যেকোনো","不限"],
 "No Korean needed":["कोरियाली नचाहिने","কোরিয়ান লাগবে না","无需韩语"],
 "Basic (TOPIK 1–2)":["आधारभूत (TOPIK 1–2)","প্রাথমিক (TOPIK 1–2)","初级 (TOPIK 1–2)"],
 "Intermediate (TOPIK 3–4)":["मध्यम (TOPIK 3–4)","মধ্যম (TOPIK 3–4)","中级 (TOPIK 3–4)"],
 "Advanced (TOPIK 5+)":["उच्च (TOPIK 5+)","উচ্চ (TOPIK 5+)","高级 (TOPIK 5+)"],
 "Korea minimum wage":["कोरियाको न्यूनतम ज्याला","কোরিয়ার ন্যূনতম মজুরি","韩国最低时薪"],
 "/ hour":["/ घण्टा","/ ঘণ্টা","/ 小时"],
 "Same for every worker, including international students.":["अन्तर्राष्ट्रिय विद्यार्थीसहित सबै कामदारका लागि उस्तै।","আন্তর্জাতিক শিক্ষার্থীসহ সবার জন্য একই।","对所有劳动者相同，包括留学生。"],
 "No limit":["सीमा छैन","কোনো সীমা নেই","无限制"],
 "open listings":["खुला काम","খোলা কাজ","在招职位"],
 "English-OK jobs":["अंग्रेजी चल्ने काम","ইংরেজি চলে এমন কাজ","可用英语的工作"],
 "cities covered":["शहरहरू","শহর","覆盖城市"],
 "at or above min. wage":["न्यूनतम ज्याला वा बढी","ন্যূনতম মজুরি বা বেশি","不低于最低工资"],
 // categories & listings
 "Browse":["हेर्नुहोस्","দেখুন","浏览"],
 "Jobs by category":["प्रकार अनुसार काम","ধরন অনুযায়ী কাজ","按类别找工作"],
 "Café & Food":["क्याफे र खाना","ক্যাফে ও খাবার","咖啡与餐饮"],
 "Retail & Store":["पसल र बिक्री","দোকান ও বিক্রি","零售与门店"],
 "Office & Admin":["कार्यालय","অফিস ও প্রশাসন","办公室行政"],
 "Tourism & Hotel":["पर्यटन र होटल","পর্যটন ও হোটেল","旅游与酒店"],
 "Events & Promo":["कार्यक्रम र प्रचार","ইভেন্ট ও প্রচার","活动与推广"],
 "Online & Content":["अनलाइन र कन्टेन्ट","অনলাইন ও কনটেন্ট","线上与内容"],
 "Latest":["नयाँ","সর্বশেষ","最新"],
 "Open positions":["खुला पदहरू","খোলা পদ","招聘职位"],
 "Tap a job to see details and apply. Save jobs with the bookmark to compare later.":["विवरण हेर्न र आवेदन दिन कामलाई थिच्नुहोस्। पछि तुलना गर्न बुकमार्कले सेभ गर्नुहोस्।","বিস্তারিত দেখতে ও আবেদন করতে কাজে চাপুন। পরে তুলনা করতে বুকমার্ক দিয়ে সেভ করুন।","点击职位查看详情并申请。用书签收藏，方便以后比较。"],
 "Job type":["कामको प्रकार","কাজের ধরন","工作类型"],
 "Schedule":["समय तालिका","সময়সূচি","时间安排"],
 "Evenings":["बेलुका","সন্ধ্যা","晚上"],
 "Evening":["बेलुका","সন্ধ্যা","晚上"],
 "Weekend":["सप्ताहान्त","সপ্তাহান্ত","周末"],
 "No experience":["अनुभव नचाहिने","অভিজ্ঞতা লাগবে না","无需经验"],
 "Minimum pay":["न्यूनतम तलब","ন্যূনতম বেতন","最低工资"],
 "Clear filters":["फिल्टर हटाउनुहोस्","ফিল্টার মুছুন","清除筛选"],
 "jobs found":["काम भेटियो","টি কাজ পাওয়া গেছে","个职位"],
 "Show more jobs":["थप काम हेर्नुहोस्","আরও কাজ দেখুন","查看更多"],
 "Sample":["नमुना","নমুনা","示例"],
 "Hourly wage":["घण्टाको ज्याला","ঘণ্টাপ্রতি মজুরি","时薪"],
 "Daily wage":["दैनिक ज्याला","দৈনিক মজুরি","日薪"],
 "Monthly salary":["मासिक तलब","মাসিক বেতন","月薪"],
 "Basic Korean":["आधारभूत कोरियाली","প্রাথমিক কোরিয়ান","初级韩语"],
 "Intermediate Korean":["मध्यम कोरियाली","মধ্যম কোরিয়ান","中级韩语"],
 "Advanced Korean":["उच्च कोरियाली","উচ্চ কোরিয়ান","高级韩语"],
 "Today":["आज","আজ","今天"],
 "Save job":["काम सेभ गर्नुहोस्","কাজ সেভ করুন","收藏"],
 // job details
 "About the job":["कामको बारेमा","কাজ সম্পর্কে","工作内容"],
 "Requirements":["आवश्यकताहरू","যোগ্যতা","要求"],
 "Location & directions":["ठेगाना र बाटो","ঠিকানা ও পথ","位置与路线"],
 "Log in to apply":["आवेदन दिन लग इन गर्नुहोस्","আবেদন করতে লগ ইন করুন","登录后申请"],
 "Log in as a student to apply with your profile.":["आफ्नो प्रोफाइलसहित आवेदन दिन विद्यार्थीको रूपमा लग इन गर्नुहोस्।","প্রোফাইল দিয়ে আবেদন করতে শিক্ষার্থী হিসেবে লগ ইন করুন।","以学生身份登录，用个人资料申请。"],
 "📍 Show route from my location":["📍 मेरो स्थानबाट बाटो देखाउनुहोस्","📍 আমার অবস্থান থেকে পথ দেখান","📍 显示从我所在位置出发的路线"],
 "Category":["प्रकार","ধরন","类别"],
 // tools
 "Free tools":["निःशुल्क उपकरण","ফ্রি টুল","免费工具"],
 "Know your hours. Know your pay.":["आफ्नो घण्टा जान्नुहोस्। आफ्नो तलब जान्नुहोस्।","নিজের ঘণ্টা জানুন। নিজের বেতন জানুন।","了解你的工时，了解你的工资。"],
 "Working over your permitted hours can cost you your visa. Check before you accept a schedule.":["अनुमति भन्दा बढी घण्टा काम गर्दा भिसा गुम्न सक्छ। समय तालिका स्वीकार गर्नुअघि जाँच गर्नुहोस्।","অনুমতির বেশি ঘণ্টা কাজ করলে ভিসা হারাতে পারেন। শিফট নেওয়ার আগে যাচাই করুন।","超出许可工时打工可能影响签证。接受排班前请先确认。"],
 "Visa work-hours checker":["भिसा काम-घण्टा जाँच","ভিসার কাজের ঘণ্টা যাচাই","签证工时检查"],
 "Program":["कार्यक्रम","প্রোগ্রাম","课程"],
 "Pay calculator":["तलब हिसाब","বেতন ক্যালকুলেটর","工资计算器"],
 "Hourly wage (₩)":["घण्टाको ज्याला (₩)","ঘণ্টাপ্রতি মজুরি (₩)","时薪 (₩)"],
 "Hours per week":["हप्तामा घण्टा","সপ্তাহে ঘণ্টা","每周工时"],
 "Weekly base pay":["हप्ताको आधार तलब","সাপ্তাহিক মূল বেতন","每周基本工资"],
 "Weekly total":["हप्ताको जम्मा","সাপ্তাহিক মোট","每周合计"],
 "Estimated monthly pay":["अनुमानित मासिक तलब","আনুমানিক মাসিক বেতন","预计月收入"],
 "Requirement met":["आवश्यकता पूरा","শর্ত পূরণ হয়েছে","符合要求"],
 "Below requirement":["आवश्यकता भन्दा कम","শর্তের নিচে","未达要求"],
 "Usually allowed":["प्रायः अनुमति छ","সাধারণত অনুমোদিত","通常允许"],
 "Not allowed":["अनुमति छैन","অনুমোদিত নয়","不允许"],
 // guide
 "Guide":["गाइड","গাইড","指南"],
 "Get your part-time work permit in 4 steps":["४ चरणमा पार्ट-टाइम काम अनुमति लिनुहोस्","৪ ধাপে পার্ট-টাইম কাজের অনুমতি নিন","4步获得打工许可"],
 "Find a job & get the contract":["काम खोज्नुहोस् र सम्झौता लिनुहोस्","কাজ খুঁজুন ও চুক্তি নিন","找到工作并签合同"],
 "Visit your international office":["आफ्नो अन्तर्राष्ट्रिय कार्यालय जानुहोस्","আন্তর্জাতিক অফিসে যান","前往国际处"],
 "Apply on HiKorea":["HiKorea मा आवेदन दिनुहोस्","HiKorea-তে আবেদন করুন","在HiKorea申请"],
 "Wait for approval, then start":["स्वीकृति पर्खनुहोस्, त्यसपछि सुरु गर्नुहोस्","অনুমোদনের পর কাজ শুরু করুন","获批后再开始工作"],
 "Official help":["आधिकारिक सहयोग","সরকারি সহায়তা","官方帮助"],
 "Questions students ask us":["विद्यार्थीहरूले सोध्ने प्रश्न","শিক্ষার্থীরা যা জিজ্ঞেস করে","学生常问的问题"],
 "Can I start working as soon as I arrive in Korea?":["कोरिया आउनेबित्तिकै काम सुरु गर्न सक्छु?","কোরিয়ায় এসেই কি কাজ শুরু করতে পারব?","到韩国后可以马上打工吗？"],
 "Do foreign students get the same minimum wage?":["विदेशी विद्यार्थीले पनि उही न्यूनतम ज्याला पाउँछन्?","বিদেশি শিক্ষার্থীরাও কি একই ন্যূনতম মজুরি পায়?","留学生的最低工资一样吗？"],
 "What is 주휴수당 (weekly holiday allowance)?":["주휴수당 (साप्ताहिक बिदा भत्ता) के हो?","주휴수당 (সাপ্তাহিক ছুটির ভাতা) কী?","什么是주휴수당（周休津贴）？"],
 "Can I work more than one part-time job?":["एकभन्दा बढी पार्ट-टाइम काम गर्न सक्छु?","একাধিক পার্ট-টাইম কাজ করতে পারব?","可以同时做多份兼职吗？"],
 "What if my employer refuses to sign a contract or pays late?":["रोजगारदाताले सम्झौता नगरे वा ढिलो तलब दिए के गर्ने?","নিয়োগকর্তা চুক্তি না করলে বা দেরিতে বেতন দিলে কী করব?","雇主不签合同或拖欠工资怎么办？"],
 // employers & footer
 "Employers":["रोजगारदाता","নিয়োগকর্তা","雇主"],
 "Hire motivated, multilingual students":["जोसिला, बहुभाषी विद्यार्थी भर्ना गर्नुहोस्","উদ্যমী, বহুভাষী শিক্ষার্থী নিয়োগ দিন","招聘积极、多语言的留学生"],
 "Post a job — free":["निःशुल्क काम पोस्ट गर्नुहोस्","বিনামূল্যে কাজ পোস্ট করুন","免费发布职位"],
 "Post a job":["काम पोस्ट गर्नुहोस्","কাজ পোস্ট করুন","发布职位"],
 "Privacy Policy":["गोपनीयता नीति","গোপনীয়তা নীতি","隐私政策"],
 "Terms of Use":["प्रयोगका सर्तहरू","ব্যবহারের শর্তাবলি","使用条款"],
 "Part-time jobs and work-permit help for international students in Korea.":["कोरियामा अन्तर्राष्ट्रिय विद्यार्थीका लागि पार्ट-टाइम काम र काम अनुमति सहयोग।","কোরিয়ায় আন্তর্জাতিক শিক্ষার্থীদের জন্য পার্ট-টাইম কাজ ও কাজের অনুমতির সহায়তা।","为在韩留学生提供兼职与打工许可帮助。"],
 // sign up / log in
 "One account for every part-time job":["सबै पार्ट-टाइम कामका लागि एउटै खाता","সব পার্ট-টাইম কাজের জন্য একটি অ্যাকাউন্ট","一个账号，搞定所有兼职"],
 "Student member":["विद्यार्थी सदस्य","শিক্ষার্থী সদস্য","学生会员"],
 "Employer member":["रोजगारदाता सदस्य","নিয়োগকর্তা সদস্য","企业会员"],
 "Student sign up":["विद्यार्थी साइन अप","শিক্ষার্থী সাইন আপ","学生注册"],
 "Employer sign up":["रोजगारदाता साइन अप","নিয়োগকর্তা সাইন আপ","企业注册"],
 "Create your profile and apply for part-time jobs.":["प्रोफाइल बनाएर पार्ट-टाइम काममा आवेदन दिनुहोस्।","প্রোফাইল বানিয়ে পার্ট-টাইম কাজে আবেদন করুন।","创建个人资料，申请兼职。"],
 "Post job openings and find international talent.":["काम पोस्ट गरेर अन्तर्राष्ट्रिय प्रतिभा खोज्नुहोस्।","কাজের বিজ্ঞাপন দিয়ে আন্তর্জাতিক মেধা খুঁজুন।","发布职位，寻找国际人才。"],
 "Already have an account?":["पहिले नै खाता छ?","আগে থেকেই অ্যাকাউন্ট আছে?","已有账号？"],
 "Welcome back 👋":["फेरि स्वागत छ 👋","আবার স্বাগতম 👋","欢迎回来 👋"],
 "Visa-friendly part-time jobs, matched to your schedule.":["तपाईंको समय तालिकासँग मिल्ने, भिसा नियम मिल्ने पार्ट-टाइम काम।","আপনার সময়সূচির সাথে মিলিয়ে ভিসা-বান্ধব পার্ট-টাইম কাজ।","符合签证规定、匹配你时间的兼职。"],
 "Good to see you again. Log in to apply, chat and track your hours.":["फेरि भेट्दा खुसी लाग्यो। आवेदन, च्याट र काम-घण्टा हेर्न लग इन गर्नुहोस्।","আবার দেখা হয়ে ভালো লাগল। আবেদন, চ্যাট ও কাজের ঘণ্টা দেখতে লগ ইন করুন।","很高兴再次见到你。登录后即可申请、聊天和记录工时。"],
 "Email":["इमेल","ইমেইল","邮箱"],
 "Password":["पासवर्ड","পাসওয়ার্ড","密码"],
 "Forgot password?":["पासवर्ड बिर्सनुभयो?","পাসওয়ার্ড ভুলে গেছেন?","忘记密码？"],
 "Continue with Google":["Google बाट जारी राख्नुहोस्","Google দিয়ে চালিয়ে যান","使用Google继续"],
 "New here?":["पहिलो पटक?","নতুন এখানে?","第一次来？"],
 "Create an account":["खाता बनाउनुहोस्","অ্যাকাউন্ট খুলুন","创建账号"],
 "or":["वा","অথবা","或"],
 "← Browse jobs":["← काम हेर्नुहोस्","← কাজ দেখুন","← 浏览职位"],
 "🔒 Secured by Firebase Authentication":["🔒 Firebase Authentication द्वारा सुरक्षित","🔒 Firebase Authentication দিয়ে সুরক্ষিত","🔒 由Firebase身份验证保护"],
 "PH:Café, tutoring, translation…":["क्याफे, ट्युसन, अनुवाद…","ক্যাফে, টিউশন, অনুবাদ…","咖啡店、家教、翻译…"],
 "PH:Type a message…":["सन्देश लेख्नुहोस्…","মেসেজ লিখুন…","输入消息…"],
 "PH:Search jobs…":["काम खोज्नुहोस्…","কাজ খুঁজুন…","搜索职位…"]
};
const TR_PATTERNS = [
  [/^(\d+) jobs?$/, (m)=>[`${m[1]} काम`,`${m[1]}টি কাজ`,`${m[1]}个职位`]],
  [/^(\d+(?:,\d+)*)d ago$/, (m)=>[`${m[1]} दिन अघि`,`${m[1]} দিন আগে`,`${m[1]}天前`]],
  [/^(\d+) h\/wk$/, (m)=>[`${m[1]} घण्टा/हप्ता`,`${m[1]} ঘণ্টা/সপ্তাহ`,`${m[1]}小时/周`]]
];

/* ---- the translator: swaps English text on the page for the chosen language ---- */
const UI_LANGS = [["en","English"],["ko","한국어"],["ne","नेपाली"],["bn","বাংলা"],["zh","中文"]];
const XI = {ne:0, bn:1, zh:2};
let uiLang = null;                       // "ne" | "bn" | "zh" | null (= English/Korean)
const T5 = (en,ko,ne,bn,zh) => lang==="ko" ? ko : uiLang==="ne" ? ne : uiLang==="bn" ? bn : uiLang==="zh" ? zh : en;
const trOrig = new WeakMap(), trOut = new WeakMap();
function trText(s){
  const key = s.trim(); if(!key || !uiLang) return null;
  const t = TR[key]; if(t) return s.replace(key, t[XI[uiLang]]);
  for(const [re,fn] of TR_PATTERNS){ const m = key.match(re); if(m) return s.replace(key, fn(m)[XI[uiLang]]); }
  return null;
}
function trNode(n){
  if(trOut.has(n) && trOut.get(n)!==n.nodeValue){ trOrig.delete(n); trOut.delete(n); }   // the app changed this text
  const src = trOrig.has(n) ? trOrig.get(n) : n.nodeValue;
  const out = uiLang ? trText(src) : null;
  if(out==null){ if(trOrig.has(n)){ trOrig.delete(n); trOut.delete(n); n.nodeValue = src; } return; }
  trOrig.set(n, src); trOut.set(n, out);
  if(n.nodeValue!==out) n.nodeValue = out;
}
function trPlaceholder(el){
  const cur = el.getAttribute("placeholder"); if(cur==null) return;
  let src = (el.dataset.phEn!==undefined && el.dataset.phOut===cur) ? el.dataset.phEn : cur;
  const t = uiLang && TR["PH:"+src.trim()];
  if(!t){ if(el.dataset.phEn!==undefined){ el.setAttribute("placeholder", src); delete el.dataset.phEn; delete el.dataset.phOut; } return; }
  const out = t[XI[uiLang]]; el.dataset.phEn = src; el.dataset.phOut = out;
  if(cur!==out) el.setAttribute("placeholder", out);
}
function translateTree(root){
  if(!root) return;
  if(root.nodeType===3){ trNode(root); return; }
  if(root.nodeType!==1 || root.closest("script,style,[data-notr]")) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n=>n.parentElement && n.parentElement.closest("script,style,[data-notr]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
  let n; while((n = w.nextNode())) trNode(n);
  if(root.matches && root.matches("[placeholder]")) trPlaceholder(root);
  root.querySelectorAll("[placeholder]").forEach(trPlaceholder);
}
new MutationObserver(ms=>{
  ensureLangSelects();
  if(!uiLang) return;
  for(const m of ms){
    if(m.type==="characterData") trNode(m.target);
    else m.addedNodes.forEach(translateTree);
  }
}).observe(document.body, {childList:true, subtree:true, characterData:true});

/* ---- language picker: one dropdown with 5 languages, everywhere ---- */
function ensureLangSelects(){
  document.querySelectorAll(".lang:not([data-ls])").forEach(g=>{
    g.dataset.ls = "1";
    const sel = document.createElement("select");
    sel.className = "lang-select"; sel.setAttribute("aria-label","Language"); sel.dataset.notr = "1";
    sel.innerHTML = UI_LANGS.map(([c,n])=>`<option value="${c}">${n}</option>`).join("");
    sel.value = uiLang || lang;
    sel.addEventListener("click", e=>e.stopPropagation());
    sel.onchange = ()=>setUiLang(sel.value);
    g.after(sel);
  });
}
function setUiLang(code){
  const base = code==="ko" ? "ko" : "en";
  uiLang = XI[code]!==undefined ? code : null;
  store.set("wah_lang", code);
  const btn = document.querySelector(`.nav-right .lang button[data-lang="${base}"]`);
  if(lang!==base && btn) btn.click();      // English / Korean switch (re-draws the page)
  translateTree(document.body);              // apply or remove ne / bn / zh
  document.documentElement.lang = code;
  document.querySelectorAll(".lang-select").forEach(s=>s.value = code);
  renderHeroSide(); renderJourney();
  if(document.body.classList.contains("loginpg") && typeof renderLoginPage==="function") renderLoginPage();
}

/* ---- home page: log-in box on the side of the hero ---- */
function buildHeroSide(){
  const grid = document.querySelector(".hero-grid"), card = grid && grid.querySelector(".hero-card");
  if(!card || $("heroSide")) return;
  card.insertAdjacentHTML("beforebegin", `<div class="hero-side" id="heroSide"><div class="hs-box" id="hsBox"></div></div>`);
  $("heroSide").append(card);
}
function renderHeroSide(){
  buildHeroSide();
  const box = $("hsBox"); if(!box) return;
  const inn = account && account.loggedIn && account.role;
  if(!inn){
    box.innerHTML = `<div class="hs-head"><span class="hs-ic">🔑</span><div><b>${T5("Log in to Work Abroad Hub","Work Abroad Hub 로그인","Work Abroad Hub मा लग इन","Work Abroad Hub-এ লগ ইন","登录 Work Abroad Hub")}</b>
      <small>${T5("Apply faster, chat with employers and track your visa hours.","더 빠르게 지원하고, 기업과 채팅하고, 비자 근무시간을 관리하세요.","छिटो आवेदन, रोजगारदातासँग च्याट र भिसा घण्टा ट्र्याक।","দ্রুত আবেদন, নিয়োগকর্তার সাথে চ্যাট আর ভিসার ঘণ্টা ট্র্যাক।","更快申请、与雇主聊天、记录签证工时。")}</small></div></div>
      <button class="btn btn-primary hs-btn" id="hsLogin">${T5("Log in","로그인","लग इन","লগ ইন","登录")}</button>
      <div class="hs-links"><button class="link-btn" id="hsSignup">${T5("Sign up","회원가입","साइन अप","সাইন আপ","注册")}</button><span>·</span><button class="link-btn" id="hsForgot">${T5("Forgot password?","비밀번호 찾기","पासवर्ड बिर्सनुभयो?","পাসওয়ার্ড ভুলে গেছেন?","忘记密码？")}</button></div>
      <div class="hs-roles"><button id="hsStu">🎓 ${T5("I'm a student","학생이에요","म विद्यार्थी हुँ","আমি শিক্ষার্থী","我是学生")}</button><button id="hsEmp">🏢 ${T5("I'm hiring","채용 중이에요","म भर्ना गर्दैछु","আমি নিয়োগ দিচ্ছি","我要招聘")}</button></div>`;
    $("hsLogin").onclick = ()=>openAuth("login");
    $("hsForgot").onclick = ()=>openAuth("login");
    $("hsSignup").onclick = ()=>openAuth("choose");
    $("hsStu").onclick = ()=>openAuth("student");
    $("hsEmp").onclick = ()=>openAuth("employer");
    return;
  }
  const isEmp = account.role==="employer";
  const name = isEmp ? ((myPosting()&&myPosting().company&&myPosting().company.name) || displayName()) : ((account.profile&&account.profile.name) || displayName());
  const photo = !isEmp && typeof myPhoto==="function" && myPhoto();
  let stats;
  if(isEmp){
    const jobs = (myPosting()&&myPosting().jobs)||[];
    stats = [[jobs.filter(j=>j.status==="open").length, T5("Active jobs","진행 중","सक्रिय काम","সক্রিয় কাজ","在招职位")],
             [applications.filter(a=>a.status==="new").length, T5("New applicants","새 지원자","नयाँ आवेदक","নতুন আবেদন","新申请")],
             [applications.length, T5("Total applicants","전체 지원","जम्मा आवेदक","মোট আবেদন","申请总数")]];
  } else {
    const hrs = typeof weekSummary==="function" ? weekSummary(0).counted : 0;
    stats = [[(account.applied||[]).length, T5("Applied","지원","आवेदन","আবেদন","已申请")],
             [saved.length, T5("Saved","저장","सेभ","সেভ","收藏")],
             [hrs+"h", T5("This week","이번 주","यो हप्ता","এই সপ্তাহ","本周工时")]];
  }
  box.innerHTML = `<div class="hs-user">${photo?`<img src="${photo}" alt="">`:`<span>${esc(initials(name))}</span>`}<div><small>${T5("Welcome back","다시 오신 걸 환영해요","फेरि स्वागत छ","আবার স্বাগতম","欢迎回来")} 👋</small><b>${esc(name)}</b>
      <em>${isEmp?T5("Employer","기업 회원","रोजगारदाता","নিয়োগকর্তা","企业会员"):T5("Student","학생","विद्यार्थी","শিক্ষার্থী","学生")}</em></div></div>
    <div class="hs-stats">${stats.map(([v,l])=>`<div><b>${esc(v)}</b><small>${l}</small></div>`).join("")}</div>
    <div class="hs-actions"><button class="btn btn-primary" id="hsDash">${isEmp?"📋 "+T5("Dashboard","대시보드","ड्यासबोर्ड","ড্যাশবোর্ড","管理后台"):"📊 "+T5("My dashboard","내 대시보드","मेरो ड्यासबोर्ड","আমার ড্যাশবোর্ড","我的主页")}</button>
      <button class="btn btn-ghost" id="hsOut">${T5("Log out","로그아웃","लग आउट","লগ আউট","退出")}</button></div>`;
  $("hsDash").onclick = ()=>{ if(isEmp) showView("dashboard"); else if(typeof openStudentDash==="function") openStudentDash("home"); };
  $("hsOut").onclick = ()=>doLogout();
}

/* ---- home page: "Your Korea journey" (motivation) ---- */
const QUOTES = [
  ["Every shift is Korean practice you get paid for.","모든 근무는 돈을 받으며 하는 한국어 연습이에요.","हरेक सिफ्ट पैसा पाउँदै गर्ने कोरियाली अभ्यास हो।","প্রতিটি শিফট মানে বেতন পেয়ে কোরিয়ান অনুশীলন।","每一次上班，都是带薪的韩语练习。"],
  ["Your first job in Korea is closer than you think.","한국에서의 첫 알바, 생각보다 가까이 있어요.","कोरियामा तपाईंको पहिलो काम सोचेभन्दा नजिक छ।","কোরিয়ায় আপনার প্রথম কাজ যতটা ভাবছেন তার চেয়ে কাছে।","你在韩国的第一份工作，比你想象的更近。"],
  ["Study hard, work legally, dream big.","열심히 공부하고, 합법적으로 일하고, 크게 꿈꾸세요.","मेहनतले पढ्नुहोस्, कानुनी रूपमा काम गर्नुहोस्, ठूलो सपना देख्नुहोस्।","মন দিয়ে পড়ুন, বৈধভাবে কাজ করুন, বড় স্বপ্ন দেখুন।","努力学习，合法打工，勇敢追梦。"],
  ["Small hours add up to big steps.","작은 시간이 모여 큰 걸음이 돼요.","सानो-सानो घण्टा जोडिएर ठूलो पाइला बन्छ।","ছোট ছোট ঘণ্টা মিলে বড় পদক্ষেপ হয়।","点滴工时，汇成大步向前。"],
  ["You came far from home. You can do this.","멀리서 여기까지 왔잖아요. 할 수 있어요.","तपाईं घरबाट टाढा आउनुभयो। तपाईं गर्न सक्नुहुन्छ।","অনেক দূর থেকে এসেছেন। আপনি পারবেন।","你远道而来，一定能做到。"],
  ["Every expert was once a beginner who applied anyway.","모든 전문가도 처음엔 용기 내 지원한 초보였어요.","हरेक विज्ञ पनि कुनै बेला डराउँदै आवेदन दिने नौसिखिया थिए।","প্রত্যেক দক্ষ মানুষই একসময় ভয় পেয়েও আবেদন করা নতুন ছিল।","每个高手，都曾是勇敢投出简历的新手。"]
];
const PHRASES = [
  ["어서 오세요!","eoseo oseyo","Welcome! (to customers)","स्वागत छ! (ग्राहकलाई)","স্বাগতম! (গ্রাহককে)","欢迎光临！（对顾客）"],
  ["잠시만 기다려 주세요.","jamsiman gidaryeo juseyo","Please wait a moment.","कृपया एकछिन पर्खनुहोस्।","একটু অপেক্ষা করুন।","请稍等一下。"],
  ["주문하시겠어요?","jumunhasigesseoyo?","Are you ready to order?","अर्डर गर्नुहुन्छ?","অর্ডার করবেন?","您要点餐吗？"],
  ["수고하셨습니다!","sugohasyeotseumnida","Thanks for your hard work! (to coworkers after a shift)","मेहनतका लागि धन्यवाद! (सिफ्टपछि सहकर्मीलाई)","কষ্ট করার জন্য ধন্যবাদ! (শিফট শেষে সহকর্মীকে)","辛苦了！（下班时对同事说）"],
  ["처음이라 잘 부탁드립니다.","cheoeumira jal butakdeurimnida","It's my first day — I look forward to working with you.","आज मेरो पहिलो दिन हो, सँगै काम गर्न उत्सुक छु।","আজ আমার প্রথম দিন, একসাথে কাজ করতে আগ্রহী।","我是第一天上班，请多关照。"],
  ["다시 한 번 말씀해 주시겠어요?","dasi han beon malsseumhae jusigesseoyo?","Could you say that again, please?","कृपया फेरि एक पटक भन्नुहुन्छ?","আরেকবার বলবেন, প্লিজ?","您能再说一遍吗？"],
  ["감사합니다, 또 오세요!","gamsahamnida, tto oseyo","Thank you, please come again!","धन्यवाद, फेरि आउनुहोला!","ধন্যবাদ, আবার আসবেন!","谢谢，欢迎再来！"]
];
const GOALS = [["🍜",10000,"bowls of gukbap","국밥","कचौरा 국밥","বাটি 국밥","碗汤饭"],["🏠",450000,"× monthly rent","× 월세","× मासिक भाडा","× মাসিক ভাড়া","× 月租"],
               ["✈️",700000,"flight home","고향 가는 비행기","घर जाने टिकट","বাড়ি ফেরার টিকিট","回国机票"],["📱",1200000,"new phone","새 휴대폰","नयाँ फोन","নতুন ফোন","新手机"]];
let jrQ = 0, jrP = Math.floor((Date.now()/86400000)) % PHRASES.length, jrTimer = null;
const pick5 = a => T5(a[0],a[1],a[2],a[3],a[4]);
function buildJourney(){
  if($("journey")) return;
  const hero = document.querySelector(".hero"); if(!hero) return;
  hero.insertAdjacentHTML("afterend", `<section id="journey"><div class="wrap">
    <div class="jr-banner reveal"><span class="jr-kick" id="jrKick"></span><p class="jr-quote" id="jrQuote"></p><div class="jr-dots" id="jrDots"></div></div>
    <div class="jr-grid">
      <div class="jr-card jr-earn reveal"><h3 id="jrEarnH"></h3><p id="jrEarnP"></p>
        <div class="jr-slider"><input type="range" min="5" max="25" step="1" value="12" id="jrHours" aria-label="Hours per week"><span id="jrHoursL"></span></div>
        <div class="jr-big"><b id="jrMonth">₩0</b><small id="jrMonthL"></small></div>
        <div class="jr-goals" id="jrGoals"></div><small class="jr-note" id="jrNote"></small></div>
      <div class="jr-card jr-phrase reveal"><h3 id="jrPhH"></h3>
        <div class="jr-ko" id="jrKo" data-notr="1"></div><div class="jr-rom" id="jrRom" data-notr="1"></div><div class="jr-mean" id="jrMean"></div>
        <button class="btn btn-ghost btn-sm" id="jrNext"></button><small class="jr-note" id="jrPhNote"></small></div>
      <div class="jr-card jr-steps reveal"><h3 id="jrStH"></h3><div class="jr-bar"><i id="jrBar"></i></div><ol id="jrSteps"></ol><button class="btn btn-primary btn-sm" id="jrGo"></button></div>
    </div></div></section>`);
  $("jrHours").oninput = renderEarn;
  $("jrNext").onclick = ()=>{ jrP = (jrP+1) % PHRASES.length; renderPhrase(true); };
  $("jrGo").onclick = ()=>{
    if(!(account && account.loggedIn)) return openAuth("choose");
    if(account.role==="employer") return showView("dashboard");
    if(!(hasSchedule()||hasHome())) return openScheduleModal();
    $("jobs").scrollIntoView({behavior:"smooth"});
  };
  if(typeof revealOnScroll==="function") revealOnScroll($("journey")); else $("journey").querySelectorAll(".reveal").forEach(e=>e.classList.add("in"));
  jrTimer = setInterval(()=>{ if(document.hidden) return; jrQ = (jrQ+1) % QUOTES.length; renderQuote(true); }, 6000);
}
function renderQuote(anim){
  const q=$("jrQuote"); if(!q) return;
  const set = ()=>{ q.textContent = "“"+pick5(QUOTES[jrQ])+"”"; q.classList.remove("out"); };
  if(anim){ q.classList.add("out"); setTimeout(set, 350); } else set();
  $("jrDots").innerHTML = QUOTES.map((_,i)=>`<button class="${i===jrQ?"on":""}" data-q="${i}" aria-label="Quote ${i+1}"></button>`).join("");
  $("jrDots").querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{ jrQ=+b.dataset.q; renderQuote(true); });
}
function renderEarn(){
  const h = +$("jrHours").value, month = Math.round(h*MIN_WAGE*4.345/100)*100;
  $("jrHoursL").textContent = T5(`${h} h / week`,`주 ${h}시간`,`${h} घण्टा / हप्ता`,`${h} ঘণ্টা / সপ্তাহ`,`每周 ${h} 小时`);
  const el=$("jrMonth"), from=Number(el.dataset.v||0); el.dataset.v=month;
  const t0=performance.now(); (function step(t){ const k=Math.min(1,(t-t0)/500); el.textContent = won(from+(month-from)*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(step); })(t0);
  const mo = T5("months","개월","महिना","মাস","个月");
  $("jrGoals").innerHTML = GOALS.map(([ic,price,...names])=>{
    const nm = T5(names[0],names[1],names[2],names[3],names[4]);
    const val = price<100000 ? `${Math.floor(month/price)} ${nm}`
      : price<700000 ? `${(month/price).toFixed(1)}${nm}`
      : `${nm} · ${(price/month).toFixed(1)} ${mo}`;
    return `<div class="jr-goal"><span>${ic}</span><b>${esc(val)}</b></div>`;
  }).join("");
}
function renderPhrase(anim){
  const p = PHRASES[jrP], box=$("jrKo"); if(!box) return;
  box.textContent = p[0]; $("jrRom").textContent = p[1];
  $("jrMean").textContent = T5(p[2], p[2], p[3], p[4], p[5]);
  if(anim){ box.classList.remove("pop"); void box.offsetWidth; box.classList.add("pop"); }
}
function renderJourney(){
  buildJourney(); if(!$("journey")) return;
  $("jrKick").textContent = "✨ "+T5("Daily motivation","오늘의 응원","आजको प्रेरणा","আজকের অনুপ্রেরণা","每日激励");
  $("jrEarnH").textContent = "💰 "+T5("What could your shifts buy?","알바로 무엇을 할 수 있을까요?","तपाईंको कामले के किन्न सकिन्छ?","আপনার শিফটে কী কেনা যায়?","打工能换来什么？");
  $("jrEarnP").textContent = T5("Slide to see what part-time work at the minimum wage adds up to each month.","최저시급으로 한 달에 얼마를 벌 수 있는지 확인해 보세요.","न्यूनतम ज्यालामा महिनामा कति कमाइन्छ, सार्नुहोस् र हेर्नुहोस्।","ন্যূনতম মজুরিতে মাসে কত আয় হয়, স্লাইড করে দেখুন।","拖动滑块，看看按最低时薪每月能赚多少。");
  $("jrMonthL").textContent = T5("per month (approx., before tax)","월 예상 금액 (세전)","प्रति महिना (अनुमानित, कर अघि)","প্রতি মাসে (আনুমানিক, করের আগে)","每月（约，税前）");
  $("jrNote").textContent = T5("₩10,320/hr × 4.3 weeks. Stay within your visa hours — usually 25 h/week during semester.","₩10,320 × 4.3주 기준. 학기 중 보통 주 25시간 이내로 일하세요.","₩10,320/घण्टा × 4.3 हप्ता। भिसा घण्टाभित्र रहनुहोस् — सेमेस्टरमा प्रायः हप्तामा 25 घण्टा।","₩10,320/ঘণ্টা × 4.3 সপ্তাহ। ভিসার ঘণ্টার মধ্যে থাকুন — সেমিস্টারে সাধারণত সপ্তাহে 25 ঘণ্টা।","按 ₩10,320/小时 × 4.3周计算。请遵守签证工时——学期中通常每周25小时以内。");
  $("jrPhH").textContent = "🇰🇷 "+T5("Korean phrase of the day","오늘의 알바 한국어","आजको कोरियाली वाक्य","আজকের কোরিয়ান বাক্য","每日韩语一句");
  $("jrNext").textContent = T5("Next phrase →","다음 표현 →","अर्को वाक्य →","পরের বাক্য →","下一句 →");
  $("jrPhNote").textContent = T5("Use it on your next shift — your manager will love it!","다음 근무 때 써 보세요!","अर्को सिफ्टमा प्रयोग गर्नुहोस् — म्यानेजर खुसी हुनुहुनेछ!","পরের শিফটে বলে দেখুন — ম্যানেজার খুশি হবেন!","下次上班试着说说看，店长一定会喜欢！");
  $("jrStH").textContent = "🚀 "+T5("Your journey","나의 여정","तपाईंको यात्रा","আপনার যাত্রা","你的旅程");
  const inn = account && account.loggedIn && account.role==="student";
  const steps = [
    [T5("Create your account","계정 만들기","खाता बनाउनुहोस्","অ্যাকাউন্ট খুলুন","创建账号"), !!(account&&account.loggedIn)],
    [T5("Add your free time & home","가능 시간·집 등록","खाली समय र घर थप्नुहोस्","ফ্রি সময় ও বাসা যোগ করুন","添加空闲时间和住址"), inn && (hasSchedule()||hasHome())],
    [T5("Apply to a matching job","맞는 공고에 지원","मिल्ने काममा आवेदन दिनुहोस्","মিলে যাওয়া কাজে আবেদন করুন","申请匹配的工作"), inn && (account.applied||[]).length>0],
    [T5("Get your work permit","시간제 취업 허가 받기","काम अनुमति लिनुहोस्","কাজের অনুমতি নিন","办理打工许可"), false],
    [T5("First paycheck 🎉","첫 월급 🎉","पहिलो तलब 🎉","প্রথম বেতন 🎉","第一份工资 🎉"), inn && Array.isArray(account.shifts) && account.shifts.length>0]];
  const done = steps.filter(s=>s[1]).length;
  $("jrSteps").innerHTML = steps.map(([t,ok],i)=>`<li class="${ok?"ok":""} ${!ok && steps.slice(0,i).every(s=>s[1])?"next":""}"><span>${ok?"✓":i+1}</span>${esc(t)}</li>`).join("");
  requestAnimationFrame(()=>{ $("jrBar").style.width = (done/steps.length*100)+"%"; });
  $("jrGo").textContent = !(account&&account.loggedIn) ? T5("Start now — it's free","무료로 시작하기","अहिले सुरु गर्नुहोस् — निःशुल्क","এখনই শুরু করুন — ফ্রি","立即开始——免费")
    : account.role==="employer" ? T5("Go to dashboard","대시보드로","ड्यासबोर्डमा जानुहोस्","ড্যাশবোর্ডে যান","前往后台")
    : !(hasSchedule()||hasHome()) ? T5("Add my schedule","일정 등록하기","मेरो समय तालिका थप्नुहोस्","আমার সময়সূচি যোগ করুন","添加我的时间表")
    : T5("Find my next job","다음 알바 찾기","अर्को काम खोज्नुहोस्","পরের কাজ খুঁজুন","找下一份工作");
  renderQuote(false); renderEarn(); renderPhrase(false);
}

/* ---- hooks ---- */
const _renderAuthHS = renderAuth;
renderAuth = function(){ _renderAuthHS(); renderHeroSide(); if($("journey")) renderJourney(); };
const _renderAllHS = renderAll;
renderAll = function(){ _renderAllHS(); renderHeroSide(); renderJourney(); };
ensureLangSelects();
(function(){ const s = store.get("wah_lang", "en"); if(s && s!=="en") setTimeout(()=>setUiLang(s), 0); })();

/* ===== FEATURES 11: colorful animations on the home page ===== */
(function homeFx(){
  const hero = document.querySelector(".hero");
  if(!hero || $("heroFx")) return;
  // moving color blobs + floating icons behind the hero
  hero.insertAdjacentHTML("afterbegin", `<div class="hero-fx" id="heroFx" aria-hidden="true">
    <i class="hb a"></i><i class="hb b"></i><i class="hb c"></i><i class="hb d"></i>
    ${["☕","📚","💼","🗺️","🇰🇷","✨","🎓","💬"].map((e,i)=>`<span class="hf f${i}">${e}</span>`).join("")}
  </div>`);
  // sections slide in when you scroll to them
  document.querySelectorAll("main .sec-head, #tools .tool, #guide .step, #faq details, #employers .wrap > *").forEach((el,i)=>{
    el.classList.add("reveal","fx-up"); el.style.setProperty("--fxd", (i%4)*0.08+"s");
  });
  if(typeof revealOnScroll==="function") revealOnScroll(document.querySelector("main"));
  else document.querySelectorAll("main .reveal").forEach(e=>e.classList.add("in"));
  // category cards pop in one by one (only the first time)
  const cats = $("cats");
  if(cats){ cats.classList.add("fx-first"); setTimeout(()=>cats.classList.remove("fx-first"), 2500); }
  // a little sparkle where you click on the hero
  hero.addEventListener("pointerdown", e=>{
    if(e.target.closest("input,select,button,a,form")) return;
    const r = hero.getBoundingClientRect();
    for(let k=0;k<8;k++){
      const s = document.createElement("i"); s.className = "spark-dot";
      s.style.left = (e.clientX-r.left)+"px"; s.style.top = (e.clientY-r.top)+"px";
      s.style.setProperty("--a", (k*45)+"deg"); s.style.background = ["#ff5a36","#ffb347","#ec4899","#7c3aed","#2f5bea","#0f9d8a"][k%6];
      hero.append(s); setTimeout(()=>s.remove(), 700);
    }
  });
})();

/* ===== P9: "🛡️ Admin" in the user menu (only for admins; the admin API checks the database itself) ===== */
const _renderAuthAdm = renderAuth;
renderAuth = function(){
  _renderAuthAdm();
  const menu = $("userMenu");
  if(!menu || !(backend.user && backend.user.isAdmin) || $("menuAdmin")) return;
  menu.querySelector('[data-act="logout"]').insertAdjacentHTML("beforebegin", `<a id="menuAdmin" class="menu-link" href="/admin.html">🛡️ ${L("Admin","관리자")}</a>`);
};
// an admin blocked this account while it was open
window.addEventListener("wah-kicked", ()=>toast(L("Your account was blocked by an admin. Check your email.","관리자가 계정을 차단했어요. 이메일을 확인해 주세요.")));

/* ===== P13: installable app (PWA) — service worker, "Install app", "new version" banner ===== */
const PWA = { prompt: null, reg: null, userReload: false };
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isIOSSafari = () => isIOS() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
// Chrome/Edge/Android: we have the browser's install prompt · iPhone/iPad Safari: we can only explain the steps
const installOffer = () => isStandalone() ? null : PWA.prompt ? "prompt" : isIOSSafari() ? "ios" : null;
const installLabel = () => `📲 ${L("Install app","앱 설치")}`;

function iosInstallTip(){
  openModal(`<div class="ios-tip"><div class="ios-tip-icon"><img src="/icons/apple-touch-icon.png" alt="" width="64" height="64"></div>
    <h3>${L("Add Work Abroad Hub to your Home Screen","홈 화면에 Work Abroad Hub 추가하기")}</h3>
    <ol>
      <li>${L("Tap the <b>Share</b> button <span class='ios-share' aria-hidden='true'>⬆︎</span> at the bottom of Safari.","Safari 아래쪽의 <b>공유</b> 버튼 <span class='ios-share' aria-hidden='true'>⬆︎</span>을 누르세요.")}</li>
      <li>${L("Scroll down and tap <b>Add to Home Screen</b>.","아래로 내려 <b>홈 화면에 추가</b>를 누르세요.")}</li>
      <li>${L("Tap <b>Add</b>. The app opens full-screen from your Home Screen.","<b>추가</b>를 누르면 홈 화면에서 전체 화면 앱으로 열려요.")}</li>
    </ol></div>`);
}
async function installApp(){
  if(PWA.prompt){
    const p = PWA.prompt; PWA.prompt = null;
    p.prompt();
    const { outcome } = await p.userChoice.catch(()=>({}));
    if(outcome==="accepted") toast(L("Installing Work Abroad Hub…","Work Abroad Hub 설치 중…"));
    refreshInstallUI();
  } else if(isIOSSafari()) iosInstallTip();
}
function refreshInstallUI(){
  const offer = installOffer();
  // footer
  const col = document.querySelector("footer .foot > div");
  let fb = $("footInstall");
  if(col && !fb){ col.insertAdjacentHTML("beforeend", `<button type="button" class="install-btn" id="footInstall" hidden></button>`); fb = $("footInstall"); fb.onclick = installApp; }
  if(fb){ fb.hidden = !offer; fb.textContent = installLabel(); }
  // user menu (only exists when logged in)
  const menu = $("userMenu"), mb = $("menuInstall");
  if(menu && offer && !mb){
    menu.querySelector('[data-act="logout"]').insertAdjacentHTML("beforebegin", `<button id="menuInstall">${installLabel()}</button>`);
    $("menuInstall").onclick = ()=>{ menu.classList.remove("open"); installApp(); };
  } else if(mb && !offer) mb.remove();
}
const _renderAuthPWA = renderAuth;
renderAuth = function(){ _renderAuthPWA(); refreshInstallUI(); };
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); PWA.prompt = e; refreshInstallUI(); });
window.addEventListener("appinstalled", () => { PWA.prompt = null; refreshInstallUI(); toast(L("Installed! Open it from your apps.","설치 완료! 앱 목록에서 열어 보세요.")); });

function showUpdateBanner(){
  if($("swUpdate")) return;
  document.body.insertAdjacentHTML("beforeend", `<div class="sw-update" id="swUpdate" role="status">
    <span>✨ ${L("A new version is available","새 버전이 있어요")}</span>
    <button type="button" class="sw-reload" id="swReload">${L("Reload","새로고침")}</button>
    <button type="button" class="sw-x" id="swLater" aria-label="${L("Later","나중에")}">✕</button></div>`);
  $("swReload").onclick = ()=>{
    PWA.userReload = true;
    const w = PWA.reg && PWA.reg.waiting;
    if(w) w.postMessage({ type: "SKIP_WAITING" }); else location.reload();   // the new worker takes over → controllerchange → reload
  };
  $("swLater").onclick = ()=> $("swUpdate").remove();
}
if("serviceWorker" in navigator && (location.protocol==="https:" || ["localhost","127.0.0.1"].includes(location.hostname))){
  navigator.serviceWorker.addEventListener("controllerchange", ()=>{ if(PWA.userReload){ PWA.userReload=false; location.reload(); } });
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("/sw.js").then(reg=>{
      if(!reg) return;                                                                      // blocked (e.g. some privacy modes)
      PWA.reg = reg;
      if(reg.waiting && navigator.serviceWorker.controller) showUpdateBanner();          // already downloaded earlier
      reg.addEventListener("updatefound", ()=>{
        const w = reg.installing; if(!w) return;
        w.addEventListener("statechange", ()=>{ if(w.state==="installed" && navigator.serviceWorker.controller) showUpdateBanner(); });
      });
      setInterval(()=>reg.update().catch(()=>{}), 60*60*1000);                           // tabs left open for hours
    }).catch(err=>console.warn("service worker not registered:", err));
  });
}
refreshInstallUI();

/* =====================================================================
   Real email + real phone at sign-up
   • email: checked live with the server (format, typos like gmial.com, temporary inboxes,
     domain that can't receive mail), then the person proves they own the inbox with a
     6-digit code (or the link) from the "Confirm your email" email. Until then the server
     refuses posting, applying and chatting, and a banner reminds them.
   • phone (students): Korean mobile only, 010-XXXX-XXXX, typed dashes added automatically.
   ===================================================================== */
const emailCheckCache = new Map();
async function serverEmailProblem(email){
  if(backend.mode!=="firebase" || !window.wahAuth || !window.wahAuth.checkEmail) return "";
  const key=email.trim().toLowerCase();
  if(!emailCheckCache.has(key)) emailCheckCache.set(key, window.wahAuth.checkEmail(key));
  return emailCheckCache.get(key);
}
function wireEmailCheck(form){
  const el=form && form.elements.email; if(!el || el.readOnly) return;
  el.addEventListener("blur", async ()=>{
    const val=el.value.trim(); if(!val) return;
    if(!EMAIL_RE.test(val)){ fieldErr(form,"email",L("Please enter a valid email.","올바른 이메일을 입력해 주세요.")); return; }
    const msg = await serverEmailProblem(val);
    if(el.value.trim()===val) fieldErr(form,"email", msg ? "⚠️ "+msg : "");
  });
  el.addEventListener("input", ()=>fieldErr(form,"email",""));
}
// before creating the account: stop here if the server already knows the address is fake
async function emailLooksReal(form){
  const el=form.elements.email; if(!el || el.readOnly) return true;
  const msg = await serverEmailProblem(el.value);
  return fieldErr(form,"email", msg ? "⚠️ "+msg : "");
}
function formatMobile(raw){
  const d=String(raw).replace(/\D/g,"").slice(0,11);
  return d.length<4 ? d : d.length<8 ? `${d.slice(0,3)}-${d.slice(3)}` : `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}
function wireMobileFormat(form){
  const el=form && form.elements.phone; if(!el) return;
  if(el.value) el.value=formatMobile(el.value);
  el.addEventListener("input", ()=>{
    el.value=formatMobile(el.value);
    const d=el.value.replace(/\D/g,"");
    const wrong = d.length>=3 && !d.startsWith("010");
    fieldErr(form,"phone", wrong ? L("Korean mobile numbers start with 010.","휴대폰 번호는 010으로 시작해요.") : "");
  });
  el.addEventListener("blur", ()=>{ if(el.value && !PHONE_RE.test(el.value)) fieldErr(form,"phone",L("Please enter a Korean mobile number that starts with 010 (010-1234-5678).","010으로 시작하는 휴대폰 번호를 입력해 주세요 (010-1234-5678).")); });
}

const needsEmailCode = () => backend.mode==="firebase" && backend.user && backend.user.emailVerified===false && account && !account.pending;
function askEmailCode(){
  if(!needsEmailCode()) return;
  const email=backend.user.email||"";
  openModal(`<div class="vcode">
    <div class="vcode-ic">✉️</div>
    <h3>${L("Confirm your email","이메일 인증")}</h3>
    <p>${L("We sent a 6-digit code to","6자리 코드를 보냈어요:")}<br><b>${esc(email)}</b></p>
    <form id="vcForm" novalidate>
      <input id="vcInput" class="vcode-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-label="${L("6-digit code","6자리 코드")}">
      <div class="err" id="vcErr"></div>
      <button class="btn btn-primary" id="vcOk" type="submit">${L("Confirm email","인증하기")}</button>
    </form>
    <div class="vcode-links"><button class="back-link" id="vcResend">${L("Send a new code","새 코드 받기")}</button><span>·</span><button class="back-link" id="vcLater">${L("Later","나중에")}</button></div>
    <small>${L("Can't find it? Check your spam folder. Until you confirm, you can't apply, post jobs or chat.","메일이 없나요? 스팸함을 확인하세요. 인증 전에는 지원, 공고 등록, 채팅을 할 수 없어요.")}</small>
  </div>`,"auth-modal");
  const inp=$("vcInput"), err=$("vcErr");
  const showErr=m=>{ err.textContent=m||""; err.classList.toggle("show",!!m); inp.classList.toggle("bad",!!m); };
  inp.focus();
  inp.oninput=()=>{ inp.value=inp.value.replace(/\D/g,"").slice(0,6); showErr(""); if(inp.value.length===6) $("vcForm").requestSubmit(); };
  $("vcForm").onsubmit=async e=>{
    e.preventDefault();
    if(inp.value.length!==6){ showErr(L("Enter the 6-digit code from the email.","메일의 6자리 코드를 입력하세요.")); return; }
    $("vcOk").disabled=true;
    try{
      await window.wahAuth.verifyCode(inp.value);
      backend.user.emailVerified=true;
      closeModal(); renderAll(); toast("✅ "+L("Email confirmed. You're all set!","이메일 인증 완료!"));
      if(needsPhoneCode()) setTimeout(askPhoneCode, 400);
    }catch(ex){ showErr(ex && ex.message || L("That code didn't work.","코드가 맞지 않아요.")); inp.select(); }
    finally{ const b=$("vcOk"); if(b) b.disabled=false; }
  };
  $("vcResend").onclick=async ()=>{
    const b=$("vcResend"); b.disabled=true;
    try{ const r=await window.wahAuth.resendVerification();
      if(r && r.alreadyVerified){ backend.user.emailVerified=true; closeModal(); renderAll(); toast("✅ "+L("Your email is already confirmed.","이미 인증됐어요.")); return; }
      showErr(""); toast(L("New code sent. Check your inbox.","새 코드를 보냈어요.")); inp.value=""; inp.focus();
    }catch(ex){ showErr(ex && ex.message || L("Couldn't send the email.","메일을 보내지 못했어요.")); }
    finally{ setTimeout(()=>{ const x=$("vcResend"); if(x) x.disabled=false; }, 60000); }
  };
  $("vcLater").onclick=()=>{ closeModal(); renderVerifyBar(); };
}
const digitsOnly = s => String(s||"").replace(/\D/g,"");
const needsPhoneCode = () => backend.mode==="firebase" && backend.user && backend.user.phoneCheck && account && !account.pending
  && account.role==="student" && digitsOnly(account.profile && account.profile.phone) !== (backend.user.phoneVerified||"");
function askPhoneCode(){
  if(!needsPhoneCode()) return;
  const phone=formatMobile((account.profile||{}).phone||"");
  openModal(`<div class="vcode">
    <div class="vcode-ic">📱</div>
    <h3>${L("Confirm your phone","휴대폰 인증")}</h3>
    <p>${L("We'll text a 6-digit code to","6자리 코드를 문자로 보낼게요:")}<br><b>${esc(phone)}</b></p>
    <button class="btn btn-primary" id="pcSend" type="button">${L("Text me a code","코드 받기")}</button>
    <form id="pcForm" novalidate style="display:none">
      <input id="pcInput" class="vcode-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-label="${L("6-digit code","6자리 코드")}">
      <div class="err" id="pcErr"></div>
      <button class="btn btn-primary" id="pcOk" type="submit">${L("Confirm phone","인증하기")}</button>
    </form>
    <div class="vcode-links"><button class="back-link" id="pcEdit">${L("Wrong number? Edit profile","번호가 틀렸나요? 프로필 수정")}</button><span>·</span><button class="back-link" id="pcLater">${L("Later","나중에")}</button></div>
    <small>${L("Employers call this number about your applications. You can apply once it's confirmed.","기업이 지원 관련해 이 번호로 연락해요. 인증 후 지원할 수 있어요.")}</small>
  </div>`,"auth-modal");
  const form=$("pcForm"), inp=$("pcInput"), err=$("pcErr");
  const showErr=m=>{ err.textContent=m||""; err.classList.toggle("show",!!m); inp.classList.toggle("bad",!!m); };
  $("pcSend").onclick=async ()=>{
    const b=$("pcSend"); b.disabled=true;
    try{
      const r=await window.wahAuth.sendPhoneCode();
      if(r && r.alreadyVerified){ backend.user.phoneVerified=digitsOnly(phone); closeModal(); renderAll(); toast("✅ "+L("Phone already confirmed.","이미 인증됐어요.")); return; }
      form.style.display=""; b.textContent=L("Send a new code","새 코드 받기"); inp.focus();
      toast(L("Code sent by text message.","문자로 코드를 보냈어요."));
    }catch(ex){ form.style.display=""; showErr(ex && ex.message || L("Couldn't send the text.","문자를 보내지 못했어요.")); }
    finally{ setTimeout(()=>{ const x=$("pcSend"); if(x) x.disabled=false; }, 60000); }
  };
  inp.oninput=()=>{ inp.value=inp.value.replace(/\D/g,"").slice(0,6); showErr(""); if(inp.value.length===6) form.requestSubmit(); };
  form.onsubmit=async e=>{
    e.preventDefault();
    if(inp.value.length!==6){ showErr(L("Enter the 6-digit code from the text message.","문자의 6자리 코드를 입력하세요.")); return; }
    $("pcOk").disabled=true;
    try{ const r=await window.wahAuth.verifyPhoneCode(inp.value);
      backend.user.phoneVerified=(r&&r.phoneVerified)||digitsOnly(phone);
      closeModal(); renderAll(); toast("✅ "+L("Phone confirmed!","휴대폰 인증 완료!"));
    }catch(ex){ showErr(ex && ex.message || L("That code didn't work.","코드가 맞지 않아요.")); inp.select(); }
    finally{ const b=$("pcOk"); if(b) b.disabled=false; }
  };
  $("pcEdit").onclick=()=>{ closeModal(); studentForm(); };
  $("pcLater").onclick=()=>{ closeModal(); renderVerifyBar(); };
}
function renderVerifyBar(){
  let bar=$("verifyBar");
  const email=needsEmailCode(), phone=!email && needsPhoneCode();
  if(!email && !phone){ if(bar) bar.remove(); return; }
  if(!bar){
    bar=document.createElement("div"); bar.id="verifyBar"; bar.setAttribute("role","status");
    document.body.prepend(bar);
  }
  bar.innerHTML = email
    ? `<span>⚠️ ${L("Confirm your email","이메일을 인증하세요")} <b>${esc(backend.user.email||"")}</b>. ${L("Until then you can't apply, post jobs or chat.","인증 전에는 지원·공고 등록·채팅이 안 돼요.")}</span><button class="btn btn-sm btn-primary" id="vbOpen">${L("Enter code","코드 입력")}</button>`
    : `<span>📱 ${L("Confirm your phone","휴대폰을 인증하세요")} <b>${esc(formatMobile((account.profile||{}).phone||""))}</b> ${L("to apply for jobs.","인증 후 지원할 수 있어요.")}</span><button class="btn btn-sm btn-primary" id="vbOpen">${L("Confirm phone","휴대폰 인증")}</button>`;
  $("vbOpen").onclick = email ? askEmailCode : askPhoneCode;
}
window.addEventListener("wah-user-refreshed", ()=>{ renderVerifyBar(); if(!needsEmailCode() && $("vcInput")) closeModal(); });
const _renderAllVB = renderAll;
renderAll = function(){ _renderAllVB(); renderVerifyBar(); };
// the email's one-click link lands on /?verified=1 (or =expired)
(()=>{ const q=new URLSearchParams(location.search), v=q.get("verified"); if(!v) return;
  q.delete("verified"); history.replaceState(null,"",location.pathname+(q.toString()?"?"+q:"")+location.hash);
  setTimeout(()=>toast(v==="1" ? "✅ "+L("Email confirmed. You're all set!","이메일 인증 완료!") : L("That link has expired. Log in and press \"Send a new code\".","링크가 만료됐어요. 로그인 후 새 코드를 받으세요.")), 600);
})();

persist(); payLabel(); renderAll(); calcHours(); calcPay();
initBackend().then(()=>{
  if(location.hash!=="#dashboard") return;
  // the account (and its role) arrives a moment after start-up: wait for it, up to 10 seconds
  let n=0; const t=setInterval(()=>{
    const ready = backend.mode!=="loading" && account && account.loggedIn && account.role;
    if(!ready && ++n<50) return;
    clearInterval(t);
    if(location.hash==="#dashboard" && account && account.loggedIn && account.role==="employer") showView("dashboard");
  },200);
});

/* ===== FIX: "Message employer" always opens the chat ===== */
startChat = async function({employerUid, studentUid, employerName, studentName, jobTitle}){
  console.log("[chat] start", {employerUid, studentUid, mode: backend.mode});
  if(backend.mode !== "firebase"){ toast(L("Still connecting to the server — try again in a moment.","서버에 연결 중이에요. 잠시 후 다시 시도하세요.")); return; }
  if(!chatOn()){ closeModal(); openAuth("login"); return; }
  if(!employerUid || !studentUid){ toast(L("This job isn't linked to an employer account.","이 공고는 기업 계정과 연결되어 있지 않아요.")); return; }
  if(employerUid === studentUid){ toast(L("You can't message yourself.","자기 자신에게는 메시지를 보낼 수 없어요.")); return; }
  const id = chatIdOf(employerUid, studentUid), F = backend.fb, now = Date.now();
  const data = {employerUid, studentUid, jobTitle: String(jobTitle||"").slice(0,80), updatedAt: now};
  if(employerName) data.employerName = String(employerName).slice(0,60);
  if(studentName)  data.studentName  = String(studentName).slice(0,60);
  try{
    await F.setDoc(F.doc(backend.db, "chats", id), data, {merge:true});
  }catch(e){
    console.error("[chat] start failed", e);
    toast(L("Couldn't open chat: ","채팅을 열 수 없어요: ") + (e && (e.message || e.code) || "unknown error"));
    return;
  }
  closeModal();
  if(typeof ensureChatUI === "function") ensureChatUI();
  const panel = $("chatPanel"); if(panel) panel.style.display = "";
  const c = chat.list.find(x => x.id === id) || {id, ...data};
  openThread(c);
  setTimeout(()=>{ const inp = $("chatInput"); if(inp) inp.focus(); }, 80);
};

document.addEventListener("click", e => {
  const b = e.target.closest("#msgEmployer"); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const m = $("modal");
  const id = (m && m.dataset.jobId) || window.__openJobId;
  const j = JOBS.find(x => String(x.id) === String(id));
  if(!j){ toast(L("Please reopen the job and try again.","공고를 다시 열고 시도하세요.")); return; }
  startChat({employerUid: j.owner, studentUid: backend.uid, employerName: j.co,
             studentName: (account.profile && account.profile.name) || "", jobTitle: j.title});
}, true);

const _openJobFixMsg = openJob;
openJob = function(id){ window.__openJobId = id; _openJobFixMsg(id); const m = $("modal"); if(m) m.dataset.jobId = id; };
