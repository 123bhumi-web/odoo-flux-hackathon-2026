import os
import glob
from PIL import Image

FRAMES_DIR = r"C:\Users\Raunak\.gemini\antigravity\scratch\brightloop-subscription-system\frames"
OUTPUT_GIF = r"C:\Users\Raunak\.gemini\antigravity\scratch\brightloop-subscription-system\brightloop-subscription-demo.gif"

def create_gif():
    frame_files = sorted(glob.glob(os.path.join(FRAMES_DIR, "*.png")))
    if not frame_files:
        print("No frames found in:", FRAMES_DIR)
        return False

    print(f"Found {len(frame_files)} frames. Processing...")
    images = []
    
    # Target size for crisp presentation & compact sharing (1100px width)
    target_width = 1100

    durations = [
        2200,  # Frame 1: Dashboard Overview
        2200,  # Frame 2: Gravity AI Risk Assessment
        2000,  # Frame 3: WhatsApp Dunning Copy
        1800,  # Frame 4: Automated Billing Trigger & Toast
        2000,  # Frame 5: Subscriptions View
        2200,  # Frame 6: Lifecycle State Stepper
        1800,  # Frame 7: Quotations View
        1800,  # Frame 8: Tax Invoices View
        2200,  # Frame 9: Customer Self-Service Portal
        2400,  # Frame 10: Instant Settlement Checkout
    ]

    for idx, f in enumerate(frame_files):
        img = Image.open(f).convert("RGBA")
        
        # Calculate aspect ratio
        w, h = img.size
        target_height = int(h * (target_width / w))
        img_resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Convert to RGB with white background
        bg = Image.new("RGB", (target_width, target_height), (255, 255, 255))
        bg.paste(img_resized, mask=img_resized.split()[3])
        
        # Quantize to 256 colors for clean GIF encoding
        paletted = bg.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        images.append(paletted)

    # Pad durations if frame count differs
    if len(durations) < len(images):
        durations += [1800] * (len(images) - len(durations))
    durations = durations[:len(images)]

    print(f"Saving animated GIF to: {OUTPUT_GIF}")
    images[0].save(
        OUTPUT_GIF,
        save_all=True,
        append_images=images[1:],
        duration=durations,
        loop=0,
        optimize=True
    )
    
    size_mb = os.path.getsize(OUTPUT_GIF) / (1024 * 1024)
    print(f"GIF generated successfully! Size: {size_mb:.2f} MB")
    return True

if __name__ == "__main__":
    create_gif()
