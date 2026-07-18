import json, urllib.request, sys

KEY = "PyiakrTOpypyRpsoRGIqItBxyIymCzgnrVcFSaGYjAyPooQuVnHwwcRTMSZnWbyP"
APP_ID = "AER47YKE7QxHmysEfklXu"
BASE = "http://localhost:3000"

def api(path, data=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(data).encode() if data else None,
        headers={
            "accept": "application/json",
            "x-api-key": KEY,
            "Content-Type": "application/json",
        },
    )
    resp = urllib.request.urlopen(req)
    body = resp.read().decode()
    if not body:
        return {"status": resp.status}
    return json.loads(body)

# Trigger deploy
print("Triggering deploy...")
result = api("/api/application.deploy", {"applicationId": APP_ID})
print(f"Deploy result: {result}")

# Check status
import time
time.sleep(5)
app = api(f"/api/application.one?applicationId={APP_ID}")
print(f"Status: {app.get('applicationStatus')}")
print(f"Image: {app.get('dockerImage')}")
print(f"Source: {app.get('sourceType')}")
deployments = app.get("deployments", [])
print(f"Deployments: {len(deployments)}")
if deployments:
    print(f"Last deploy status: {deployments[-1].get('status')}")
