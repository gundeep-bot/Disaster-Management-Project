import torch
import torchvision.transforms as transforms
from PIL import Image
import io
import re


def get_transform():
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])


def preprocess_image(image_bytes: bytes):
    image     = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    transform = get_transform()
    tensor    = transform(image).unsqueeze(0)
    return tensor


def extract_coordinates(filename: str):
    pattern = r'(-?\d+\.\d+)_(-?\d+\.\d+)'
    match   = re.search(pattern, filename)
    if match:
        longitude = float(match.group(1))
        latitude  = float(match.group(2))
        return latitude, longitude
    return None, None