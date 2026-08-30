import os
from PIL import Image
import glob

def compress_images(directory):
    count = 0
    saved_bytes = 0
    for root, _, files in os.walk(directory):
        for file in files:
            ext = file.lower().split('.')[-1]
            if ext in ['jpg', 'jpeg', 'png']:
                path = os.path.join(root, file)
                orig_size = os.path.getsize(path)
                try:
                    img = Image.open(path)
                    
                    if ext in ['jpg', 'jpeg']:
                        img.save(path, "JPEG", optimize=True, quality=85)
                    elif ext == 'png':
                        # Convert RGBA to P if it doesn't need full alpha
                        if img.mode != 'RGB':
                            img = img.convert('RGBA')
                        img.save(path, "PNG", optimize=True)
                        
                    new_size = os.path.getsize(path)
                    if new_size < orig_size:
                        count += 1
                        saved_bytes += (orig_size - new_size)
                    else:
                        pass
                except Exception as e:
                    print(f"Skipped {file}: {e}")
                    
    print(f"Compressed {count} images, saved {saved_bytes / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    compress_images(r"e:\MoS\website\assets")
