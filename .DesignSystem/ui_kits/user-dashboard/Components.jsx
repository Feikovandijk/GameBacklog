// GameBacklog Design System — Shared Components v2 (polished)

const MOCK_GAMES = [
  { id:'1',  steam_appid:1245620, name:'Elden Ring',            status:'currently_playing', hours_played:142, completion_percentage:67,  genres:['Action','RPG'],           added_at:'2024-01-15', updated_at:'2024-04-20', is_favorite:true },
  { id:'2',  steam_appid:367520,  name:'Hollow Knight',         status:'completed',         hours_played:41,  completion_percentage:100, genres:['Metroidvania','Indie'],    added_at:'2024-02-01', updated_at:'2024-03-10', is_favorite:false },
  { id:'3',  steam_appid:1086940, name:"Baldur's Gate 3",       status:'want_to_play',      hours_played:0,   completion_percentage:0,   genres:['RPG','Strategy'],         added_at:'2024-03-05', updated_at:'2024-03-05', is_favorite:false },
  { id:'4',  steam_appid:1091500, name:'Cyberpunk 2077',        status:'on_hold',           hours_played:55,  completion_percentage:30,  genres:['Action','RPG'],           added_at:'2024-01-20', updated_at:'2024-04-01', is_favorite:false },
  { id:'5',  steam_appid:1145360, name:'Hades',                 status:'completed',         hours_played:88,  completion_percentage:100, genres:['Roguelike','Action'],     added_at:'2024-02-15', updated_at:'2024-03-20', is_favorite:true },
  { id:'6',  steam_appid:292030,  name:'The Witcher 3',         status:'dropped',           hours_played:22,  completion_percentage:15,  genres:['RPG','Open World'],       added_at:'2024-01-10', updated_at:'2024-02-10', is_favorite:false },
  { id:'7',  steam_appid:814380,  name:'Sekiro',                status:'want_to_play',      hours_played:0,   completion_percentage:0,   genres:['Action','Soulslike'],     added_at:'2024-03-18', updated_at:'2024-03-18', is_favorite:false },
  { id:'8',  steam_appid:570,     name:'Dota 2',                status:'currently_playing', hours_played:320, completion_percentage:0,   genres:['MOBA','Strategy'],        added_at:'2023-12-01', updated_at:'2024-04-21', is_favorite:false },
  { id:'9',  steam_appid:526870,  name:'Satisfactory',         status:'on_hold',           hours_played:67,  completion_percentage:40,  genres:['Simulation','Building'],  added_at:'2024-02-20', updated_at:'2024-04-05', is_favorite:true },
  { id:'10', steam_appid:1174180, name:'Red Dead Redemption 2', status:'want_to_play',      hours_played:0,   completion_percentage:0,   genres:['Action','Open World'],    added_at:'2024-04-01', updated_at:'2024-04-01', is_favorite:false },
  { id:'11', steam_appid:1817190, name:'Lies of P',             status:'completed',         hours_played:34,  completion_percentage:100, genres:['Soulslike','Action'],     added_at:'2024-03-01', updated_at:'2024-04-10', is_favorite:false },
  { id:'12', steam_appid:646570,  name:'Slay the Spire',        status:'currently_playing', hours_played:210, completion_percentage:55,  genres:['Roguelike','Card Game'],  added_at:'2024-01-05', updated_at:'2024-04-19', is_favorite:true },
];

const STATUS_CONFIG = {
  currently_playing: { label:'Playing',     color:'#00E5BC', bg:'rgba(0,229,188,0.15)' },
  completed:         { label:'Completed',   color:'#10B981', bg:'rgba(16,185,129,0.15)' },
  completed_100:     { label:'100%',        color:'#a78bfa', bg:'rgba(139,92,246,0.18)' },
  want_to_play:      { label:'Want to Play',color:'#00A3FF', bg:'rgba(0,163,255,0.15)' },
  on_hold:           { label:'On Hold',     color:'#EAB308', bg:'rgba(234,179,8,0.15)' },
  dropped:           { label:'Dropped',     color:'#EF4444', bg:'rgba(239,68,68,0.15)' },
  unplayed:          { label:'Unplayed',    color:'#94A3B8', bg:'rgba(148,163,184,0.1)' },
  analysis_needed:   { label:'Analysis',   color:'#8B5CF6', bg:'rgba(139,92,246,0.18)' },
};

const GRADIENTS = [
  'linear-gradient(160deg,#1e1b4b 0%,#4c1d95 100%)',
  'linear-gradient(160deg,#0c1445 0%,#1e3a5f 100%)',
  'linear-gradient(160deg,#052e16 0%,#134e4a 100%)',
  'linear-gradient(160deg,#1c1917 0%,#44403c 100%)',
  'linear-gradient(160deg,#450a0a 0%,#7f1d1d 100%)',
  'linear-gradient(160deg,#1e1b4b 0%,#4a044e 100%)',
  'linear-gradient(160deg,#0c4a6e 0%,#164e63 100%)',
  'linear-gradient(160deg,#422006 0%,#78350f 100%)',
];

// ── Logo Mark ────────────────────────────────────────────
function LogoMark({ size = 32 }) {
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 40 40', fill: 'none',
    style: { flexShrink: 0 }
  },
    React.createElement('rect', { width:40, height:40, rx:10, fill:'#00E5BC' }),
    React.createElement('path', {
      d:'M7 17.5C7 14.5 9.5 12 12.5 12H27.5C30.5 12 33 14.5 33 17.5V22C33 25.5 30 27.5 27.5 27.5L24 27.5L22 30H18L16 27.5L12.5 27.5C9.5 27.5 7 25.5 7 22V17.5Z',
      fill:'#0B1121'
    }),
    React.createElement('rect', { x:11, y:18.5, width:2, height:6, rx:1, fill:'#00E5BC' }),
    React.createElement('rect', { x:9,  y:20.5, width:6, height:2, rx:1, fill:'#00E5BC' }),
    React.createElement('circle', { cx:27, cy:18,   r:1.8, fill:'#8B5CF6' }),
    React.createElement('circle', { cx:30, cy:20.5, r:1.8, fill:'#00A3FF' }),
    React.createElement('circle', { cx:27, cy:23,   r:1.8, fill:'#10B981' }),
    React.createElement('circle', { cx:24, cy:20.5, r:1.8, fill:'#EF4444' }),
  );
}

// ── Icon ──────────────────────────────────────────────────
function Icon({ name, size = 20, style = {} }) {
  return React.createElement('span', {
    className: 'material-symbols-outlined',
    style: { fontSize: size, lineHeight: 1, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, ...style }
  }, name);
}

// ── StatusBadge ───────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unplayed;
  return React.createElement('span', {
    style: {
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:9999,
      fontSize:11, fontWeight:700,
      color: cfg.color, background: cfg.bg,
      letterSpacing:'0.01em',
    }
  },
    React.createElement('span', { style:{ width:5, height:5, borderRadius:'50%', background:cfg.color, flexShrink:0 } }),
    cfg.label
  );
}

// ── StatCard ──────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  const [hov, setHov] = React.useState(false);
  return React.createElement('div', {
    style:{
      background:'#161E32',
      border:`1px solid ${hov ? color+'40' : '#2A3550'}`,
      borderRadius:18, padding:'22px 24px',
      display:'flex', alignItems:'center', gap:16, flex:1,
      transition:'border-color 200ms, box-shadow 200ms',
      boxShadow: hov ? `0 0 24px ${color}18` : 'none',
      cursor:'default',
    },
    onMouseEnter:()=>setHov(true),
    onMouseLeave:()=>setHov(false),
  },
    React.createElement('div', {
      style:{ width:48, height:48, borderRadius:14, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`inset 0 1px 0 ${color}20` }
    }, React.createElement(Icon, { name:icon, size:26, style:{ color } })),
    React.createElement('div', null,
      React.createElement('div', { style:{ fontSize:12, color:'#94A3B8', fontWeight:500, marginBottom:3, letterSpacing:'0.01em' } }, label),
      React.createElement('div', { style:{ fontSize:30, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1 } }, value)
    )
  );
}

// ── GameCard (cinematic) ──────────────────────────────────
function GameCard({ game, onClick }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const [hov, setHov] = React.useState(false);
  const grad = GRADIENTS[game.steam_appid % GRADIENTS.length];
  const cfg = STATUS_CONFIG[game.status] || STATUS_CONFIG.unplayed;

  return React.createElement('div', {
    onClick,
    onMouseEnter:()=>setHov(true),
    onMouseLeave:()=>setHov(false),
    style:{
      background:'#161E32',
      border:`1px solid ${hov?'rgba(0,229,188,0.35)':'#2A3550'}`,
      borderRadius:16, overflow:'hidden', cursor:'pointer',
      transition:'all 180ms',
      transform: hov ? 'translateY(-3px)' : 'none',
      boxShadow: hov ? '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,188,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
    }
  },
    // Thumbnail — cinematic, gradient bottom overlay
    React.createElement('div', { style:{ height:140, background:grad, position:'relative', overflow:'hidden' } },
      !imgFailed && React.createElement('img', {
        src:`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`,
        style:{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'transform 300ms', transform: hov?'scale(1.06)':'scale(1)' },
        onError:()=>setImgFailed(true),
      }),
      // Dark gradient overlay — bottom fade
      React.createElement('div', { style:{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(22,30,50,0.95) 0%, rgba(22,30,50,0.3) 50%, transparent 100%)' } }),
      // Status badge — top right
      React.createElement('div', { style:{ position:'absolute', top:10, right:10 } },
        React.createElement('span', {
          style:{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', color:cfg.color, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, border:`1px solid ${cfg.color}30`, letterSpacing:'0.03em' }
        }, cfg.label)
      ),
      // Favorite star
      game.is_favorite && React.createElement('div', { style:{ position:'absolute', top:10, left:10 } },
        React.createElement(Icon, { name:'star', size:16, style:{ color:'#EAB308', filter:'drop-shadow(0 0 4px rgba(234,179,8,0.6))' } })
      ),
      // Title on image bottom
      React.createElement('div', { style:{ position:'absolute', bottom:10, left:14, right:14 } },
        React.createElement('div', { style:{ fontSize:14, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textShadow:'0 1px 4px rgba(0,0,0,0.8)' } }, game.name)
      )
    ),
    // Bottom info strip
    React.createElement('div', { style:{ padding:'12px 14px 14px' } },
      React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: game.completion_percentage>0 ? 10 : 0 } },
        React.createElement('div', { style:{ display:'flex', gap:6, flexWrap:'wrap' } },
          game.genres?.slice(0,2).map(g =>
            React.createElement('span', { key:g, style:{ fontSize:10, fontWeight:600, color:'#94A3B8', background:'rgba(148,163,184,0.08)', padding:'2px 7px', borderRadius:4, letterSpacing:'0.02em' } }, g)
          )
        ),
        game.hours_played > 0 && React.createElement('span', { style:{ fontSize:11, color:'#94A3B8', fontFamily:'monospace', fontWeight:600, flexShrink:0 } }, `${game.hours_played}h`)
      ),
      game.completion_percentage > 0 && React.createElement('div', null,
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 } },
          React.createElement('span', { style:{ fontSize:10, color:'rgba(148,163,184,0.6)', fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase' } }, 'Progress'),
          React.createElement('span', { style:{ fontSize:11, fontWeight:800, color:'#00E5BC' } }, `${game.completion_percentage}%`)
        ),
        React.createElement('div', { style:{ height:3, background:'rgba(42,53,80,0.8)', borderRadius:9999, overflow:'hidden' } },
          React.createElement('div', { style:{ height:'100%', width:`${game.completion_percentage}%`, background:'linear-gradient(90deg,#00E5BC,#00A3FF)', borderRadius:9999, boxShadow:'0 0 8px rgba(0,229,188,0.5)' } })
        )
      )
    )
  );
}

// ── AppLayout ─────────────────────────────────────────────
function AppLayout({ currentPage, onNav, children }) {
  const navItems = [
    { id:'dashboard', label:'Dashboard', icon:'dashboard' },
    { id:'library',   label:'Library',   icon:'library_books' },
    { id:'board',     label:'Board',     icon:'view_kanban' },
    { id:'trends',    label:'Trends',    icon:'trending_up' },
    { id:'analysis',  label:'Analysis',  icon:'analytics' },
  ];

  return React.createElement('div', {
    style:{ display:'flex', minHeight:'100vh', background:'#0B1121', fontFamily:"'Manrope',sans-serif", color:'#fff' }
  },
    // Sidebar
    React.createElement('aside', {
      style:{ width:240, background:'#0e1628', borderRight:'1px solid #1e2d47', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, height:'100vh', zIndex:50 }
    },
      // Logo area with subtle radial glow
      React.createElement('div', { style:{ height:72, display:'flex', alignItems:'center', gap:12, padding:'0 22px', borderBottom:'1px solid #1e2d47', position:'relative', overflow:'hidden' } },
        React.createElement('div', { style:{ position:'absolute', top:-20, left:-20, width:100, height:100, background:'radial-gradient(circle, rgba(0,229,188,0.12) 0%, transparent 70%)', pointerEvents:'none' } }),
        React.createElement(LogoMark, { size:32 }),
        React.createElement('div', null,
          React.createElement('div', { style:{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1 } }, 'DevTracker'),
          React.createElement('div', { style:{ fontSize:10, color:'rgba(148,163,184,0.5)', fontWeight:500, letterSpacing:'0.04em', marginTop:2 } }, 'GameBacklog')
        )
      ),
      // Nav
      React.createElement('nav', { style:{ flex:1, padding:'16px 12px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' } },
        navItems.map(item => {
          const active = currentPage === item.id;
          return React.createElement('button', {
            key: item.id, onClick: () => onNav(item.id),
            style:{
              display:'flex', alignItems:'center', gap:11, padding:'10px 13px', borderRadius:11,
              background: active ? '#00E5BC' : 'transparent',
              color: active ? '#0B1121' : '#607896',
              fontWeight: active ? 700 : 500, fontSize:13,
              border:'none', cursor:'pointer', textAlign:'left', width:'100%',
              boxShadow: active ? '0 2px 16px rgba(0,229,188,0.25)' : 'none',
              transition:'all 160ms', fontFamily:"'Manrope',sans-serif",
              letterSpacing: active ? '-0.01em' : '0',
            },
            onMouseEnter: e=>{ if(!active){ e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#c8d8e8'; } },
            onMouseLeave: e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#607896'; } },
          },
            React.createElement(Icon, { name:item.icon, size:19, style:{ color: active ? '#0B1121' : 'inherit' } }),
            item.label
          );
        }),
        // Divider + secondary items placeholder
        React.createElement('div', { style:{ height:1, background:'#1e2d47', margin:'12px 4px' } }),
        React.createElement('button', {
          onClick:()=>onNav('profile'),
          style:{ display:'flex', alignItems:'center', gap:11, padding:'10px 13px', borderRadius:11, background:'transparent', color:'#607896', fontWeight:500, fontSize:13, border:'none', cursor:'pointer', textAlign:'left', width:'100%', transition:'all 160ms', fontFamily:"'Manrope',sans-serif" },
          onMouseEnter:e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='#c8d8e8';},
          onMouseLeave:e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#607896';},
        }, React.createElement(Icon,{name:'settings',size:19,style:{color:'inherit'}}), 'Settings')
      ),
      // User section
      React.createElement('div', { style:{ padding:'12px', borderTop:'1px solid #1e2d47' } },
        React.createElement('div', {
          style:{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, cursor:'pointer', transition:'background 150ms', background:'rgba(255,255,255,0.03)' },
          onMouseEnter:e=>e.currentTarget.style.background='rgba(255,255,255,0.06)',
          onMouseLeave:e=>e.currentTarget.style.background='rgba(255,255,255,0.03)',
        },
          React.createElement('div', { style:{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#8B5CF6 0%,#00A3FF 100%)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', boxShadow:'0 2px 8px rgba(139,92,246,0.4)' } }, 'F'),
          React.createElement('div', { style:{ flex:1, minWidth:0 } },
            React.createElement('div', { style:{ fontSize:12, fontWeight:700, color:'#e2eaf4', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, 'Feiko'),
            React.createElement('div', { style:{ fontSize:10, color:'rgba(148,163,184,0.5)', marginTop:1 } }, 'Steam · Connected')
          ),
          React.createElement(Icon,{name:'chevron_right',size:16,style:{color:'rgba(148,163,184,0.4)'}})
        )
      )
    ),
    // Main
    React.createElement('div', { style:{ flex:1, marginLeft:240, display:'flex', flexDirection:'column', minHeight:'100vh' } },
      // Header
      React.createElement('header', {
        style:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:60, borderBottom:'1px solid #1a2540', background:'rgba(11,17,33,0.7)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:40 }
      },
        // Search
        React.createElement('div', {
          style:{ display:'flex', alignItems:'center', gap:9, background:'rgba(14,22,40,0.8)', border:'1px solid #1e2d47', borderRadius:10, padding:'0 12px', height:36, flex:1, maxWidth:360, transition:'border-color 150ms' },
          onFocus:e=>e.currentTarget.style.borderColor='rgba(0,229,188,0.4)',
          onBlur:e=>e.currentTarget.style.borderColor='#1e2d47',
        },
          React.createElement(Icon,{name:'search',size:16,style:{color:'#607896'}}),
          React.createElement('input',{
            placeholder:'Search games...', style:{ background:'transparent', border:'none', outline:'none', color:'#fff', fontSize:13, flex:1, fontFamily:"'Manrope',sans-serif" }
          })
        ),
        React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:10, marginLeft:16 } },
          // Notification bell
          React.createElement('button', {
            style:{ width:36, height:36, borderRadius:'50%', background:'rgba(22,30,50,0.8)', border:'1px solid #1e2d47', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', transition:'border-color 150ms' },
            onMouseEnter:e=>e.currentTarget.style.borderColor='#2A3550',
            onMouseLeave:e=>e.currentTarget.style.borderColor='#1e2d47',
          },
            React.createElement(Icon,{name:'notifications',size:17,style:{color:'#8a9bb0'}}),
            React.createElement('span',{style:{position:'absolute',top:8,right:8,width:7,height:7,background:'#00E5BC',borderRadius:'50%',border:'2px solid #0B1121',boxShadow:'0 0 6px rgba(0,229,188,0.6)'}})
          ),
          // Avatar
          React.createElement('div',{
            style:{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#00A3FF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,cursor:'pointer',border:'2px solid #1e2d47',boxShadow:'0 2px 8px rgba(139,92,246,0.3)',transition:'border-color 150ms'},
            onMouseEnter:e=>e.currentTarget.style.borderColor='rgba(0,229,188,0.5)',
            onMouseLeave:e=>e.currentTarget.style.borderColor='#1e2d47',
          }, 'F')
        )
      ),
      // Content
      React.createElement('main', { style:{ flex:1, padding:'32px 36px' } }, children)
    )
  );
}

Object.assign(window, { MOCK_GAMES, STATUS_CONFIG, GRADIENTS, LogoMark, Icon, StatusBadge, StatCard, GameCard, AppLayout });
