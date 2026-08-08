import torch
import torch.nn as nn
import torchvision.models as models


class DamageClassifier(nn.Module):
    """
    ResNet18 Transfer Learning backbone matching the exact trained checkpoint architecture.
    Includes feature hook support for Grad-CAM explainability maps.
    """

    def __init__(self, num_classes=2, pretrained=True):
        super(DamageClassifier, self).__init__()

        try:
            from torchvision.models import ResNet18_Weights
            weights = ResNet18_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet18(weights=weights)
        except Exception:
            self.backbone = models.resnet18(pretrained=pretrained)

        in_features = self.backbone.fc.in_features

        # Exact matching classification head structure of best_model.pth
        self.backbone.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, 256),  # fc.1
            nn.ReLU(),                    # fc.2
            nn.Dropout(p=0.2),            # fc.3
            nn.Linear(256, num_classes)   # fc.4
        )

    def get_target_layer(self):
        """Returns target convolutional layer for Grad-CAM activation extraction."""
        return self.backbone.layer4[-1]

    def forward(self, x):
        return self.backbone(x)


if __name__ == "__main__":
    model = DamageClassifier(num_classes=2)
    dummy_input = torch.randn(4, 3, 224, 224)
    output = model(dummy_input)

    print(f"Model Architecture: {model.__class__.__name__}")
    print(f"Target Layer: {model.get_target_layer().__class__.__name__}")
    print(f"Input shape:  {dummy_input.shape}")
    print(f"Output shape: {output.shape}")
    print("model.py successfully initialized!")