// LibraryPage — polished
function LibraryPage() {
  const [viewMode, setViewMode] = React.useState('grid');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [tab, setTab] = React.useState('all');

  const filtered = MOCK_GAMES.filter(g => {
    if (tab === 'backlog' && !['want_to_play','on_hold'].includes(g.status)) return false;
    if (statusFilter && g.status !== statusFilter) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabBtn = (id, icon, label, count) => {
    const active = tab === id;
    return React.createElement('button', {
      key:id, onClick:()=>setTab(id),
      style:{
        display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:9,
        background: active ? '#00E5BC' : 'transparent',
        color: active ? '#0B1121' : '#607896',
        fontWeight: active ? 700 : 500, fontSize:12, border:'none', cursor:'pointer',
        fontFamily:"'Manrope',sans-serif", transition:'all 150ms', letterSpacing: active?'-0.01em':'0',
      },
      onMouseEnter:e=>{if(!active){e.currentTarget.style.color='#c8d8e8';}},
      onMouseLeave:e=>{if(!active){e.currentTarget.style.color='#607896';}},
    },
      React.createElement(Icon,{name:icon,size:15,style:{color:active?'#0B1121':'inherit'}}),
      label,
      React.createElement('span',{style:{
        fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:9999,
        background:active?'rgba(0,0,0,0.2)':'rgba(148,163,184,0.1)',
        color:active?'#0B1121':'#607896', minWidth:18, textAlign:'center',
      }},count)
    );
  };

  const allCount = MOCK_GAMES.length;
  const backlogCount = MOCK_GAMES.filter(g=>['want_to_play','on_hold'].includes(g.status)).length;

  return React.createElement('div', { style:{ display:'flex', flexDirection:'column' } },
    // Header
    React.createElement('div', { style:{ marginBottom:24 } },
      React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 } },
        React.createElement('div', null,
          React.createElement('div',{style:{fontSize:11,fontWeight:700,color:'rgba(0,229,188,0.6)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:5}},'Collection'),
          React.createElement('h1', { style:{ fontSize:26, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', marginBottom:3 } }, 'My Library'),
          React.createElement('p', { style:{ fontSize:12, color:'#607896' } },
            `${filtered.length} games ${tab==='backlog'?'in your backlog':'in your collection'}`
          )
        ),
        React.createElement('div', { style:{ display:'flex', gap:10 } },
          React.createElement('button', {
            style:{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1px solid #1e2d47', background:'rgba(14,22,40,0.8)', color:'#8a9bb0', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Manrope',sans-serif", transition:'all 150ms' },
            onMouseEnter:e=>{e.currentTarget.style.borderColor='#2A3550';e.currentTarget.style.color='#fff';},
            onMouseLeave:e=>{e.currentTarget.style.borderColor='#1e2d47';e.currentTarget.style.color='#8a9bb0';},
          }, React.createElement(Icon,{name:'sync',size:14,style:{color:'inherit'}}), 'Sync Steam'),
          React.createElement('button', {
            style:{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'#00E5BC', color:'#0B1121', fontSize:12, fontWeight:800, border:'none', cursor:'pointer', fontFamily:"'Manrope',sans-serif", boxShadow:'0 4px 16px rgba(0,229,188,0.3)', transition:'all 150ms' },
            onMouseEnter:e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 24px rgba(0,229,188,0.35)';},
            onMouseLeave:e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,229,188,0.3)';},
          }, React.createElement(Icon,{name:'add',size:14}), 'Add Game')
        )
      ),

      // Tabs + Toolbar row
      React.createElement('div', { style:{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' } },
        React.createElement('div', { style:{ display:'flex', background:'rgba(14,22,40,0.8)', border:'1px solid #1e2d47', borderRadius:12, padding:4, gap:2 } },
          tabBtn('all','library_books','All Games',allCount),
          tabBtn('backlog','bookmark','Backlog',backlogCount)
        ),
        // Spacer
        React.createElement('div', { style:{ flex:1 } }),
        // Search
        React.createElement('div', {
          style:{ display:'flex', alignItems:'center', gap:8, background:'rgba(14,22,40,0.8)', border:'1px solid #1e2d47', borderRadius:10, padding:'0 12px', height:36, width:220, transition:'border-color 150ms' },
          onFocus:e=>e.currentTarget.style.borderColor='rgba(0,229,188,0.3)',
          onBlur:e=>e.currentTarget.style.borderColor='#1e2d47',
        },
          React.createElement(Icon,{name:'search',size:15,style:{color:'#607896'}}),
          React.createElement('input',{
            placeholder:'Search library...', value:search, onChange:e=>setSearch(e.target.value),
            style:{background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:12,flex:1,fontFamily:"'Manrope',sans-serif"}
          })
        ),
        // Filter
        React.createElement('div', { style:{ position:'relative' } },
          React.createElement('select', {
            value:statusFilter, onChange:e=>setStatusFilter(e.target.value),
            style:{padding:'0 30px 0 11px',height:36,background:'rgba(14,22,40,0.8)',border:'1px solid #1e2d47',borderRadius:10,color: statusFilter?'#fff':'#607896',fontSize:12,fontFamily:"'Manrope',sans-serif",appearance:'none',outline:'none',cursor:'pointer',fontWeight:500}
          },
            React.createElement('option',{value:''},'All Statuses'),
            React.createElement('option',{value:'currently_playing'},'Playing'),
            React.createElement('option',{value:'completed'},'Completed'),
            React.createElement('option',{value:'want_to_play'},'Want to Play'),
            React.createElement('option',{value:'on_hold'},'On Hold'),
            React.createElement('option',{value:'dropped'},'Dropped')
          ),
          React.createElement('div',{style:{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}},
            React.createElement(Icon,{name:'expand_more',size:16,style:{color:'#607896'}})
          )
        ),
        // View toggle
        React.createElement('div', { style:{ display:'flex', background:'rgba(14,22,40,0.8)', border:'1px solid #1e2d47', borderRadius:10, padding:3, gap:2 } },
          [['grid','grid_view'],['list','view_list']].map(([id,icon]) => {
            const active = viewMode===id;
            return React.createElement('button',{
              key:id, onClick:()=>setViewMode(id),
              style:{padding:'5px 7px',borderRadius:7,background:active?'#00E5BC':'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 150ms'},
            }, React.createElement(Icon,{name:icon,size:17,style:{color:active?'#0B1121':'#607896'}}));
          })
        )
      )
    ),

    // Game grid
    viewMode === 'grid'
      ? React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 } },
          filtered.map(game => React.createElement(GameCard,{key:game.id,game,onClick:()=>{}}))
        )
      : React.createElement('div', { style:{ background:'#0e1628', border:'1px solid #1e2d47', borderRadius:16, overflow:'hidden' } },
          React.createElement('table', { style:{ width:'100%', borderCollapse:'collapse' } },
            React.createElement('thead',null,
              React.createElement('tr',{ style:{ background:'rgba(7,13,26,0.5)', borderBottom:'1px solid #1a2540' } },
                [['Game','left'],['Status','left'],['Played','left'],['Added','left'],['','right']].map(([h,align],i) =>
                  React.createElement('th',{key:i,style:{padding:'11px 20px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#607896',textAlign:align}},h)
                )
              )
            ),
            React.createElement('tbody',null,
              filtered.map(game => {
                const grad = GRADIENTS[game.steam_appid % GRADIENTS.length];
                return React.createElement('tr',{
                  key:game.id,
                  style:{borderBottom:'1px solid rgba(26,37,64,0.4)',cursor:'pointer',transition:'background 100ms'},
                  onMouseEnter:e=>e.currentTarget.style.background='rgba(255,255,255,0.02)',
                  onMouseLeave:e=>e.currentTarget.style.background='transparent',
                },
                  React.createElement('td',{style:{padding:'11px 20px'}},
                    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12}},
                      React.createElement('div',{style:{width:44,height:44,borderRadius:10,background:grad,overflow:'hidden',flexShrink:0,position:'relative',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}},
                        React.createElement('img',{src:`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`,style:{width:'100%',height:'100%',objectFit:'cover'},onError:e=>e.target.style.display='none'})
                      ),
                      React.createElement('div',null,
                        React.createElement('div',{style:{fontSize:13,fontWeight:700,color:'#e2eaf4'}}),game.name,
                        React.createElement('div',{style:{fontSize:10,color:'#607896',marginTop:2}}),game.genres?.slice(0,2).join(' · ')
                      )
                    )
                  ),
                  React.createElement('td',{style:{padding:'11px 20px'}}), React.createElement(StatusBadge,{status:game.status}),
                  React.createElement('td',{style:{padding:'11px 20px',fontSize:12,color:'#607896',fontFamily:'monospace',fontWeight:600}}),game.hours_played?`${game.hours_played}h`:'—',
                  React.createElement('td',{style:{padding:'11px 20px',fontSize:12,color:'#607896'}}),new Date(game.added_at).toLocaleDateString(),
                  React.createElement('td',{style:{padding:'11px 20px',textAlign:'right'}},
                    React.createElement('button',{style:{padding:'5px 7px',borderRadius:8,background:'transparent',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',color:'#607896',transition:'all 150ms'},
                      onMouseEnter:e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='#c8d8e8';},
                      onMouseLeave:e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#607896';},
                    }, React.createElement(Icon,{name:'edit',size:16}))
                  )
                );
              })
            )
          )
        )
  );
}

Object.assign(window, { LibraryPage });
