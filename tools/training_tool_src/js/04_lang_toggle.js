  function _(k){return I18N[window.__lang]&&I18N[window.__lang][k]!==undefined?I18N[window.__lang][k]:I18N.en[k]!==undefined?I18N.en[k]:k;}
  function toggleLang(){
    window.__lang=window.__lang==='en'?'ar':'en';
    window.__dir=window.__lang==='ar'?'rtl':'ltr';
    document.documentElement.dir=window.__dir;
    document.documentElement.lang=window.__lang;
    localStorage.setItem('mos_lang',window.__lang);
    translateUI();
    var st=document.getElementById('step4');
    if(st&&st.classList.contains('active'))renderDashboard();
    document.querySelector('.lang-opt.active')&&document.querySelector('.lang-opt.active').classList.remove('active');
    document.querySelector('.lang-opt[data-lang="'+window.__lang+'"]')&&document.querySelector('.lang-opt[data-lang="'+window.__lang+'"]').classList.add('active');
  }
  window.toggleLang=toggleLang;
  function applyAccent(acc){
    acc=acc||'yellow';
    if(acc!=='yellow')document.documentElement.setAttribute('data-accent',acc);
    else document.documentElement.removeAttribute('data-accent');
    localStorage.setItem('mos_accent',acc);
    var sw=document.querySelectorAll('.acc-swatch');
    for(var i=0;i<sw.length;i++)sw[i].classList.toggle('active',sw[i].dataset.acc===acc);
  }
  window.applyAccent=applyAccent;
  function initTheme(){
    document.documentElement.setAttribute('data-theme','dark');
    localStorage.setItem('mos_theme','dark');
    applyAccent(localStorage.getItem('mos_accent')||'yellow');
    var sws=document.querySelectorAll('.acc-swatch');
    for(var i=0;i<sws.length;i++)sws[i].addEventListener('click',function(){applyAccent(this.dataset.acc);});
  }
  window.initTheme=initTheme;
  var deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    deferredPrompt=e;
    var btn=document.getElementById('installBtn');
    if(btn){btn.style.display='';btn.title=_('install_app');}
  });
  window.addEventListener('appinstalled',function(){
    deferredPrompt=null;
    var btn=document.getElementById('installBtn');
    if(btn)btn.style.display='none';
  });
  function initInstall(){
    var btn=document.getElementById('installBtn');
    if(!btn)return;
    btn.addEventListener('click',function(){
      if(!deferredPrompt)return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(){deferredPrompt=null;btn.style.display='none';});
    });
    btn.title=_('install_app');
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('./sw.js').catch(function(){});
    }
  }
  window.initInstall=initInstall;
  function translateUI(){
    document.querySelectorAll('[data-i18n]').forEach(function(el){el.textContent=_(el.dataset.i18n);});
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el){el.placeholder=_(el.dataset.i18nPh);});
    document.querySelectorAll('[data-i18n-val]').forEach(function(el){el.value=_(el.dataset.i18nVal);});
    var ap=document.getElementById('accPicker');
    if(ap)ap.title=_('accent');
    var ibtn=document.getElementById('installBtn');
    if(ibtn)ibtn.title=_('install_app');
    document.title=_('app_title')+' \u2014 '+_('header_sub');
  }
