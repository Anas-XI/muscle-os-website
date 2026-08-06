  // ── Muscle highlight: stylized front/rear body diagram (SVG) ──
  // One reusable component for all muscle groups. Each muscle is a left-side
  // path (mirrored for the right side); center muscles span both sides.
  var BODY_BASE='<ellipse cx="100" cy="20" rx="16" ry="18"/>'
    +'<rect x="93" y="36" width="14" height="18" rx="4"/>'
    +'<path d="M60 56 L56 128 L64 196 L100 203 L136 196 L144 128 L140 56 C122 48 78 48 60 56 Z"/>'
    +'<path d="M62 60 C44 66 38 104 40 138 L52 140 C50 108 52 78 66 64 Z"/>'
    +'<path d="M42 142 C36 182 36 216 40 248 L52 246 C48 210 48 176 52 144 Z"/>'
    +'<path d="M72 206 C64 250 68 290 74 330 L96 330 C92 290 92 252 94 212 Z"/>'
    +'<path d="M76 336 C72 360 76 386 82 408 L96 408 C92 388 92 362 92 340 Z"/>'
    +'<rect x="70" y="408" width="26" height="10" rx="5"/>'
    +'<g transform="translate(200,0) scale(-1,1)">'
    +'<path d="M62 60 C44 66 38 104 40 138 L52 140 C50 108 52 78 66 64 Z"/>'
    +'<path d="M42 142 C36 182 36 216 40 248 L52 246 C48 210 48 176 52 144 Z"/>'
    +'<path d="M72 206 C64 250 68 290 74 330 L96 330 C92 290 92 252 94 212 Z"/>'
    +'<path d="M76 336 C72 360 76 386 82 408 L96 408 C92 388 92 362 92 340 Z"/>'
    +'<rect x="70" y="408" width="26" height="10" rx="5"/>'
    +'</g>';
  var BODY_MUSCLES={
    chest:{view:'front',d:'<path d="M63 62 C62 82 74 94 97 96 L97 62 Z"/>'},
    shoulders:{view:'front',d:'<ellipse cx="57" cy="60" rx="13" ry="14"/>'},
    biceps:{view:'front',d:'<path d="M60 60 C44 66 40 102 42 130 L54 130 C52 104 54 78 66 64 Z"/>'},
    forearms:{view:'front',d:'<path d="M43 136 C37 174 37 210 41 244 L53 242 C49 206 49 174 53 140 Z"/>'},
    abs:{view:'front',center:true,d:'<path d="M85 98 C88 120 88 168 84 194 L116 194 C112 168 112 120 115 98 Z"/>'},
    quads:{view:'front',d:'<path d="M73 206 C66 250 69 290 75 330 L95 330 C91 290 91 252 93 214 Z"/>'},
    traps:{view:'rear',center:true,d:'<path d="M64 52 C74 68 126 68 136 52 L126 40 C112 48 88 48 74 40 Z"/>'},
    back:{view:'rear',d:'<path d="M66 62 C58 96 60 134 70 170 L84 160 C78 120 76 88 82 64 Z"/>'},
    glutes:{view:'rear',d:'<path d="M73 200 C64 226 72 250 88 260 L95 240 C85 232 84 214 86 202 Z"/>'},
    hamstrings:{view:'rear',d:'<path d="M73 208 C67 252 69 292 75 330 L95 330 C91 292 91 252 93 214 Z"/>'},
    calves:{view:'rear',d:'<path d="M76 336 C72 360 76 386 82 408 L96 408 C92 388 92 362 92 340 Z"/>'},
    triceps:{view:'rear',d:'<path d="M60 58 C42 64 38 102 40 132 L52 132 C50 104 52 78 64 62 Z"/>'}
  };
  function muscleHighlightHtml(muscle){
    var s=BODY_MUSCLES[muscle];
    if(!s)return '';
    var hl=s.d+(s.center?'':'<g transform="translate(200,0) scale(-1,1)">'+s.d+'</g>');
    return '<svg class="esm-hl" viewBox="0 0 200 430" aria-label="'+muscle+'"><g class="hl-base">'+BODY_BASE+'</g><g class="hl-muscles">'+hl+'</g></svg>';
  }
  window.muscleHighlightHtml=muscleHighlightHtml;

