import os
import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    f1_score, precision_score, recall_score,
    confusion_matrix, classification_report,
    roc_curve, auc
)
from src.dataset import get_dataloaders
from src.model import DamageClassifier


def evaluate():
    DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    MODEL_PATH = "models/best_model.pth"
    CLASS_NAMES = ["No Damage", "Damage"]

    os.makedirs("outputs", exist_ok=True)

    print(f"Evaluating on: {DEVICE}")
    print("Loading model...")

    # --- Load trained model ---
    model = DamageClassifier(num_classes=2)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model = model.to(DEVICE)
    model.eval()
    print("Model loaded successfully!")

    # --- Load test data ---
    _, _, test_loader = get_dataloaders(batch_size=32)
    print(f"Test batches: {len(test_loader)}")

    # --- Run predictions ---
    all_preds   = []
    all_labels  = []
    all_probs   = []

    print("Running predictions on test set...")
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(DEVICE)
            outputs = model(images)

            # Get probabilities using softmax
            probs = torch.softmax(outputs, dim=1)

            # Get predicted class
            _, predicted = torch.max(outputs, 1)

            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())  # prob of damage class

    all_preds  = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs  = np.array(all_probs)

    # --- Calculate metrics ---
    accuracy  = 100 * np.sum(all_preds == all_labels) / len(all_labels)
    f1        = f1_score(all_labels, all_preds, average='weighted')
    precision = precision_score(all_labels, all_preds, average='weighted')
    recall    = recall_score(all_labels, all_preds, average='weighted')
    cm        = confusion_matrix(all_labels, all_preds)

    print("\n" + "="*50)
    print("       EVALUATION RESULTS")
    print("="*50)
    print(f"  Accuracy:  {accuracy:.2f}%")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print("="*50)
    print("\nDetailed Classification Report:")
    print(classification_report(all_labels, all_preds, target_names=CLASS_NAMES))

    # --- Plot 1: Confusion Matrix ---
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        linewidths=0.5
    )
    plt.title('Confusion Matrix', fontsize=16, fontweight='bold', pad=20)
    plt.ylabel('Actual Label', fontsize=12)
    plt.xlabel('Predicted Label', fontsize=12)
    plt.tight_layout()
    plt.savefig("outputs/confusion_matrix.png", dpi=150)
    plt.close()
    print("Confusion matrix saved to outputs/confusion_matrix.png")

    # --- Plot 2: ROC Curve ---
    fpr, tpr, _ = roc_curve(all_labels, all_probs)
    roc_auc     = auc(fpr, tpr)

    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color='#2E75B6', lw=2, label=f'ROC Curve (AUC = {roc_auc:.4f})')
    plt.plot([0, 1], [0, 1], color='gray', lw=1, linestyle='--', label='Random Classifier')
    plt.fill_between(fpr, tpr, alpha=0.1, color='#2E75B6')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title('ROC Curve', fontsize=16, fontweight='bold')
    plt.legend(loc='lower right', fontsize=11)
    plt.tight_layout()
    plt.savefig("outputs/roc_curve.png", dpi=150)
    plt.close()
    print("ROC curve saved to outputs/roc_curve.png")

    # --- Plot 3: Per-class metrics bar chart ---
    per_class_f1        = f1_score(all_labels, all_preds, average=None)
    per_class_precision = precision_score(all_labels, all_preds, average=None)
    per_class_recall    = recall_score(all_labels, all_preds, average=None)

    x     = np.arange(len(CLASS_NAMES))
    width = 0.25

    fig, ax = plt.subplots(figsize=(10, 6))
    bars1 = ax.bar(x - width, per_class_f1,        width, label='F1 Score',  color='#2E75B6')
    bars2 = ax.bar(x,         per_class_precision,  width, label='Precision', color='#70AD47')
    bars3 = ax.bar(x + width, per_class_recall,     width, label='Recall',    color='#ED7D31')

    ax.set_xlabel('Class', fontsize=12)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_title('Per-Class Metrics', fontsize=16, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(CLASS_NAMES, fontsize=12)
    ax.set_ylim(0, 1.1)
    ax.legend(fontsize=11)
    ax.grid(axis='y', alpha=0.3)

    # Add value labels on bars
    for bar in [bars1, bars2, bars3]:
        for rect in bar:
            height = rect.get_height()
            ax.annotate(f'{height:.3f}',
                xy=(rect.get_x() + rect.get_width() / 2, height),
                xytext=(0, 5), textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

    plt.tight_layout()
    plt.savefig("outputs/per_class_metrics.png", dpi=150)
    plt.close()
    print("Per-class metrics saved to outputs/per_class_metrics.png")

    # --- Save text report ---
    with open("outputs/evaluation_report.txt", "w") as f:
        f.write("="*50 + "\n")
        f.write("   DISASTER DAMAGE AI — EVALUATION REPORT\n")
        f.write("="*50 + "\n\n")
        f.write(f"Test Accuracy:  {accuracy:.2f}%\n")
        f.write(f"F1 Score:       {f1:.4f}\n")
        f.write(f"Precision:      {precision:.4f}\n")
        f.write(f"Recall:         {recall:.4f}\n")
        f.write(f"ROC AUC Score:  {roc_auc:.4f}\n\n")
        f.write("Detailed Classification Report:\n")
        f.write(classification_report(all_labels, all_preds, target_names=CLASS_NAMES))
        f.write("\nConfusion Matrix:\n")
        f.write(str(cm))
    print("Full report saved to outputs/evaluation_report.txt")

    print("\nAll evaluation outputs saved to outputs/ folder!")


if __name__ == "__main__":
    evaluate()