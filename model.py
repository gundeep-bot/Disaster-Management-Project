import torch
import torch.nn as nn

class DamageClassifier(nn.Module):
    def __init__(self):
        super(DamageClassifier, self).__init__()

        # Takes 6 channels (3 from pre + 3 from post image)
        self.conv1 = nn.Conv2d(6, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)

        self.pool = nn.MaxPool2d(2, 2)
        self.relu = nn.ReLU()

        # 4 output classes:
        # 0 = no damage
        # 1 = minor damage
        # 2 = major damage
        # 3 = destroyed
        self.fc1 = nn.Linear(128 * 64 * 64, 256)
        self.fc2 = nn.Linear(256, 4)

    def forward(self, x):
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = self.relu(self.conv3(x))
        x = x.view(x.size(0), -1)
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

if __name__ == "__main__":
    model = DamageClassifier()
    print(model)
    print("Model created successfully!")

    # Test with a dummy input
    dummy = torch.randn(1, 6, 512, 512)
    output = model(dummy)
    print(f"Output shape: {output.shape}")  # Should be (1, 4)