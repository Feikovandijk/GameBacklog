// KanbanPage — polished board
function KanbanPage() {
  const COLUMNS = [
    { id:'want_to_play',      title:'Backlog',   color:'#00A3FF', icon:'bookmark' },
    { id:'currently_playing', title:'Playing',   color:'#00E5BC', icon:'play_circle' },
    { id:'completed',         title:'Completed', color:'#10B981', icon:'check_circle' },
    { id:'dropped',           title:'Dropped',   color:'#EF4444', icon:'cancel' },
  ];

  const [games, setGames] = React.useState(MOCK_GAMES);
  const [search, setSearch] = React.useState('');
  const [dragOver, setDragOver] = React.useState(null);
  const [dragging, setDragging] = React.useState(null);

  const filtered = search
    ? games.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : games;

  const colGames = id => filtered.filter(g => g.status === id);
  const totalHours = games.reduce((s,g)=>s+(g.hours_played||0),0);
  const playing = games.filter(g=>g.status==='currently_playing').length;

  return React.createElement('div', {
    style:{ margin:'-32px -36px', display:'flex', flexDirection:'column', height:'calc(100vh - 60px)', overflow:'hidden', background:'#070d1a' }
  },
    // Stats bar
    React.createElement('div', {
      style:{ background:'#0a1020', borderBottom:'1px solid #1a2540', padding:'0 24px', height:50, display:'flex', alignItems:'center', gap:0 }
    },
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:6,paddingRight:24,borderRight:'1px solid #1a2540',marginRight:24}},
        React.createElement(LogoMark,{size:22}),
        React.createElement('span',{style:{fontSize:13,fontWeight:700,color:'#e2eaf4',letterSpacing:'-0.01em'}}),'Board'
      ),
      [
        ['sports_esports', `${games.length} tracked`, '#94A3B8'],
        ['timer', `${totalHours}h total`, '#94A3B8'],
        ['play_circle', `${playing} playing`, '#00E5BC'],
      ].map(([icon,label,color]) =>
        React.createElement('div',{key:label,style:{display:'flex',alignItems:'center',gap:5,marginRight:20,fontSize:12,fontWeight:600,color}},
          React.createElement(Icon,{name:icon,size:14,style:{color}}), label
        )
      ),
      React.createElement('div',{style:{marginLeft:'auto',display:'flex',gap:10,alignItems:'center'}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:7,background:'rgba(14,22,40,0.8)',border:'1px solid #1e2d47',borderRadius:9,padding:'0 10px',height:32}},
          React.createElement(Icon,{name:'search',size:14,style:{color:'#607896'}}),
          React.createElement('input',{placeholder:'Filter...',value:search,onChange:e=>setSearch(e.target.value),style:{background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:12,width:140,fontFamily:"'Manrope',sans-serif"}})
        ),
        React.createElement('button',{
          style:{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:9,background:'#00E5BC',color:'#0B1121',fontSize:12,fontWeight:800,border:'none',cursor:'pointer',fontFamily:"'Manrope',sans-serif",boxShadow:'0 2px 12px rgba(0,229,188,0.3)'}
        }, React.createElement(Icon,{name:'add',size:14}), 'Add Game')
      )
    ),

    // Board columns
    React.createElement('div', {
      style:{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'20px 20px 0', display:'flex', gap:14 }
    },
      COLUMNS.map(col => {
        const cGames = colGames(col.id);
        const isDragTarget = dragOver === col.id;
        return React.createElement('div', {
          key:col.id,
          style:{
            width:270, flexShrink:0, display:'flex', flexDirection:'column',
            background: isDragTarget ? `${col.color}08` : 'rgba(14,22,40,0.6)',
            borderRadius:16, border:`1px solid ${isDragTarget ? col.color+'40' : '#1a2540'}`,
            transition:'all 160ms', overflow:'hidden',
          },
          onDragOver:e=>{e.preventDefault();setDragOver(col.id);},
          onDragLeave:()=>setDragOver(null),
          onDrop:e=>{
            e.preventDefault();setDragOver(null);setDragging(null);
            const gameId=e.dataTransfer.getData('gameId');
            setGames(prev=>prev.map(g=>g.id===gameId?{...g,status:col.id}:g));
          }
        },
          // Column header
          React.createElement('div', {
            style:{ padding:'14px 16px 12px', borderBottom:'1px solid #1a2540', background:'rgba(7,13,26,0.4)' }
          },
            React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between' } },
              React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:9 } },
                React.createElement('div', { style:{ width:8, height:8, borderRadius:'50%', background:col.color, boxShadow:`0 0 8px ${col.color}80` } }),
                React.createElement('span', { style:{ fontSize:13, fontWeight:700, color:'#e2eaf4', letterSpacing:'-0.01em' } }, col.title),
                React.createElement('span', {
                  style:{ fontSize:11, fontWeight:700, color:col.color, background:`${col.color}15`, borderRadius:9999, padding:'1px 8px', minWidth:20, textAlign:'center' }
                }, cGames.length)
              ),
              React.createElement('button',{style:{background:'none',border:'none',cursor:'pointer',color:'#607896',display:'flex',alignItems:'center',padding:'2px',borderRadius:6,transition:'all 150ms'},
                onMouseEnter:e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='#c8d8e8';},
                onMouseLeave:e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#607896';},
              }, React.createElement(Icon,{name:'more_horiz',size:17}))
            )
          ),

          // Cards scroll area
          React.createElement('div', {
            style:{ flex:1, overflowY:'auto', padding:'10px 10px 16px', display:'flex', flexDirection:'column', gap:8 }
          },
            cGames.length === 0
              ? React.createElement('div',{
                  style:{textAlign:'center',padding:'28px 12px',color:'rgba(148,163,184,0.25)',fontSize:12,border:`2px dashed rgba(42,53,80,0.4)`,borderRadius:12,margin:'6px 2px',display:'flex',flexDirection:'column',alignItems:'center',gap:8},
                },
                  React.createElement(Icon,{name:col.icon,size:24,style:{color:`${col.color}25`}}),
                  `Drop games here`
                )
              : cGames.map(game => {
                  const grad = GRADIENTS[game.steam_appid % GRADIENTS.length];
                  const isDraggingThis = dragging === game.id;
                  return React.createElement('div',{
                    key:game.id,
                    draggable:true,
                    onDragStart:e=>{e.dataTransfer.setData('gameId',game.id);setDragging(game.id);},
                    onDragEnd:()=>setDragging(null),
                    style:{
                      background:'#0e1628', border:'1px solid #1e2d47', borderRadius:12,
                      overflow:'hidden', cursor:'grab',
                      opacity: isDraggingThis ? 0.4 : 1,
                      transition:'all 150ms',
                    },
                    onMouseEnter:e=>{ if(!isDraggingThis){ e.currentTarget.style.borderColor=col.color+'40'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 4px 16px rgba(0,0,0,0.4)`; } },
                    onMouseLeave:e=>{ e.currentTarget.style.borderColor='#1e2d47'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; },
                  },
                    // Game thumbnail
                    React.createElement('div',{style:{height:72,background:grad,position:'relative',overflow:'hidden'}},
                      React.createElement('img',{src:`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`,style:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transition:'transform 300ms'},onError:e=>e.target.style.display='none'}),
                      React.createElement('div',{style:{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(14,22,40,0.9) 0%,transparent 60%)'}}),
                      game.is_favorite && React.createElement('div',{style:{position:'absolute',top:6,right:6}},React.createElement(Icon,{name:'star',size:13,style:{color:'#EAB308',filter:'drop-shadow(0 0 3px rgba(234,179,8,0.7))'}}))
                    ),
                    React.createElement('div',{style:{padding:'9px 11px 11px'}},
                      React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'#e2eaf4',marginBottom:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}),game.name,
                      React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: game.completion_percentage>0 ? 7 : 0}},
                        React.createElement('span',{style:{fontSize:10,color:'#607896',fontWeight:500}}),game.hours_played?`${game.hours_played}h played`:'Not started',
                        React.createElement('div',{style:{display:'flex',gap:4}}),
                        game.genres?.slice(0,1).map(g=>React.createElement('span',{key:g,style:{fontSize:9,color:'#607896',background:'rgba(148,163,184,0.07)',padding:'1px 6px',borderRadius:4,fontWeight:600,letterSpacing:'0.02em'}}),g)
                      ),
                      game.completion_percentage > 0 && React.createElement('div',null,
                        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:4}},
                          React.createElement('div',{style:{height:2,flex:1,background:'rgba(42,53,80,0.6)',borderRadius:9999,overflow:'hidden',marginTop:3}},
                            React.createElement('div',{style:{height:'100%',width:`${game.completion_percentage}%`,background:`linear-gradient(90deg,${col.color},${col.color}aa)`,borderRadius:9999}})
                          ),
                          React.createElement('span',{style:{fontSize:10,fontWeight:800,color:col.color,marginLeft:8,fontFamily:'monospace'}}),`${game.completion_percentage}%`
                        )
                      )
                    )
                  );
                })
          )
        );
      })
    )
  );
}

Object.assign(window, { KanbanPage });
