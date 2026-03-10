import http.client

def check_cors():
    conn = http.client.HTTPConnection("localhost", 5000)
    headers = {
        "Origin": "http://localhost:5180",
        "Access-Control-Request-Method": "GET"
    }
    conn.request("OPTIONS", "/api/auth/profile", headers=headers)
    res = conn.getresponse()
    print(f"Status: {res.status}")
    for k, v in res.getheaders():
        print(f"{k}: {v}")
    conn.close()

if __name__ == "__main__":
    check_cors()
