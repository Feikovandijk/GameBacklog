// DashboardPage — premium visual treatment
function DashboardPage({ onNav }) {
  const recent = MOCK_GAMES.filter(g => g.status === 'currently_playing').slice(0, 3);
  const trending = [
    { name:'Helldivers 2',       reviews:'287,450', players:'42,819', price:'$39.99', appid:553850,  score:96 },
    { name:'Manor Lords',        reviews:'54,210',  players:'18,442', price:'$39.99', appid:1363080, score:88 },
    { name:'Palworld',           reviews:'621,080', players:'12,305', price:'$29.99', appid:1623730, score:82 },
    { name:'Deep Rock Galactic', reviews:'198,430', players:'9,841',  price:'$29.99', appid:548430,  score:97 },
    { name:'Balatro',            reviews:'98,211',  players:'7,203',  price:'$14.99', appid:2379780, score:94 },
  ];
  const tags = [
    { name:'Action RPG', count:22, color:'#00E5BC' },
    { name:'Roguelike',  count:18, color:'#00A3FF' },
    { name:'Open World', count:15, color:'#8B5CF6' },
    { name:'Indie',      count:13, color:'#94A3B8' },
  ];

  return React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:0 } },

    // ── Page header ─────────────────────────────────────
    React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 } },
      React.createElement('div', null,
        React.createElement('div', { style:{ fontSize:11, fontWeight:700, color:'rgba(0,229,188,0.7)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 } }, 'Overview'),
        React.createElement('h1', { style:{ fontSize:30, fontWeight:800, color:'#fff', letterSpacing:'-0.025em', marginBottom:5, lineHeight:1.15 } }, 'Developer Dashboard'),
        React.createElement('p', { style:{ fontSize:13, color:'#607896', lineHeight:1.5 } },
          "Welcome back, Feiko. Here's what's happening in your game ecosystem today."
        )
      ),
      React.createElement('div', { style:{ display:'flex', gap:10, marginTop:4 } },
        React.createElement('button', {
          style:{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'1px solid #1e2d47', background:'rgba(14,22,40,0.8)', color:'#8a9bb0', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Manrope',sans-serif", transition:'all 150ms' },
          onMouseEnter:e=>{e.currentTarget.style.borderColor='#2A3550';e.currentTarget.style.color='#fff';},
          onMouseLeave:e=>{e.currentTarget.style.borderColor='#1e2d47';e.currentTarget.style.color='#8a9bb0';},
        }, React.createElement(Icon,{name:'calendar_today',size:14,style:{color:'inherit'}}), 'This Week'),
        React.createElement('button', {
          onClick:()=>onNav('library'),
          style:{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background:'#00E5BC', color:'#0B1121', fontSize:12, fontWeight:800, border:'none', cursor:'pointer', fontFamily:"'Manrope',sans-serif", boxShadow:'0 4px 20px rgba(0,229,188,0.3)', transition:'all 150ms', letterSpacing:'-0.01em' },
          onMouseEnter:e=>{e.currentTarget.style.background='#00c4a1';e.currentTarget.style.transform='translateY(-1px)';},
          onMouseLeave:e=>{e.currentTarget.style.background='#00E5BC';e.currentTarget.style.transform='none';},
        }, React.createElement(Icon,{name:'add',size:15}), 'Track New Game')
      )
    ),

    // ── Stat cards ──────────────────────────────────────
    React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 } },
      React.createElement(StatCard, { icon:'inventory_2', label:'Games in Library', value:12, color:'#00E5BC', bg:'rgba(0,229,188,0.08)' }),
      React.createElement(StatCard, { icon:'bookmark',    label:'In Backlog',       value:5,  color:'#00A3FF', bg:'rgba(0,163,255,0.08)' }),
      React.createElement(StatCard, { icon:'check_circle',label:'Completed',        value:4,  color:'#10B981', bg:'rgba(16,185,129,0.08)' })
    ),

    // ── Recently playing ────────────────────────────────
    React.createElement('div', { style:{ marginBottom:28 } },
      React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 } },
        React.createElement('div', null,
          React.createElement('h2', { style:{ fontSize:16, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 } },
            React.createElement('span', { style:{ width:3, height:16, background:'#00E5BC', borderRadius:9999, display:'inline-block', boxShadow:'0 0 8px rgba(0,229,188,0.6)' } }),
            'Continue Playing'
          )
        ),
        React.createElement('button', {
          onClick:()=>onNav('library'),
          style:{ fontSize:12, color:'rgba(0,229,188,0.7)', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:"'Manrope',sans-serif", display:'flex', alignItems:'center', gap:4, transition:'color 150ms' },
          onMouseEnter:e=>e.currentTarget.style.color='#00E5BC',
          onMouseLeave:e=>e.currentTarget.style.color='rgba(0,229,188,0.7)',
        }, 'View all', React.createElement(Icon,{name:'arrow_forward',size:14,style:{color:'inherit'}}))
      ),
      React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 } },
        recent.map(game => React.createElement(GameCard, { key:game.id, game, onClick:()=>onNav('library') }))
      )
    ),

    // ── Market Pulse + Popular Tags ─────────────────────
    React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 } },

      // Market Pulse
      React.createElement('div', {
        style:{ background:'#0e1628', border:'1px solid #1e2d47', borderRadius:18, overflow:'hidden' }
      },
        React.createElement('div', {
          style:{ padding:'16px 20px', borderBottom:'1px solid #1a2540', display:'flex', alignItems:'center', justifyContent:'space-between' }
        },
          React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:12 } },
            React.createElement('div', { style:{ width:36, height:36, borderRadius:10, background:'rgba(0,229,188,0.08)', display:'flex', alignItems:'center', justifyContent:'center' } },
              React.createElement(Icon,{name:'candlestick_chart',size:18,style:{color:'#00E5BC'}})
            ),
            React.createElement('div', null,
              React.createElement('div', { style:{ fontSize:14, fontWeight:700, color:'#fff' } }, 'Market Pulse'),
              React.createElement('div', { style:{ fontSize:11, color:'#607896' } }, 'Trending · last 7 days')
            )
          ),
          React.createElement('button',{style:{fontSize:11,color:'rgba(0,229,188,0.6)',fontWeight:700,background:'none',border:'1px solid rgba(0,229,188,0.15)',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontFamily:"'Manrope',sans-serif",transition:'all 150ms'},
            onMouseEnter:e=>{e.currentTarget.style.color='#00E5BC';e.currentTarget.style.borderColor='rgba(0,229,188,0.3)';},
            onMouseLeave:e=>{e.currentTarget.style.color='rgba(0,229,188,0.6)';e.currentTarget.style.borderColor='rgba(0,229,188,0.15)';},
          },'Full Report →')
        ),
        React.createElement('table', { style:{ width:'100%', borderCollapse:'collapse' } },
          React.createElement('thead',null,
            React.createElement('tr',{ style:{ background:'rgba(7,13,26,0.4)' } },
              [['Game Title','left'],['Score','left'],['Players','right'],['Price','right']].map(([h,align],i) =>
                React.createElement('th',{key:h,style:{padding:'10px 20px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#607896',textAlign:align,borderBottom:'1px solid #1a2540'}},h)
              )
            )
          ),
          React.createElement('tbody',null,
            trending.map((g,i) => {
              const scoreColor = g.score>=90?'#10B981':g.score>=80?'#00A3FF':'#94A3B8';
              return React.createElement('tr',{key:g.name,
                style:{borderBottom:'1px solid rgba(26,37,64,0.5)',cursor:'default',transition:'background 120ms'},
                onMouseEnter:e=>e.currentTarget.style.background='rgba(255,255,255,0.02)',
                onMouseLeave:e=>e.currentTarget.style.background='transparent',
              },
                React.createElement('td',{style:{padding:'11px 20px'}},
                  React.createElement('div',{style:{display:'flex',alignItems:'center',gap:11}},
                    React.createElement('div',{style:{width:36,height:36,borderRadius:8,background:GRADIENTS[i%GRADIENTS.length],overflow:'hidden',flexShrink:0,position:'relative'}},
                      React.createElement('img',{src:`https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`,style:{width:'100%',height:'100%',objectFit:'cover'},onError:e=>e.target.style.display='none'})
                    ),
                    React.createElement('span',{style:{fontSize:13,fontWeight:700,color:'#e2eaf4'}},g.name)
                  )
                ),
                React.createElement('td',{style:{padding:'11px 20px'}},
                  React.createElement('span',{style:{fontSize:12,fontWeight:800,color:scoreColor,background:`${scoreColor}15`,padding:'2px 8px',borderRadius:6}},g.score)
                ),
                React.createElement('td',{style:{padding:'11px 20px',fontSize:12,color:'#8a9bb0',textAlign:'right',fontFamily:'monospace',fontWeight:600}},g.players),
                React.createElement('td',{style:{padding:'11px 20px',fontSize:12,color:'#607896',textAlign:'right',fontFamily:'monospace'}},g.price)
              );
            })
          )
        )
      ),

      // Popular Tags
      React.createElement('div', { style:{ background:'#0e1628', border:'1px solid #1e2d47', borderRadius:18, padding:'18px 20px' } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 } },
          React.createElement('h3',{style:{fontSize:14,fontWeight:700,color:'#fff'}}, 'Trending Genres'),
          React.createElement('div',{style:{fontSize:10,color:'#607896',display:'flex',alignItems:'center',gap:3}},React.createElement(Icon,{name:'schedule',size:12,style:{color:'#607896'}}),'7 days')
        ),
        React.createElement('p',{style:{fontSize:12,color:'#607896',marginBottom:18,lineHeight:1.5}},'Most common in this week\'s top 50.'),
        React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12}},
          tags.map((tag,i) => {
            const pct = Math.round((tag.count/50)*100);
            return React.createElement('div',{key:tag.name,
              style:{background:'rgba(7,13,26,0.5)',border:'1px solid #1a2540',borderRadius:12,padding:'12px 14px',transition:'border-color 150ms',cursor:'default'},
              onMouseEnter:e=>e.currentTarget.style.borderColor=tag.color+'40',
              onMouseLeave:e=>e.currentTarget.style.borderColor='#1a2540',
            },
              React.createElement('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:10}},
                React.createElement('span',{style:{fontSize:13,fontWeight:700,color:'#e2eaf4'}}),tag.name,
                React.createElement('div',{style:{display:'flex',alignItems:'center',gap:4}},
                  React.createElement(Icon,{name:'trending_up',size:13,style:{color:tag.color}}),
                  React.createElement('span',{style:{fontSize:11,fontWeight:800,color:tag.color,fontFamily:'monospace'}}),`${pct}%`
                )
              ),
              React.createElement('div',{style:{height:3,background:'rgba(42,53,80,0.5)',borderRadius:9999,overflow:'hidden'}},
                React.createElement('div',{style:{height:'100%',width:`${pct}%`,background:tag.color,borderRadius:9999,boxShadow:`0 0 6px ${tag.color}60`,transition:'width 600ms ease'}})
              ),
              React.createElement('div',{style:{fontSize:10,color:'rgba(148,163,184,0.4)',marginTop:6}}),`in ${tag.count} of top 50 games`
            );
          })
        )
      )
    )
  );
}

Object.assign(window, { DashboardPage });
