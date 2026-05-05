// LoginPage — atmospheric, cinematic
function LoginPage({ onLogin }) {
  const [btnHov, setBtnHov] = React.useState(false);

  // Floating game images for background atmosphere
  const bgGames = [1245620, 1086940, 1145360, 570, 292030, 814380, 1091500, 526870];

  return React.createElement('div', {
    style:{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#070d1a', fontFamily:"'Manrope',sans-serif", position:'relative', overflow:'hidden',
    }
  },
    // Background: blurred game grid
    React.createElement('div', {
      style:{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gridTemplateRows:'repeat(2,1fr)', opacity:0.12, filter:'blur(2px) saturate(0.5)', transform:'scale(1.05)' }
    },
      bgGames.map(appid => React.createElement('div',{
        key:appid,
        style:{ background:`url(https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg) center/cover`, }
      }))
    ),
    // Dark vignette over the bg
    React.createElement('div', { style:{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, rgba(7,13,26,0.4) 0%, rgba(7,13,26,0.95) 70%)' } }),

    // Ambient glow orbs
    React.createElement('div', { style:{ position:'absolute', top:'15%', left:'20%', width:500, height:500, background:'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)', pointerEvents:'none' } }),
    React.createElement('div', { style:{ position:'absolute', bottom:'10%', right:'15%', width:600, height:600, background:'radial-gradient(circle, rgba(0,163,255,0.1) 0%, transparent 65%)', pointerEvents:'none' } }),
    React.createElement('div', { style:{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:800, height:400, background:'radial-gradient(ellipse, rgba(0,229,188,0.06) 0%, transparent 60%)', pointerEvents:'none' } }),

    // Dot grid
    React.createElement('div', { style:{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' } }),

    // Main card
    React.createElement('div', { style:{ position:'relative', zIndex:10, width:'100%', maxWidth:440, padding:'0 24px' } },
      // Floating stat pills above card
      React.createElement('div', { style:{ display:'flex', justifyContent:'center', gap:10, marginBottom:20 } },
        [['inventory_2','142 Games','#00E5BC'], ['check_circle','31 Completed','#10B981'], ['bookmark','67 Backlog','#00A3FF']].map(([icon,label,color]) =>
          React.createElement('div',{key:label,style:{display:'flex',alignItems:'center',gap:5,background:'rgba(22,30,50,0.7)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:9999,padding:'5px 12px',fontSize:11,fontWeight:600,color,boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}},
            React.createElement(Icon,{name:icon,size:13,style:{color}}),label
          )
        )
      ),

      // Card
      React.createElement('div', {
        style:{
          background:'rgba(14,22,40,0.75)', backdropFilter:'blur(24px)',
          border:'1px solid rgba(255,255,255,0.07)', borderRadius:28,
          padding:'44px 40px', boxShadow:'0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          textAlign:'center',
        }
      },
        // Logo
        React.createElement('div', { style:{ display:'flex', justifyContent:'center', marginBottom:6 } },
          React.createElement(LogoMark, { size:56 })
        ),
        React.createElement('div', { style:{ fontSize:13, fontWeight:700, color:'rgba(0,229,188,0.8)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:20 } }, 'GameBacklog'),

        React.createElement('h1', { style:{ fontSize:30, fontWeight:800, color:'#fff', marginBottom:10, letterSpacing:'-0.025em', lineHeight:1.15 } }, 'Track every game.\nConquer your backlog.'),
        React.createElement('p', { style:{ fontSize:14, color:'rgba(148,163,184,0.7)', marginBottom:36, lineHeight:1.6 } },
          'Connect your Steam account to sync your library, track progress, and manage your backlog like a pro.'
        ),

        // Steam button
        React.createElement('button', {
          onClick: onLogin,
          onMouseEnter:()=>setBtnHov(true),
          onMouseLeave:()=>setBtnHov(false),
          style:{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:12,
            padding:'15px 24px',
            background: btnHov ? 'linear-gradient(135deg,#1b1f2e,#1e2436)' : '#13172a',
            color:'#fff', borderRadius:14,
            fontFamily:"'Manrope',sans-serif", fontSize:15, fontWeight:700,
            border:'1px solid rgba(255,255,255,0.09)',
            cursor:'pointer', transition:'all 220ms',
            boxShadow: btnHov ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,188,0.15)' : '0 4px 16px rgba(0,0,0,0.4)',
            transform: btnHov ? 'translateY(-1px)' : 'none',
          }
        },
          React.createElement('img',{
            src:'https://store.cloudflare.steamstatic.com/public/shared/images/header/logo_steam.svg?t=962016',
            alt:'Steam', style:{ width:22, height:22 }
          }),
          'Continue with Steam'
        ),

        // Trust line
        React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:24 } },
          React.createElement(Icon,{name:'lock',size:13,style:{color:'rgba(148,163,184,0.4)'}}),
          React.createElement('span',{style:{fontSize:11,color:'rgba(148,163,184,0.4)'}}, 'Secure OAuth — we never see your password')
        )
      ),

      // Bottom note
      React.createElement('p', { style:{ textAlign:'center', marginTop:20, fontSize:11, color:'rgba(148,163,184,0.3)', lineHeight:1.6 } },
        'By logging in you agree to our privacy policy and terms of service.'
      )
    )
  );
}

Object.assign(window, { LoginPage });
