import os
in_path = 'e:/MoS/supabase/merged_setup.sql'
out_dir = 'e:/MoS/supabase/chunks'
os.makedirs(out_dir, exist_ok=True)

with open(in_path, 'r', encoding='utf-8') as f:
    sql = f.read()

# Split by the file headers we added
chunks = sql.split('-- === ')

chunk_idx = 1
for chunk in chunks:
    chunk = chunk.strip()
    if not chunk: continue
    
    # Put the header back
    header_end = chunk.find(' ===')
    if header_end != -1:
        fname = chunk[:header_end]
        content = chunk[header_end + 4:].strip()
    else:
        fname = f"part_{chunk_idx}.sql"
        content = chunk
        
    out_path = os.path.join(out_dir, f"{chunk_idx:02d}_{fname}")
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created {out_path}")
    chunk_idx += 1
