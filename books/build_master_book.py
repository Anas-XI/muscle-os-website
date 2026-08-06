# Builds muscle_os_master_book.html from the six pillar books.
# Run: python books/build_master_book.py
import re

BOOKS_DIR = 'books'

PILLARS = [
    ('muscle_os_nutrition_book.html', 'p1', 'Part 1', 'Diet &amp; Nutrition',
     'the complete guide to body composition'),
    ('muscle_os_training_book.html', 'p2', 'Part 2', 'Training &amp; Programming',
     'the complete guide to strength and physique development'),
    ('muscle_os_strength.html', 'p3', 'Part 3', 'Strength Maxing',
     'the complete guide to strength development and peak performance'),
    ('muscle_os_recovery.html', 'p4', 'Part 4', 'Recovery &amp; Fatigue Management',
     'the complete guide to recovery, stress management and fatigue'),
    ('muscle_os_sleep.html', 'p5', 'Part 5', 'Sleep Optimization',
     'the complete guide to sleep for muscle growth, recovery and health'),
    ('muscle_os_hormonal_book.html', 'p6', 'Part 6', 'Hormonal Optimization',
     'the complete guide to optimize hormones for body composition and performance'),
]


def namespace_ids(html, prefix):
    def ns(m):
        return 'id="%s-%s"' % (prefix, m.group(1))
    return re.sub(r'id="([A-Za-z][\w-]*)"', ns, html)


def namespace_hrefs(html, prefix):
    def ns(m):
        return 'href="#%s-%s"' % (prefix, m.group(1))
    return re.sub(r'href="#([A-Za-z][\w-]*)"', ns, html)


def extract_content(fname, prefix):
    html = open('%s/%s' % (BOOKS_DIR, fname), encoding='utf-8').read()
    toc = re.search(r'<div class="toc-page">.*?</div>', html, re.S)
    start = toc.end() if toc else 0
    scripts = [m.start() for m in re.finditer(r'<script>', html)]
    end = scripts[-1] if scripts else len(html)
    body = html[start:end]
    body = re.sub(r'<footer\b.*?</footer>', '', body, flags=re.S)
    body = re.sub(r'<nav\b.*?</nav>', '', body, flags=re.S)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    return namespace_ids(body.strip(), prefix)


def extract_toc_items(fname, prefix):
    html = open('%s/%s' % (BOOKS_DIR, fname), encoding='utf-8').read()
    toc = re.search(r'<ul class="toc">(.*?)</ul>', html, re.S)
    items = toc.group(1).strip() if toc else ''
    items = re.sub(r'\s+', ' ', items)
    return namespace_hrefs(items, prefix)


def build():
    # Base head + CSS from the hormonal book (most complete rule set).
    base = open('%s/%s' % (BOOKS_DIR, PILLARS[-1][0]), encoding='utf-8').read()
    head = base[:base.index('</head>')]
    head = re.sub(r'<title>.*?</title>',
                  '<title>Muscle OS: The Complete Six-Pillar Book</title>', head)

    master_css = """
.cover-pillars{list-style:none;margin:14pt 0 18pt;padding:0;display:flex;flex-direction:column;gap:6pt;align-items:center}
.cover-pillars li{font-family:'Oswald',sans-serif;font-size:9.5pt;letter-spacing:3px;text-transform:uppercase;color:rgba(244,201,59,.6);border:1px solid rgba(244,201,59,.15);padding:4px 16px}
.part-divider{page:domain-divider;page-break-after:always;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:60vh}
.part-divider .part-kicker{font-family:'Oswald',sans-serif;font-size:10pt;color:#C9A227;letter-spacing:6px;text-transform:uppercase;margin-bottom:10pt}
.part-divider h1{font-family:'Oswald',sans-serif;font-size:26pt;font-weight:700;color:#14151A;margin:0 0 10pt;border:none;padding:0;text-transform:uppercase;letter-spacing:1.5px}
.part-divider p{font-family:'Inter',sans-serif;font-size:11pt;font-style:italic;color:#8A8D96;margin:0;max-width:60%}
"""
    head = head.replace('</style>', master_css + '</style>')

    cover = """
<div class="cover">
  <div class="cover-accent-top"></div>
  <div class="cover-corner cover-corner-tl"></div>
  <div class="cover-corner cover-corner-tr"></div>
  <div class="cover-corner cover-corner-bl"></div>
  <div class="cover-corner cover-corner-br"></div>
  <div class="cover-label">MUSCLE OS</div>
  <div class="cover-pillar">THE COMPLETE SYSTEM</div>
  <div class="cover-diamond">&#9830;</div>
  <div class="cover-title">The Muscle OS Book</div>
  <div class="cover-tagline">all six pillars of the Muscle Operating System in one reference</div>
  <ul class="cover-pillars">
    <li>Pillar 1 &middot; Diet &amp; Nutrition</li>
    <li>Pillar 2 &middot; Training &amp; Programming</li>
    <li>Pillar 3 &middot; Strength Maxing</li>
    <li>Pillar 4 &middot; Recovery &amp; Fatigue Management</li>
    <li>Pillar 5 &middot; Sleep Optimization</li>
    <li>Pillar 6 &middot; Hormonal Optimization</li>
  </ul>
  <br>
  <p class="cover-author-main">Eng. Coach. Anas M. Hammad</p>
  <div class="cover-divider"></div>
  <div class="cover-bottom"></div>
  <div class="cover-accent-bottom"></div>
</div>
"""

    toc_lines = ['<div class="toc-page">', '  <h2>Table of Contents</h2>', '  <ul class="toc">']
    parts_html = []
    for fname, prefix, part_label, part_title, tagline in PILLARS:
        toc_lines.append('    <li class="toc-l1 toc-domain"><a href="#%s-top">%s &middot; %s</a></li>'
                         % (prefix, part_label, part_title))
        toc_lines.append('    ' + extract_toc_items(fname, prefix))
        parts_html.append("""
<div class="part-divider" id="%s-top">
  <div class="part-kicker">%s &middot; Muscle OS</div>
  <div class="domain-line"></div>
  <h1>%s</h1>
  <p>%s</p>
</div>
%s
""" % (prefix, part_label, part_title, tagline, extract_content(fname, prefix)))
    toc_lines.append('  </ul>')
    toc_lines.append('</div>')

    overlay = """
<div class="po-overlay" id="poOverlay">
  <div class="po-modal">
    <div class="po-icon">&#128274;</div>
    <h2>The Complete Muscle OS Book</h2>
    <div class="po-price">Bundle &middot; one-time purchase</div>
    <p class="po-desc">Unlock all six pillars in a single reference. One payment, lifetime access.</p>
    <ul class="po-features">
      <li>Diet &amp; Nutrition</li>
      <li>Training &amp; Programming</li>
      <li>Strength Maxing</li>
      <li>Recovery &amp; Fatigue Management</li>
      <li>Sleep Optimization</li>
      <li>Hormonal Optimization</li>
    </ul>
    <a href="https://wa.me/201040796017?text=Hi%20Anas%2C%20I%20want%20to%20purchase%20the%20complete%20Muscle%20OS%20book" class="po-btn" target="_blank" rel="noopener">Buy via WhatsApp</a>
    <div class="po-divider">Already purchased?</div>
    <div class="po-code-row">
      <input type="text" class="po-code-input" id="poCode" placeholder="Enter your access code" autocomplete="off">
      <button class="po-verify-btn" id="poVerify">Unlock</button>
    </div>
    <div class="po-error" id="poError">Invalid code. Please check and try again.</div>
    <div class="po-success" id="poSuccess">Access granted! Loading book...</div>
  </div>
</div>
"""

    gate_script = """
<script>
(function(){
  var KEY = 'mos_master_book_access';
  var EMAIL_CODE = 'ANASSTEM2025@GMAIL.COM';
  var access = null;
  try { access = JSON.parse(localStorage.getItem(KEY)); } catch(e){}
  if(access && access.active){
    document.getElementById('poOverlay').style.display = 'none';
  } else {
    document.getElementById('poOverlay').style.display = 'flex';
    document.getElementById('poVerify').addEventListener('click', function(){
      var code = document.getElementById('poCode').value.trim().toUpperCase();
      if(code && (code.length >= 6 || code === EMAIL_CODE)){
        localStorage.setItem(KEY, JSON.stringify({ active: true, book: 'master', code: code }));
        document.getElementById('poError').style.display = 'none';
        document.getElementById('poSuccess').style.display = 'block';
        setTimeout(function(){ location.reload(); }, 1500);
      } else {
        document.getElementById('poError').style.display = 'block';
      }
    });
    document.getElementById('poCode').addEventListener('keydown', function(e){
      if(e.key === 'Enter') document.getElementById('poVerify').click();
    });
  }
})();
</script>
</body>
</html>
"""

    nav = """<nav class="mos-nav"><div class="mos-nav-inner"><a href="../index.html" class="mos-brand">ANAS MO'MEN <span>COACHING</span></a><div class="mos-nav-links"><a href="../index.html">Home</a><a href="../tools/">Tools</a><a href="../guides/">Guides</a><a href="../books/">Books</a><a href="../index.html#packages">Coaching</a></div></div></nav>
"""

    out = head + '</head>\n<body>\n' + overlay + nav + cover + '\n'.join(toc_lines) + '\n' + ''.join(parts_html) + gate_script
    with open('%s/muscle_os_master_book.html' % BOOKS_DIR, 'w', encoding='utf-8') as f:
        f.write(out)
    print('Wrote books/muscle_os_master_book.html (%d bytes)' % len(out))


if __name__ == '__main__':
    build()
