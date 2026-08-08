import os
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import torchvision.transforms as transforms


class HurricaneDataset(Dataset):

    def __init__(self, root_dir, transform=None):
        self.samples = []
        self.transform = transform

        damage_dir    = os.path.join(root_dir, 'damage')
        no_damage_dir = os.path.join(root_dir, 'no_damage')

        for fname in os.listdir(damage_dir):
            if fname.endswith('.jpeg') or fname.endswith('.jpg'):
                full_path = os.path.join(damage_dir, fname)
                self.samples.append((full_path, 1))

        for fname in os.listdir(no_damage_dir):
            if fname.endswith('.jpeg') or fname.endswith('.jpg'):
                full_path = os.path.join(no_damage_dir, fname)
                self.samples.append((full_path, 0))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        image_path, label = self.samples[idx]
        image = Image.open(image_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        label = torch.tensor(label, dtype=torch.long)
        return image, label


def get_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    return train_transform, val_transform


def get_dataloaders(batch_size=32):
    train_transform, val_transform = get_transforms()

    train_dataset = HurricaneDataset('train_another', transform=train_transform)
    val_dataset   = HurricaneDataset('validation_another', transform=val_transform)
    test_dataset  = HurricaneDataset('test', transform=val_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader   = DataLoader(val_dataset,   batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader  = DataLoader(test_dataset,  batch_size=batch_size, shuffle=False, num_workers=0)

    return train_loader, val_loader, test_loader


if __name__ == "__main__":
    train_transform, val_transform = get_transforms()

    train_dataset = HurricaneDataset('train_another', transform=train_transform)
    val_dataset   = HurricaneDataset('validation_another', transform=val_transform)
    test_dataset  = HurricaneDataset('test', transform=val_transform)

    print(f"Train samples:      {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")
    print(f"Test samples:       {len(test_dataset)}")

    image, label = train_dataset[0]
    print(f"Image tensor shape: {image.shape}")
    print(f"Label: {label}")
    print("dataset.py works correctly!")