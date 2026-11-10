"""
Free Open-Source Lecture Voice Generator using AI4Bharat Indic-Parler-TTS
(Supports expressive Tamil + English speech with 0 API quota/cost).

Quick Google Colab setup:
1. Accept model access at https://huggingface.co/ai4bharat/indic-parler-tts and create a Read token.
2. Open Google Colab (Runtime -> Change runtime type -> T4 GPU).
3. Upload BOTH `scripts/lecture_clips.json` and `scripts/generate_lecture_audio_colab.py` to `/content/`.
4. Run in a cell:
     !pip install -q torch transformers soundfile pydub git+https://github.com/huggingface/parler-tts.git
     %env HF_TOKEN=hf_YOUR_TOKEN_HERE
     !python generate_lecture_audio_colab.py
5. Download `/content/lecture_audio.zip`, extract files directly into `assets/audio/`, then run:
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
    from huggingface_hub import login as hf_login
except ImportError:
    hf_login = None

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


def clip_already_exists(key):
    """Return True when a clip already exists as mp3 or wav in OUT_DIR."""
    return any(os.path.exists(os.path.join(OUT_DIR, f"{key}{ext}")) for ext in (".mp3", ".wav", ".m4a"))


def export_audio_clip(key, audio_arr, sample_rate):
    """Save generated waveform to MP3 when ffmpeg/pydub is available, otherwise keep WAV."""
    wav_path = os.path.join(OUT_DIR, f"{key}.wav")
    sf.write(wav_path, audio_arr, sample_rate)

    if not HAS_PYDUB:
        return os.path.basename(wav_path)

    mp3_path = os.path.join(OUT_DIR, f"{key}.mp3")
    try:
        AudioSegment.from_wav(wav_path).export(mp3_path, format="mp3", bitrate="64k")
        os.remove(wav_path)
        return os.path.basename(mp3_path)
    except Exception as exc:
        print(f"MP3 encode failed ({exc}); keeping WAV: {os.path.basename(wav_path)}")
        return os.path.basename(wav_path)


def main():
    if not os.path.exists(CLIPS_JSON):
        alt = os.path.join(os.path.dirname(__file__), "lecture_clips.json")
        if os.path.exists(alt):
            clips_path = alt
        else:
            raise FileNotFoundError(f"Could not find {CLIPS_JSON}")
    else:
        clips_path = CLIPS_JSON

    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if hf_token and hf_login is not None:
        hf_login(token=hf_token)

    with open(clips_path, "r", encoding="utf-8") as f:
        clips = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    print(f"Loading {MODEL_ID} on {device} for {len(clips)} lecture clips...")

    try:
        model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID).to(device)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        desc_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    except Exception as exc:
        print(
            "Failed to load gated HuggingFace model. Accept access at "
            f"https://huggingface.co/{MODEL_ID} and set HF_TOKEN env var before running."
        )
        raise exc

    tamil_desc_ids = desc_tokenizer(TAMIL_DESC, return_tensors="pt").input_ids.to(device)
    english_desc_ids = desc_tokenizer(ENGLISH_DESC, return_tensors="pt").input_ids.to(device)
    sample_rate = model.config.sampling_rate

    for idx, clip in enumerate(clips, start=1):
        key = clip["key"]
        if clip_already_exists(key):
            print(f"[{idx}/{len(clips)}] Skipping existing {key}")
            continue

        desc_ids = tamil_desc_ids if clip.get("mode") == "tamil" else english_desc_ids
        prompt_ids = tokenizer(clip["text"], return_tensors="pt").input_ids.to(device)

        with torch.no_grad():
            audio_tensor = model.generate(input_ids=desc_ids, prompt_input_ids=prompt_ids)

        audio_arr = audio_tensor.cpu().numpy().squeeze()
        exported_name = export_audio_clip(key, audio_arr, sample_rate)
        print(f"[{idx}/{len(clips)}] Generated {exported_name}")

    with zipfile.ZipFile(ZIP_OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname in sorted(os.listdir(OUT_DIR)):
            if fname.endswith((".mp3", ".wav", ".m4a")):
                zf.write(os.path.join(OUT_DIR, fname), arcname=fname)

    print(f"Done! Extract {ZIP_OUT} into NovaBreaker/assets/audio/ and run: npm run audio:sync")


if __name__ == "__main__":
    main()

