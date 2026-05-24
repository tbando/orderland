import os
import json
from PIL import Image, ImageDraw, ImageFont


def load_config(config_path="config.json"):
    """設定ファイルを読み込みます。ファイルがない場合はデフォルト値を返します"""
    default_config = {
        "font_path": "YourFont-Regular.ttf",
        "image_width": 64,
        "image_height": 112,
        "font_size": 98,
        "threshold": 127,
        "output_dir": "output_strict",
        "filename_prefix": "spire_num_"
    }

    if not os.path.exists(config_path):
        print(f"警告: {config_path} が見つからないため、デフォルト設定で実行します。")
        return default_config

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def export_numeric_from_config():
    # 設定の読み込み
    config = load_config()

    font_path = config["font_path"]
    width = config["image_width"]
    height = config["image_height"]
    font_size = config["font_size"]
    threshold = config["threshold"]
    output_dir = config["output_dir"]
    # 修正：プレフィックスの読み込み（設定にない場合は空文字にする安全策付き）
    filename_prefix = config.get("filename_prefix", "")

    os.makedirs(output_dir, exist_ok=True)
    digits = [str(i) for i in range(10)]

    try:
        font = ImageFont.truetype(font_path, font_size)
    except IOError:
        print(f"エラー: フォントファイル '{font_path}' が見つかりません。")
        return

    print(f"▶ 設定を読み込みました。接頭辞: '{filename_prefix}'")

    for char in digits:
        img_l = Image.new("L", (width, height), 255)
        draw = ImageDraw.Draw(img_l)

        # 中央揃え
        bbox = draw.textbbox((0, 0), char, font=font)
        char_w = bbox[2] - bbox[0]
        char_h = bbox[3] - bbox[1]

        x = (width - char_w) / 2 - bbox[0]
        y = (height - char_h) / 2 - bbox[1]

        draw.text((x, y), char, font=font, fill=0)

        # 8-bit RGB形式への変換（ご指定の仕様準拠）
        img_rgb = img_l.point(lambda p: 255 if p >
                              threshold else 0).convert("RGB")

        # 修正：指定されたプレフィックスをファイル名の先頭に結合します
        file_name = f"{filename_prefix}{char}.png"
        file_path = os.path.join(output_dir, file_name)

        # インターレースなし、不要メタデータなしで保存
        img_rgb.save(file_path, format="PNG", interlace=False)
        print(f"  生成完了: {file_name}")


if __name__ == "__main__":
    export_numeric_from_config()
    print("\nすべての処理が完了しました！")
