import google.generativeai as genai
import random

API_KEYS = [
  
]

def get_random_api_key():
    return random.choice(API_KEYS)

def llm(template):
    try:
        random_api_key = get_random_api_key()
        genai.configure(api_key=random_api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(template)
        formatted_output = f"{response.text}\n"
        return formatted_output
    except Exception as e:
        llm(template)