import { Server } from 'socket.io';

const port = 23177;

const io = new Server(port, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (server) => {
  io.on('message', (msg) => {
    console.log(msg);
  });
});
