import os
import re
import sys

# Broad regex for emojis
emoji_pattern = re.compile(
    u'('
    u'\U0001F600-\U0001F64F'  # emoticons
    u'|\U0001F300-\U0001F5FF'  # symbols & pictographs
    u'|\U0001F680-\U0001F6FF'  # transport & map symbols
    u'|\U0001F700-\U0001F77F'  # alchemical symbols
    u'|\U0001F780-\U0001F7FF'  # Geometric Shapes Extended
    u'|\U0001F800-\U0001F8FF'  # Supplemental Arrows-C
    u'|\U0001F900-\U0001F9FF'  # Supplemental Symbols and Pictographs
    u'|\U0001FA00-\U0001FA6F'  # Chess Symbols
    u'|\U0001FA70-\U0001FAFF'  # Symbols and Pictographs Extended-A
    u'|\u2600-\u26FF'          # miscellaneous symbols
    u'|\u2700-\u27BF'          # dingbats
    u'|\u231a-\u231b|\u23e9-\u23ec|\u23f0|\u23f3' # Some watches/clocks
    u'|\u2B50|\u2B55'          # star/circle
    u')+', re.UNICODE)

base_dir = r'e:\MoS\website'
total_stripped = 0

for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith(('.html', '.js', '.css', '.json')):
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
            
            # Remove emojis
            new_content = emoji_pattern.sub('', content)
            
            if new_content != content:
                print('Stripped emojis from:', filepath)
                with open(filepath, 'w', encoding='utf-8', newline='') as file:
                    file.write(new_content)
                total_stripped += 1

print(f"Finished. Modified {total_stripped} files.")
