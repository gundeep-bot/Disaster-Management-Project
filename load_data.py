import cv2
import os
import numpy as np

# ---- CHANGE THIS to where your images are extracted ----
IMG_DIR = "data/images/"
LABEL_DIR = "data/labels/"

def load_image_pair(pre_path, post_path):
    pre  = cv2.imread(pre_path)
    post = cv2.imread(post_path)

    # Resize both to 512x512
    pre  = cv2.resize(pre,  (512, 512))
    post = cv2.resize(post, (512, 512))

    # Normalize pixel values to 0-1
    pre  = pre  / 255.0
    post = post / 255.0

    return pre, post

def list_pairs(img_dir):
    all_files = os.listdir(img_dir)
    pre_files  = sorted([f for f in all_files if "pre_disaster"  in f])
    post_files = sorted([f for f in all_files if "post_disaster" in f])
    return pre_files, post_files

if __name__ == "__main__":
    pre_files, post_files = list_pairs(IMG_DIR)
    print(f"Found {len(pre_files)} pre-disaster images")
    print(f"Found {len(post_files)} post-disaster images")

    # Test loading first pair
    pre, post = load_image_pair(
        IMG_DIR + pre_files[0],
        IMG_DIR + post_files[0]
    )
    print(f"Image shape: {pre.shape}")  # Should be (512, 512, 3)
    print("Data loading works correctly!")