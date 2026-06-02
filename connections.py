from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[tuple[int, WebSocket]]] = {}

    async def connect(self, user_id: int, item_id: int, websocket: WebSocket):
        await websocket.accept()
        if item_id not in self.active_connections:
            self.active_connections[item_id] = []
        self.active_connections[item_id].append((user_id, websocket))

    def disconnect(self, user_id: int, item_id: int, websocket: WebSocket):
        if item_id in self.active_connections:
            self.active_connections[item_id].remove((user_id, websocket))

    async def broadcast(self, item_id: int, data: dict):
        if item_id in self.active_connections:
            lost = []
            for (user_id, websocket) in self.active_connections[item_id]:
                try:
                    await websocket.send_json(data)
                except:
                    lost.append((user_id, websocket))
            for (user_id, websocket) in lost:
                self.active_connections[item_id].remove((user_id, websocket))

    async def notify_outbid(self, last_bid_user_id: int, item_id: int, data: dict):
        if item_id in self.active_connections:
            lost = []
            for (user_id, websocket) in self.active_connections[item_id]:
                try:
                    if user_id==last_bid_user_id:
                        await websocket.send_json(data)    
                except:
                    lost.append((user_id, websocket))
            for websocket in lost:
                self.active_connections[item_id].remove((user_id, websocket))


manager = ConnectionManager()

