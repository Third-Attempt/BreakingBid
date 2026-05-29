from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, item_id: int, websocket: WebSocket):
        await websocket.accept()
        if item_id not in self.active_connections:
            self.active_connections[item_id] = []
        self.active_connections[item_id].append(websocket)

    def disconnect(self, item_id: int, websocket: WebSocket):
        if item_id in self.active_connections:
            self.active_connections[item_id].remove(websocket)

    async def broadcast(self, item_id: int, data: dict):
        if item_id in self.active_connections:
            lost = []
            for websocket in self.active_connections[item_id]:
                try:
                    await websocket.send_json(data)
                except:
                    lost.append(websocket)
            for websocket in lost:
                self.active_connections[item_id].remove(websocket)

manager = ConnectionManager()

