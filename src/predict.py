import os
import torch
import numpy as np
import cv2
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from PIL import Image
import torchvision.transforms as transforms
from src.model import DamageClassifier


# ── Config ────────────────────────────────────────────────
DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = "models/best_model.pth"
CLASS_NAMES = ["No Damage", "Damage"]
COLORS      = {
    "No Damage": (0, 200, 0),    # Green
    "Damage":    (0, 0, 220),    # Red (BGR for OpenCV)
}
IMG_SIZE = 224
# ──────────────────────────────────────────────────────────


def load_model():
    """Load trained model from disk."""
    model = DamageClassifier(num_classes=2)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model = model.to(DEVICE)
    model.eval()
    print(f"Model loaded from {MODEL_PATH}")
    return model


def get_transform():
    """Image preprocessing pipeline."""
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])


def predict_single_image(model, image_path, transform):
    """
    Predict damage class for a single image.
    Returns: predicted class name, confidence score
    """
    # Load and preprocess
    image = Image.open(image_path).convert('RGB')
    tensor = transform(image).unsqueeze(0).to(DEVICE)  # add batch dim

    with torch.no_grad():
        output = model(tensor)
        probs  = torch.softmax(output, dim=1)
        conf, predicted = torch.max(probs, 1)

    class_name  = CLASS_NAMES[predicted.item()]
    confidence  = conf.item() * 100

    return class_name, confidence, image


def generate_damage_map(model, folder_path, output_path, transform, max_images=16):
    """
    Run prediction on all images in a folder.
    Generate a visual damage map grid showing each image
    with its predicted label and confidence overlaid.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Collect all image files
    image_files = [
        f for f in os.listdir(folder_path)
        if f.endswith('.jpeg') or f.endswith('.jpg') or f.endswith('.png')
    ][:max_images]

    if not image_files:
        print(f"No images found in {folder_path}")
        return

    print(f"Running predictions on {len(image_files)} images from {folder_path}...")

    results    = []
    damage_count    = 0
    no_damage_count = 0

    for fname in image_files:
        img_path = os.path.join(folder_path, fname)
        class_name, confidence, pil_image = predict_single_image(
            model, img_path, transform
        )
        results.append((pil_image, class_name, confidence, fname))

        if class_name == "Damage":
            damage_count += 1
        else:
            no_damage_count += 1

    # ── Build visual grid ─────────────────────────────────
    cols = 4
    rows = (len(results) + cols - 1) // cols

    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4 + 1))
    fig.patch.set_facecolor('#1a1a2e')

    # Flatten axes for easy iteration
    axes_flat = axes.flatten() if rows > 1 else axes

    for i, (pil_img, class_name, confidence, fname) in enumerate(results):
        ax = axes_flat[i]

        # Convert PIL to numpy for display
        img_array = np.array(pil_img.resize((IMG_SIZE, IMG_SIZE)))

        # Add colored border based on prediction
        border_color = '#00cc44' if class_name == "No Damage" else '#ff3333'
        for spine in ax.spines.values():
            spine.set_edgecolor(border_color)
            spine.set_linewidth(4)

        ax.imshow(img_array)
        ax.set_xticks([])
        ax.set_yticks([])

        # Label overlay at bottom of image
        label_color = '#00cc44' if class_name == "No Damage" else '#ff3333'
        ax.set_title(
            f"{class_name}\n{confidence:.1f}% confident",
            fontsize=10, fontweight='bold',
            color=label_color,
            pad=6,
            backgroundcolor='#1a1a2e'
        )

    # Hide unused subplots
    for j in range(len(results), len(axes_flat)):
        axes_flat[j].set_visible(False)

    # ── Summary bar at top ────────────────────────────────
    total = len(results)
    damage_pct    = 100 * damage_count / total
    no_damage_pct = 100 * no_damage_count / total

    fig.suptitle(
        f"Disaster Damage Detection — Prediction Map\n"
        f"Damaged: {damage_count} ({damage_pct:.1f}%)   |   "
        f"No Damage: {no_damage_count} ({no_damage_pct:.1f}%)",
        fontsize=14, fontweight='bold',
        color='white', y=1.01
    )

    # Legend
    damage_patch    = mpatches.Patch(color='#ff3333', label='Damage Detected')
    no_damage_patch = mpatches.Patch(color='#00cc44', label='No Damage')
    fig.legend(
        handles=[damage_patch, no_damage_patch],
        loc='lower center', ncol=2,
        fontsize=11, facecolor='#1a1a2e',
        labelcolor='white', framealpha=0.8
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight',
                facecolor='#1a1a2e')
    plt.close()
    print(f"Damage map saved to {output_path}")

    return damage_count, no_damage_count, total


def predict_and_report(folder_path, label="test"):
    """Full prediction pipeline for a folder of images."""
    model     = load_model()
    transform = get_transform()

    output_path = f"outputs/damage_map_{label}.png"

    result = generate_damage_map(
        model, folder_path, output_path, transform, max_images=16
    )

    if result:
        damage_count, no_damage_count, total = result
        print("\n" + "="*45)
        print("     PREDICTION SUMMARY")
        print("="*45)
        print(f"  Total images analysed : {total}")
        print(f"  Damaged areas         : {damage_count} ({100*damage_count/total:.1f}%)")
        print(f"  Undamaged areas       : {no_damage_count} ({100*no_damage_count/total:.1f}%)")
        print("="*45)
        print(f"\nDamage map saved → {output_path}")


if __name__ == "__main__":
    # Run on damage folder from test set
    predict_and_report("test/damage",    label="damaged_areas")

    # Run on no_damage folder from test set
    predict_and_report("test/no_damage", label="safe_areas")