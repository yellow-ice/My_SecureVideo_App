import requests
import time

BASE = "http://localhost:3000"

def run_xss():
    payload = "<script>alert('xss')</script>"
    r = requests.get(f"{BASE}/api/videos", params={"q": payload})
    print("XSS:", r.status_code, r.text[:120])

def run_sql():
    payload = "' OR 1=1 --"
    r = requests.get(f"{BASE}/api/videos", params={"q": payload})
    print("SQL:", r.status_code, r.text[:120])

def run_csrf():
    payload = "forged_request&csrf=none"
    r = requests.get(f"{BASE}/api/user", params={"id": payload})
    print("CSRF:", r.status_code, r.text[:120])

def run_bruteforce():
    for i in range(6):
        r = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@securevideo.com", "password": "wrong"})
        print(f"Brute {i+1}:", r.status_code, r.text[:120])
        time.sleep(0.2)

if __name__ == "__main__":
    print("== Simulate attack start ==")
    run_xss()
    run_sql()
    run_csrf()
    run_bruteforce()
    print("== done ==")
