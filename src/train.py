import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import matplotlib.pyplot as plt
from src.dataset import get_dataloaders
from src.model import DamageClassifier


def train():
    # --- Config ---
    EPOCHS     = 20
    BATCH_SIZE = 32
    LR         = 0.001
    DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print(f"Training on: {DEVICE}")
    os.makedirs("models", exist_ok=True)
    os.makedirs("outputs", exist_ok=True)

    # --- Load data ---
    train_loader, val_loader, _ = get_dataloaders(batch_size=BATCH_SIZE)
    print(f"Train batches: {len(train_loader)}")
    print(f"Val batches:   {len(val_loader)}")

    # --- Model, loss, optimizer ---
    model     = DamageClassifier(num_classes=2).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

    # --- Tracking metrics ---
    train_losses = []
    val_losses   = []
    val_accuracies = []
    best_val_acc = 0.0

    for epoch in range(EPOCHS):

        # ---- Training phase ----
        model.train()
        running_loss = 0.0
        correct = 0
        total   = 0

        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(images)
            loss    = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total   += labels.size(0)
            correct += (predicted == labels).sum().item()

        train_loss = running_loss / len(train_loader)
        train_acc  = 100 * correct / total
        train_losses.append(train_loss)

        # ---- Validation phase ----
        model.eval()
        val_loss    = 0.0
        val_correct = 0
        val_total   = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                outputs = model(images)
                loss    = criterion(outputs, labels)

                val_loss    += loss.item()
                _, predicted = torch.max(outputs, 1)
                val_total   += labels.size(0)
                val_correct += (predicted == labels).sum().item()

        val_loss = val_loss / len(val_loader)
        val_acc  = 100 * val_correct / val_total
        val_losses.append(val_loss)
        val_accuracies.append(val_acc)

        print(f"Epoch [{epoch+1}/{EPOCHS}] "
              f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")

        # ---- Save best model ----
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), "models/best_model.pth")
            print(f"  Best model saved! Val Acc: {val_acc:.2f}%")

        scheduler.step()

    print(f"\nTraining complete! Best Val Accuracy: {best_val_acc:.2f}%")

    # ---- Plot and save loss curves ----
    plt.figure(figsize=(12, 4))

    plt.subplot(1, 2, 1)
    plt.plot(train_losses, label='Train Loss')
    plt.plot(val_losses,   label='Val Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('Loss Curve')
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(val_accuracies, label='Val Accuracy', color='green')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy (%)')
    plt.title('Validation Accuracy')
    plt.legend()

    plt.tight_layout()
    plt.savefig("outputs/training_curves.png")
    print("Training curves saved to outputs/training_curves.png")


if __name__ == "__main__":
    train()