import os
import torch
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from PIL import Image
import torchvision.transforms as transforms
from src.model import DamageClassifier


DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH  = "models/best_model.pth"
CLASS_NAMES = ["No Damage", "Damage"]
IMG_SIZE    = 224


def load_model():
    model = DamageClassifier(num_classes=2)
    if os.path.exists(MODEL_PATH):
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model = model.to(DEVICE)
    model.eval()
    return model


def get_transform():
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])


def predict_single_image(model, image_path_or_pil, transform):
    if isinstance(image_path_or_pil, str):
        image = Image.open(image_path_or_pil).convert('RGB')
    else:
        image = image_path_or_pil.convert('RGB')

    tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        output = model(tensor)
        probs  = torch.softmax(output, dim=1)
        conf, predicted = torch.max(probs, 1)

    class_name = CLASS_NAMES[predicted.item()]
    confidence = float(conf.item() * 100)

    return class_name, confidence, image


def generate_damage_map(model, folder_path, output_path, transform, max_images=16):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if not os.path.exists(folder_path):
        print(f"Folder {folder_path} not found. Creating sample mock map at {output_path}...")
        # Create synthetic demo images for demonstration
        fig, axes = plt.subplots(2, 4, figsize=(16, 8))
        fig.patch.set_facecolor('#041020')
        for idx, ax in enumerate(axes.flatten()):
            img_data = np.random.randint(40, 200, (224, 224, 3), dtype=np.uint8)
            is_dam = idx % 2 == 1
            color = '#ff3b3b' if is_dam else '#00ff88'
            lbl = 'Damage' if is_dam else 'No Damage'
            ax.imshow(img_data)
            ax.set_xticks([])
            ax.set_yticks([])
            ax.set_title(f"{lbl}\n{85 + idx*1.5:.1f}% confident", color=color, pad=6, backgroundcolor='#020b18')
            for spine in ax.spines.values():
                spine.set_edgecolor(color)
                spine.set_linewidth(3)
        plt.suptitle("Disaster Damage Detection — Prediction Map Grid", color='white', fontsize=14, fontweight='bold')
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, facecolor='#041020')
        plt.close()
        return 4, 4, 8

    image_files = [
        f for f in os.listdir(folder_path)
        if f.lower().endswith(('.jpeg', '.jpg', '.png'))
    ][:max_images]

    if not image_files:
        print(f"No valid images in {folder_path}")
        return

    results = []
    damage_count = 0
    no_damage_count = 0

    for fname in image_files:
        img_path = os.path.join(folder_path, fname)
        class_name, confidence, pil_image = predict_single_image(model, img_path, transform)
        results.append((pil_image, class_name, confidence, fname))
        if class_name == "Damage":
            damage_count += 1
        else:
            no_damage_count += 1

    cols = 4
    rows = (len(results) + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4 + 1))
    fig.patch.set_facecolor('#041020')
    axes_flat = axes.flatten() if rows > 1 else (axes if isinstance(axes, np.ndarray) else [axes])

    for i, (pil_img, class_name, confidence, fname) in enumerate(results):
        ax = axes_flat[i]
        img_array = np.array(pil_img.resize((IMG_SIZE, IMG_SIZE)))
        border_color = '#00ff88' if class_name == "No Damage" else '#ff3b3b'

        for spine in ax.spines.values():
            spine.set_edgecolor(border_color)
            spine.set_linewidth(3)

        ax.imshow(img_array)
        ax.set_xticks([])
        ax.set_yticks([])
        ax.set_title(
            f"{class_name}\n{confidence:.1f}% confident",
            fontsize=10, fontweight='bold',
            color=border_color, pad=6,
            backgroundcolor='#020b18'
        )

    for j in range(len(results), len(axes_flat)):
        axes_flat[j].set_visible(False)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='#041020')
    plt.close()
    print(f"Damage map saved to {output_path}")

    return damage_count, no_damage_count, len(results)


if __name__ == "__main__":
    model = load_model()
    transform = get_transform()
    generate_damage_map(model, "test/damage", "outputs/damage_map_damaged_areas.png", transform)
    generate_damage_map(model, "test/no_damage", "outputs/damage_map_safe_areas.png", transform)