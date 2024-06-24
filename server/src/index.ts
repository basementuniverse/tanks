import { createServer } from "http";
import { Server, Socket } from "socket.io";

const PLAYER_COLOURS = [
  '#bf4f4f',
  '#d88750',
  '#cfdf4f',
  '#58cc35',
  '#4f9cbf',
  '#6157cc',
  '#c34fbf',
  '#35cc8b',
];

type PlayerState = {
  id: string;
  colour: string;
  positionX: number;
  positionZ: number;
  direction: number;
  turretDirection: number;
};

const players: {
  [id: string]: PlayerState;
} = {};

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket: Socket) => {
  socket.on('join_game', () => {
    console.log(`Player ${socket.id} joined the game`);

    // const colour = PLAYER_COLOURS[
    //   Object.keys(players).length % PLAYER_COLOURS.length
    // ];

    // players[socket.id] = {
    //   id: socket.id,
    //   colour,
    //   positionX: 0,
    //   positionZ: 0,
    //   direction: Math.PI,
    //   turretDirection: 0,
    // };

    // socket.emit('joined', players[socket.id]);
  });

  socket.on('update', (state: PlayerState) => {
    console.log(`Player ${socket.id} updated their state: (${state.positionX}, ${state.positionZ})`);
  });

  socket.on('disconnect', () => {
    console.log(`Player ${socket.id} left the game`);
  });
});

// setInterval(() => {
//   io.emit('update', players);
// }, 1000 / 60);

httpServer.listen(3000);
console.log('Server running on port 3000');
