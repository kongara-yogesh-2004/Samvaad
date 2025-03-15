from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
# from fastapi import FastAPI, HTTPException
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import gemini
import json
# import mongo
import time
from pymongo import MongoClient
import os
import tempfile
import logging
from tts import text_to_speech
from stt import speech_to_text
import video_analysis
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB Configuration
MONGO_URI = "mongodb+srv://sam:sammyaju@agentica.thedp.mongodb.net/?retryWrites=true&w=majority&appName=agentica"
client = MongoClient(MONGO_URI)
db = client["interview"]
collection = db["my_collection"]
collection.delete_many({})  # Delete all documents

def reset_and_create_new_document():
    collection.insert_one({
        "_id": "user_123",
        "interview_score": [],
        "vlm_result": "",
        "coding_score": [],
        # "":""
    })
    print("Database reset! Created a new document with _id=user_123.")

def append_to_scores(interview_data=None, coding_data=None, vlm_result=None):
    if not collection.find_one({"_id": "user_123"}):
        reset_and_create_new_document()
    
    update_query = {"$push": {}, "$set": {}}

    if interview_data is not None:
        update_query["$push"]["interview_score"] = interview_data
    if coding_data is not None:
        update_query["$push"]["coding_score"] = coding_data
    if vlm_result is not None:
        update_query["$set"]["vlm_result"] = vlm_result  # Use $set for single value fields

    # Remove empty operations to avoid errors
    update_query = {k: v for k, v in update_query.items() if v}

    collection.update_one({"_id": "user_123"}, update_query)


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

@app.post("/dynamic_question")
def llm(syllabus: ChatRequest):
    try:
        template = f'''You are an expert technical interviewer. Generate 2 interview questions (4 easy and 1 medium) for a technical interview round based on the given syllabus. Give random questions and also don't mention Easy or Medium in question.

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

@app.post("/questions")
def questions(msg: ChatRequest):
    questions = msg.message
    template = f"analyze all the questions and give a score out of 10. Questions and answers: {questions}" + '''
                ### Output Format (return only JSON format):
                ''' + '''
                {
                    "score": score
                }'''
    output = gemini.llm(template)
    print(output)
    output = output.replace("```json","")
    output = output.replace("```","")
    json_object = json.loads(output)
    append_to_scores(interview_data=json_object["score"])  # Push to MongoDB
    return json_object

@app.post("/question_adaption")
def adaption(inputs: DynamicAdaption):
    print(inputs.question)
    print(inputs.answer)
    template = f'''Evaluate the quality of the answer based on accuracy, clarity and relevance to the question. Provide a score out of 10, where 10 is an excellent response and 1 is a very poor response.
                ### Question:
                {inputs.question}

                ### Answer:
                {inputs.answer}

                ### Output Format (return only JSON format) (score should be zero if the answer is not related to the question):
                ''' + '''
                {
                    "score": score
                }
                
                ### Exception:
                # Exception-1:
                if the user mentions that he was not able to understand the question then rephrase the question and return it (treat it as an interview call and send friendly responses)
                # Output Format-1 (return only JSON format):
                ''' + '''
                {
                    "rephrased": "question"
                }

                # Exception-2:
                if the user mentions that he does not know the answer to the question or if he wants to skip the current question and move to the next question, then return true
                # Output Format-2 (return only JSON format):
                ''' + '''
                {
                    "NoSolution": "true"
                }
                '''
    output = gemini.llm(template)
    output = output.replace("```json","")
    output = output.replace("```","")
    json_object = json.loads(output)
    print(json_object)
    value = list(json_object.keys())

    if value[0] == "NoSolution" or value[0] == "score":
        obj = json.loads('{"next" : "true"}')
        append_to_scores(interview_data=json_object["score"])  # Push to MongoDB
        return obj
    if value[0] == "rephrased":
        return json_object


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

@app.get("/video-analytics")
def video():
    my_var = video_analysis.analysis()
    print(my_var)
    append_to_scores(vlm_result=my_var)  # Push to MongoDB

@app.post("/evaluate")
def evaluate(msg: DynamicAdaption):
    data = json.loads(msg.question)
    print(data['description'])
    print(msg.answer)
    template = f"Evaluate the code based on the time and space complexity mentioned in the question (if the answer exceeds the time or space complexity, reduce the score) and allot a score out of 10. Question: {msg.question}. Answer: {msg.answer}" + '''
                ### Output Format (please strictly return only JSON data) (score should be zero if the answer is not related to the question):
                ''' + '''
                {
                    "score": score
                }'''
    output = gemini.llm(template)
    print(output)
    output =output.replace("```json","")
    output =output.replace("```","")
    json_object = json.loads(output)
    append_to_scores(coding_data=json_object["score"])  # Push to MongoDB
    return json_object

@app.post("/upload")
def upload_video(video_chunk: UploadFile = File(...)):
    save_path = "C:/Users/masge/OneDrive/Desktop/interview bot/recording/recorded-video.webm"
    with open(save_path, "ab") as buffer:
        shutil.copyfileobj(video_chunk.file, buffer)
    
    time.sleep(3)
    # Trigger video analysis after saving the chunk
    my_var = video_analysis.analysis()  # Ensure it now picks up the correct file
    print(my_var)
    append_to_scores(vlm_result=my_var)
    return {"message": "Chunk received and processed"}

@app.get("/hr_integration")
async def hr_integration():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/spreadsheets",
         "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]

    MONGO_URI = "mongodb+srv://sam:sammyaju@agentica.thedp.mongodb.net/?retryWrites=true&w=majority&appName=agentica"
    client_x = MongoClient(MONGO_URI)

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        r"C:\Users\masge\Downloads\flask-mobile-diacare-0b44edd71756.json", scope)
    client = gspread.authorize(creds)
    sheet = client.open("interview_bot").sheet1

    # Define headers
    headers = [
        "Candidate ID", "Interview_score_1", "Interview_score_2", "Interview_score_3", 
        "Interview_score_4", "Interview_score_5", "vlm score", 
        "coding_round_1_score", "coding_round_2_score", "coding_round_3_score", "coding_round_4_score", "summary"
    ]

    # Ensure headers exist in the sheet
    if not sheet.row_values(1): 
        sheet.append_row(headers)

    # Connect to MongoDB
    db = client_x["interview"]
    collection = db["my_collection"]

    # Fetch candidate document
    document = collection.find_one({"_id": "user_123"})
    print(document)
    # If the document doesn't exist, create it with default values
    if document is None:
        new_document = {
            "_id": "user_123",
            "interview_score": [None] * 5,  # 5 interview scores set to None
            "vlm_score": [None],            # 1 VLM score set to None
            "coding_score": [None] * 4,      # 4 coding scores set to None
            "summary": ""                    # Empty summary
        }
        collection.insert_one(new_document)
        print("Inserted new candidate data into MongoDB.")

        # Fetch the newly inserted document
        document = collection.find_one({"_id": "user_123"})

    # Extract interview scores safely
    interview_scores = document.get("interview_score", [])
    interview_scores += [None] * (5 - len(interview_scores))  # Ensure at least 5 elements

    # Extract VLM score safely
    vlm_score = document.get("vlm_score", [None])[0]  # Assuming a single value in the list

    # Extract coding round scores safely
    coding_scores = document.get("coding_score", [])
    coding_scores += [None] * (4 - len(coding_scores))  # Ensure at least 4 elements

    # Extract summary (if available)
    summary = document.get("summary", "")

    # Construct candidate data row
    candidate_data = [
        document["_id"],
        interview_scores[0], interview_scores[1], interview_scores[2], 
        interview_scores[3], interview_scores[4], vlm_score,
        coding_scores[0], coding_scores[1], coding_scores[2], coding_scores[3], 
        summary
    ]

    # Append the candidate data to the sheet
    sheet.append_row(candidate_data)
    print("Candidate data successfully added to Google Sheets!")