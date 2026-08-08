import torch
import torch.nn as nn
import torchvision.models as models


class DamageClassifier(nn.Module):
    """
    Uses a pretrained ResNet18 as backbone.
    Replaces the final layer to output 2 classes (damage / no_damage).
    This technique is called Transfer Learning.
    """

    def __init__(self, num_classes=2, pretrained=True):
        super(DamageClassifier, self).__init__()

        # Load pretrained ResNet18 (already knows edges, shapes, textures)
        self.backbone = models.resnet18(pretrained=pretrained)

        # Get the number of features from the last layer
        in_features = self.backbone.fc.in_features

        # Replace final layer with our own classifier
        self.backbone.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.backbone(x)


if __name__ == "__main__":
    # Test the model
    model = DamageClassifier(num_classes=2)
    print(model)

    # Test with a dummy batch of 4 images
    dummy_input = torch.randn(4, 3, 224, 224)
    output = model(dummy_input)

    print(f"\nInput shape:  {dummy_input.shape}")
    print(f"Output shape: {output.shape}")   # should be torch.Size([4, 2])
    print("model.py works correctly!")