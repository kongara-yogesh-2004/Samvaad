from google import genai
import time
import json
def analysis():
    client = genai.Client(api_key="")

    print("Uploading file...")
    video_file = client.files.upload(file="C:/Users/masge/OneDrive/Desktop/interview bot/recording/recorded-video.webm")
    print(f"Completed upload: {video_file.uri}")
    time.sleep(5)
    template = "give the response in the following format: (give only JSON data)" + '''
                {
                    "summary": summary,
                    "score": score
                }'''
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=[
            video_file,
            "just give the score out of 10"+template])

    print(response.text)

    dr = client.files.delete(name=video_file.name)
    return response.text

# print(analysis())
