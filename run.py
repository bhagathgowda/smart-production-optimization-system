import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"

if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn

if __name__ == "__main__":
    print("Starting Smart Production Optimization API on http://0.0.0.0:8000...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
