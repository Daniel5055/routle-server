import { Server } from 'socket.io';

const port = 23177;

const io = new Server(port, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('message', (msg) => {
    console.log(msg);
  });

  console.log('Connected');
});

console.log('Listening on port', port);

