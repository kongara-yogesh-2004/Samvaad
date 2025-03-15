import os
import requests
import logging

def speech_to_text(audio_file_path):
    try:
        url = "https://api.sarvam.ai/speech-to-text-translate"
        api_key = "2eb08a65-79b8-450a-b1e1-2e0f38803075"

        if not os.path.exists(audio_file_path):
            logging.error(f"Audio file not found: {audio_file_path}")
            return "Error: Audio file not found"

        file_size = os.path.getsize(audio_file_path)
        logging.info(f"Processing audio file: {audio_file_path}, Size: {file_size} bytes")

        with open(audio_file_path, "rb") as file:
            files = {
                "file": (os.path.basename(audio_file_path), file, "audio/wav")
            }

            data = {
                "model": "saaras:v2",
                "prompt": "The audio file is only in English, so make sure to understand the context and translate in good English.",
                "with_diarization": "false"
            }

            headers = {
                "api-subscription-key": api_key
            }

            logging.info("Sending request to Sarvam API")
            response = requests.post(url, files=files, data=data, headers=headers)

            if response.status_code != 200:
                logging.error(f"Sarvam API error: {response.status_code} - {response.text}")
                return f"API Error: {response.status_code}"

            response_json = response.json()
            logging.info(f"Sarvam API response: {response_json}")

            transcript = response_json.get("transcript", "No transcript available")
            return transcript
    
    except Exception as e:
        logging.exception("Exception in speech_to_text function")
        return f"Error: {str(e)}"
