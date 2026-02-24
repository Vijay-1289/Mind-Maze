export default function setupSocket(io) {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Player joins the game room
        socket.on('player:join', (data) => {
            socket.join('game');
            socket.sessionId = data.sessionId;
            console.log(`Player joined: ${data.name} (${data.sessionId})`);
        });

        // Admin joins admin room
        socket.on('admin:join', () => {
            socket.join('admin');
            console.log('Admin connected');
        });

        // Player progress update
        socket.on('player:progress', (data) => {
            io.to('admin').emit('player:updated', data);
        });

        // Player heartbeat (for tracking active status)
        socket.on('player:heartbeat', (data) => {
            io.to('admin').emit('player:heartbeat', {
                sessionId: data.sessionId,
                timestamp: Date.now()
            });
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
            if (socket.sessionId) {
                io.to('admin').emit('player:disconnected', { sessionId: socket.sessionId });
            }
        });
    });
}
