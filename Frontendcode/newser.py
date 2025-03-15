
from fastapi import FastAPI, File, UploadFile
import shutil
import os

app = FastAPI()

# Directory to save the video

SAVE_PATH = os.path.join("C:", "Users", "marpa", "Desktop", "samvaada")



# Ensure the directory exists
os.makedirs(SAVE_PATH, exist_ok=True)

@app.post("/upload/")
async def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join(SAVE_PATH, file.filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"message": "File uploaded successfully", "file_path": file_path}
