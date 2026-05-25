from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def root():
    return {"hello": "world"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = "", w: str | None = ""):
    return {"item_id": item_id, "qw": q+w}