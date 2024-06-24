import { clamp } from '@basementuniverse/utils';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const TICK_RATE = 60;

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

const ACCELERATION: number = 9;

const ROLLING_FRICTION: number = 0.25;

const MAX_SPEED: number = 30;

const TURN_SPEED: number = 1.2;

const TURRET_TURN_SPEED: number = 1;

type GameState = {
  players: {
    [id: string]: PlayerState;
  };
};

type PlayerState = {
  id: string;
  colour: string;
  speed: number;
  positionX: number;
  positionZ: number;
  direction: number;
  turretDirection: number;
};

type PlayerInputState = {
  id: string;
  thrust: number;
  turn: number;
  turretTurn: number;
  shoot?: boolean;
};

const players: {
  [id: string]: PlayerState;
} = {};

const inputQueue: PlayerInputState[] = [];

let gameLoop: NodeJS.Timeout | null = null;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket: Socket) => {
  // Player joins the game
  socket.on('join_game', () => {
    console.log(`Player ${socket.id} joined the game`);

    const colour =
      PLAYER_COLOURS[Object.keys(players).length % PLAYER_COLOURS.length];

    // If the gameloop isn't already running, start it now
    if (gameLoop === null) {
      gameLoop = setInterval(() => {
        update();
      }, 1000 / TICK_RATE);
    }

    // Add a new player
    players[socket.id] = {
      id: socket.id,
      colour,
      speed: 0,
      positionX: 0,
      positionZ: 0,
      direction: Math.PI,
      turretDirection: 0,
    };

    // Inform the joining player that they have joined
    socket.emit(
      'joined',
      {
        players,
      } as GameState,
      players[socket.id]
    );
  });

  // Player leaves the game
  socket.on('disconnect', () => {
    console.log(`Player ${socket.id} left the game`);

    // Remove the player
    delete players[socket.id];

    // If there are no players, stop the gameloop
    if (Object.keys(players).length === 0) {
      clearInterval(gameLoop as NodeJS.Timeout);
      gameLoop = null;
    }
  });

  // Player has sent an input update
  socket.on('update', (input: PlayerInputState) => {
    inputQueue.push(input);
  });
});

function update() {
  while (inputQueue.length > 0) {
    const input = inputQueue.shift();
    if (!input) {
      continue;
    }

    if (!players[input.id]) {
      continue;
    }

    players[input.id] = updatePlayer(
      1 / TICK_RATE,
      players[input.id],
      input
    );
  }

  io.emit('update', { players } as GameState);
}

function updatePlayer(
  dt: number,
  player: PlayerState,
  input: PlayerInputState
): PlayerState {
  let speed = clamp(
    player.speed + input.thrust * ACCELERATION * dt,
    -MAX_SPEED,
    MAX_SPEED
  );

  if (input.thrust === 0) {
    speed *= 1 - ROLLING_FRICTION * dt;
  }

  if (Math.abs(speed) < 0.1) {
    speed = 0;
  }

  const dx = Math.sin(player.direction) * speed * dt;
  const dz = Math.cos(player.direction) * speed * dt;

  const direction = player.direction + input.turn * TURN_SPEED * dt;
  const turretDirection =
    player.turretDirection + input.turretTurn * TURRET_TURN_SPEED * dt;

  return {
    ...player,
    speed,
    positionX: player.positionX + dx,
    positionZ: player.positionZ + dz,
    direction,
    turretDirection,
  };
}

httpServer.listen(3000);
console.log('Server running on port 3000');
