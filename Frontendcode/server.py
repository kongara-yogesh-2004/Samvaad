from fastapi import FastAPI, HTTPException, UploadFile, File,Form
from fastapi.responses import FileResponse, JSONResponse
# from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import backend.gemini as gemini
import json
# import mongo


import os
import tempfile
import logging
from tts import text_to_speech
from stt import speech_to_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
class DynamicAdaption(BaseModel):
    question: str
    answer: str

@app.get("/")
def root():
    return {"message": "Hello, World!"}

@app.post("/dynamic_question")
def llm(syllabus: ChatRequest):
    try:
        template = f'''You are an expert technical interviewer. Generate 5 concise interview questions (4 easy and 1 medium) for a technical interview round based on the given syllabus. Give random questions and also don't mention Easy or Medium in question.

                    ### Syllabus:
                    {syllabus.message}

                    ### Requirements:
                    - Keep the questions short and clear.
                    - Categorize them into "Easy" or "Medium".
                    ''' + '''
                    ### Output Format (return only JSON format):
                    {
                        1: "Easy Question"
                        2: "Easy Question"
                        3: "Easy Question"
                        4: "Easy Question"
                        5: "Medium Question"
                    }
                    '''
        response = gemini.llm(template=template)
        response = response.replace("```json","")
        response = response.replace("```","")
        json_object = json.loads(response)
        
        return json_object
    except Exception as e:
        return ("Exception: " + str(e))

@app.post("/question_adaption")
def adaption(inputs: DynamicAdaption):
    print(inputs.question)
    print(inputs.answer)
    template = f'''Evaluate the quality of the answer based on accuracy, clarity and relevance to the question. Provide a score out of 10, where 10 is an excellent response and 1 is a very poor response.
                ### Question:
                {inputs.question}

                ### Answer:
                {inputs.answer}

                ### Output Format (return only JSON format):
                ''' + '''
                {
                    'score': score
                }
                
                ### Exception:
                # Exception-1:
                if the user mentions that he was not able to understand the question then rephrase the question and return it (treat it as an interview call and send friendly responses)
                # Output Format-1 (return only JSON format):
                ''' + '''
                {
                    'rephrased': question
                }

                # Exception-2:
                if the user mentions that he does not know the answer to the question then return true
                # Output Format-2 (return only JSON format):
                ''' + '''
                {
                    'NoSolution': True
                }
                '''
    output = gemini.llm(template)
    output = output.replace("```json","")
    output = output.replace("```","")
    json_object = json.loads(output)
    # print(json_object)

    # for key in ["rephrased", "score", "NoSolution"]:
    #     value = json_object.get(key)
    #     if key == "NoSolution":
    #         return {"skip" : True}
    #     if value:
    #         print(f"{key}: {value}")

@app.get("/tts")
async def generate_audio(text: str):
    audio_file = text_to_speech(text)
    if audio_file:
        return FileResponse(audio_file, media_type="audio/wav", filename="output_audio.wav")
    else:
        raise HTTPException(status_code=500, detail="Audio generation failed")

@app.post("/stt")
async def upload_and_transcribe(audio: UploadFile = File(...)):
    logger.info(f"Received audio file: {audio.filename}, Content-Type: {audio.content_type}")
    
    # Create a temporary file to store the uploaded audio
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    temp_file_path = temp_file.name
    
    try:
        # Write the uploaded file content to the temporary file
        content = await audio.read()
        logger.info(f"Read {len(content)} bytes from uploaded file")
        
        with open(temp_file_path, "wb") as buffer:
            buffer.write(content)
        
        logger.info(f"Saved audio to temporary file: {temp_file_path}")
        
        # Get transcript from the uploaded audio
        transcript = speech_to_text(temp_file_path)
        
        return JSONResponse(content={"transcript": transcript})
    except Exception as e:
        logger.exception("Error in upload_and_transcribe endpoint")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # Clean up the temporary file
        try:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.info(f"Deleted temporary file: {temp_file_path}")
        except Exception as e:
            logger.error(f"Error deleting temporary file: {str(e)}")




