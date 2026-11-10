"""
Free Open-Source Lecture Voice Generator using AI4Bharat Indic-Parler-TTS
(Supports expressive Tamil + English speech with 0 API quota/cost).

Quick Google Colab setup:
1. Open Google Colab (T4 GPU runtime: Runtime -> Change runtime type -> T4 GPU).
2. Upload `scripts/lecture_clips.json` to Colab (`/content/lecture_clips.json`).
3. Run:
     !pip install -q torch transformers soundfile pydub git+https://github.com/huggingface/parler-tts.git
     !python generate_lecture_audio_colab.py
4. Download `/content/lecture_audio.zip`, extract into `assets/audio/`, then run:
     npm run audio:sync
"""

import json
import os
import zipfile

import soundfile as sf
import torch
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

try:
    from pydub import AudioSegment

    HAS_PYDUB = True
except ImportError:
    HAS_PYDUB = False

CLIPS_JSON = os.environ.get("CLIPS_JSON", "lecture_clips.json")
OUT_DIR = os.environ.get("OUT_DIR", "generated_audio")
ZIP_OUT = os.environ.get("ZIP_OUT", "lecture_audio.zip")

MODEL_ID = "ai4bharat/indic-parler-tts"
TAMIL_DESC = (
    "A female speaker with a warm, lively, clear voice speaks at a brisk "
    "conversational pace in high audio quality with no background noise."
)
ENGLISH_DESC = (
    "A female speaker with a clear, confident voice speaks naturally at a "
    "moderate conversational pace in high studio quality with no background noise."
)


def main():
    if not os.path.exists(CLIPS_JSON):
        alt = os.path.join(os.path.dirname(__file__), "lecture_clips.json")
        if os.path.exists(alt):
            clips_path = alt
        else:
            raise FileNotFoundError(f"Could not find {CLIPS_JSON}")
    else:
        clips_path = CLIPS_JSON

    with open(clips_path, "r", encoding="utf-8") as f:
        clips = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    print(f"Loading {MODEL_ID} on {device} for {len(clips)} lecture clips...")

    model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID).to(device)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    desc_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)

    tamil_desc_ids = desc_tokenizer(TAMIL_DESC, return_tensors="pt").input_ids.to(device)
    english_desc_ids = desc_tokenizer(ENGLISH_DESC, return_tensors="pt").input_ids.to(device)
    sample_rate = model.config.sampling_rate

    for idx, clip in enumerate(clips, start=1):
        key = clip["key"]
        target_ext = ".mp3" if HAS_PYDUB else ".wav"
        final_path = os.path.join(OUT_DIR, f"{key}{target_ext}")
        if os.path.exists(final_path):
            print(f"[{idx}/{len(clips)}] Skipping existing {key}")
            continue

        desc_ids = tamil_desc_ids if clip.get("mode") == "tamil" else english_desc_ids
        prompt_ids = tokenizer(clip["text"], return_tensors="pt").input_ids.to(device)

        with torch.no_grad():
            audio_tensor = model.generate(input_ids=desc_ids, prompt_input_ids=prompt_ids)

        audio_arr = audio_tensor.cpu().numpy().squeeze()
        wav_path = os.path.join(OUT_DIR, f"{key}.wav")
        sf.write(wav_path, audio_arr, sample_rate)

        if HAS_PYDUB:
            AudioSegment.from_wav(wav_path).export(final_path, format="mp3", bitrate="64k")
            os.remove(wav_path)

        print(f"[{idx}/{len(clips)}] Generated {os.path.basename(final_path)}")

    with zipfile.ZipFile(ZIP_OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname in sorted(os.listdir(OUT_DIR)):
            if fname.endswith((".mp3", ".wav", ".m4a")):
                zf.write(os.path.join(OUT_DIR, fname), arcname=fname)

    print(f"Done! Extract {ZIP_OUT} into NovaBreaker/assets/audio/ and run: npm run audio:sync")


if __name__ == "__main__":
    main()
