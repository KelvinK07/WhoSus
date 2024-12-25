const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createRoom', (roomId) => {
        rooms[roomId] = { players: [], spy: null, category: '', word: '', votes: {} };
        socket.join(roomId);
        console.log(`Room created: ${roomId}`);
    });

    socket.on('joinRoom', (roomId, username) => {
        if (rooms[roomId]) {
            rooms[roomId].players.push({ id: socket.id, username, role: '' });
            socket.join(roomId);
            io.to(roomId).emit('updatePlayers', rooms[roomId].players);
        }
    });

    socket.on('startGame', (roomId) => {
        if (rooms[roomId]) {
            const players = rooms[roomId].players;
            const spyIndex = Math.floor(Math.random() * players.length);
            rooms[roomId].spy = players[spyIndex].id;
            rooms[roomId].category = 'Animals'; // Example category
            rooms[roomId].word = 'Elephant'; // Example word
            players.forEach((player) => {
                const payload = player.id === rooms[roomId].spy
                    ? { category: rooms[roomId].category }
                    : { category: rooms[roomId].category, word: rooms[roomId].word };
                io.to(player.id).emit('assignRole', payload);
            });
        }
    });

    socket.on('submitVote', (roomId, vote) => {
        if (rooms[roomId]) {
            rooms[roomId].votes[socket.id] = vote;
            if (Object.keys(rooms[roomId].votes).length === rooms[roomId].players.length) {
                const voteCount = {};
                Object.values(rooms[roomId].votes).forEach((votedId) => {
                    voteCount[votedId] = (voteCount[votedId] || 0) + 1;
                });
                const mostVoted = Object.keys(voteCount).reduce((a, b) => voteCount[a] > voteCount[b] ? a : b);
                const spyCaught = mostVoted === rooms[roomId].spy;
                io.to(roomId).emit('revealSpy', { spyCaught, spyId: rooms[roomId].spy });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
