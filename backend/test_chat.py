import urllib.request
import urllib.parse
import json

url = "http://127.0.0.1:8000/api/auth/login"
data = json.dumps({"username": "patientdemo", "password": "password123"}).encode("utf-8")
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

try:
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read().decode())["access_token"]
except Exception as e:
    print("Login failed patientdemo")
    data = json.dumps({"username": "admin", "password": "admin123"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read().decode())["access_token"]

chat_url = "http://127.0.0.1:8000/api/ai/chatbot"
chat_data = json.dumps({
    "message": "I select doctor: Dr. Robert Wilson (ID: doc-dr_wilson_west)",
    "session_token": "test-session-456"
}).encode("utf-8")
req = urllib.request.Request(chat_url, data=chat_data, headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
})

resp = urllib.request.urlopen(req)
print("Chatbot:", json.loads(resp.read().decode()))
