import os
import glob

# Walk all HTML files in e:\MoS\website
target_dir = r"e:\MoS\website"
html_files = glob.glob(os.path.join(target_dir, "**", "*.html"), recursive=True)

head_injection = """
<meta name="description" content="Muscle OS: The ultimate coaching operating system for hypertrophy, strength, and overall physique goals. Engineered for results.">
<link rel="icon" href="/favicon.ico">
<link rel="manifest" href="/manifest.json">
"""

sw_injection = """
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then(registration => {
        console.log('ServiceWorker registration successful');
      }).catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
</script>
"""

for filepath in html_files:
    # Skip worker node_modules
    if "node_modules" in filepath:
        continue
        
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    modified = False
    
    # Inject into head if not already there
    if "<head>" in content and 'name="description"' not in content:
        # Find the title tag or just after head
        if "</title>" in content:
            content = content.replace("</title>", "</title>\n" + head_injection.strip())
        else:
            content = content.replace("<head>", "<head>\n" + head_injection.strip())
        modified = True
        
    # Inject service worker if not already there
    if "</body>" in content and "serviceWorker" not in content:
        content = content.replace("</body>", sw_injection.strip() + "\n</body>")
        modified = True
        
    # Lazy loading images
    if "<img " in content and 'loading="lazy"' not in content:
        content = content.replace("<img ", '<img loading="lazy" ')
        modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
