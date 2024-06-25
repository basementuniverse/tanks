import { clamp } from '@basementuniverse/utils';
import { Box, System as CollisionSystem } from 'detect-collisions';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const ENV = 'development';

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

const ACCELERATION: number = 14;

const ROLLING_FRICTION: number = 0.03;

const MAX_SPEED: number = 40;

const TURN_SPEED: number = 1.3;

const TURRET_TURN_SPEED: number = 1;

const FIRE_COOLDOWN = 1;

const TANK_SX = 10;

const TANK_SZ = 15;

const MAP_LAYOUT = {
  sx: 1024,
  sz: 1024,
  buildings: [
    {
      x: 289,
      z: 164,
      sx: 50,
      sy: 40,
      sz: 84,
    },
    {
      x: 409,
      z: 160,
      sx: 40,
      sy: 20,
      sz: 68,
    },
    {
      x: 554,
      z: 153,
      sx: 130,
      sy: 30,
      sz: 86,
    },
    {
      x: 542,
      z: 441,
      sx: 57,
      sy: 50,
      sz: 62,
    },
    {
      x: 182,
      z: 564,
      sx: 52,
      sy: 30,
      sz: 74,
    },
    {
      x: 543,
      z: 600,
      sx: 101,
      sy: 40,
      sz: 103,
    },
    {
      x: 730,
      z: 552,
      sx: 63,
      sy: 20,
      sz: 120,
    },
    {
      x: 856,
      z: 583,
      sx: 113,
      sy: 20,
      sz: 56,
    },
    {
      x: 604,
      z: 730,
      sx: 44,
      sy: 15,
      sz: 44,
    },
    {
      x: 228,
      z: 865,
      sx: 110,
      sy: 40,
      sz: 62,
    },
    {
      x: 785,
      z: 916,
      sx: 127,
      sy: 30,
      sz: 108,
    },
  ],
};

type GameState = {
  players: {
    [id: string]: PlayerState;
  };
  fireTrails?: FireTrailState[];
  explosions?: ExplosionState[];
};

type PlayerState = {
  id: string;
  name: string;
  colour: string;
  speed: number;
  health: number;
  positionX: number;
  positionZ: number;
  direction: number;
  turretDirection: number;
  shootCooldown: number;
};

type PlayerInputState = {
  id: string;
  thrust: number;
  turn: number;
  turretTurn: number;
  shoot?: boolean;
};

type FireTrailState = {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  fade: number;
};

type ExplosionState = {
  positionX: number;
  positionZ: number;
  fade: number;
};

const players: {
  [id: string]: PlayerState;
} = {};

const playerCollisionVolumes: {
  [id: string]: Box;
} = {};

const fireTrails: FireTrailState[] = [];

const explosions: ExplosionState[] = [];

const inputQueue: PlayerInputState[] = [];

let gameLoop: NodeJS.Timeout | null = null;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: {
      development: 'http://localhost:8080',
      production: 'http://tanks.basementuniverse.com',
    }[ENV],
    methods: ['GET', 'POST'],
  },
});

const collisionSystem = new CollisionSystem();

// Add map bounds
collisionSystem.createLine(
  { x: -MAP_LAYOUT.sx / 2, y: -MAP_LAYOUT.sz / 2 },
  { x: MAP_LAYOUT.sx / 2, y: -MAP_LAYOUT.sz / 2 },
  { isStatic: true }
);
collisionSystem.createLine(
  { x: MAP_LAYOUT.sx / 2, y: -MAP_LAYOUT.sz / 2 },
  { x: MAP_LAYOUT.sx / 2, y: MAP_LAYOUT.sz / 2 },
  { isStatic: true }
);
collisionSystem.createLine(
  { x: MAP_LAYOUT.sx / 2, y: MAP_LAYOUT.sz / 2 },
  { x: -MAP_LAYOUT.sx / 2, y: MAP_LAYOUT.sz / 2 },
  { isStatic: true }
);
collisionSystem.createLine(
  { x: -MAP_LAYOUT.sx / 2, y: MAP_LAYOUT.sz / 2 },
  { x: -MAP_LAYOUT.sx / 2, y: -MAP_LAYOUT.sz / 2 },
  { isStatic: true }
);

// Add OBB collision volumes for buildings
for (const building of MAP_LAYOUT.buildings) {
  collisionSystem.createBox(
    {
      x: building.x - MAP_LAYOUT.sx / 2,
      y: building.z - MAP_LAYOUT.sz / 2,
    },
    building.sx,
    building.sz,
    {
      isStatic: true,
      isCentered: true,
    }
  );
}

io.on('connection', (socket: Socket) => {
  // Player joins the game
  socket.on('join_game', (name: string) => {
    console.log(`Player ${socket.id} joined the game`);

    const colour =
      PLAYER_COLOURS[Object.keys(players).length % PLAYER_COLOURS.length];

    // If the game loop isn't already running, start it now
    if (gameLoop === null) {
      gameLoop = setInterval(() => {
        update();
      }, 1000 / TICK_RATE);
    }

    // Add a new player
    players[socket.id] = {
      id: socket.id,
      name,
      colour,
      speed: 0,
      health: 100,
      positionX: 0,
      positionZ: 0,
      direction: Math.PI,
      turretDirection: 0,
      shootCooldown: 0,
    };
    playerCollisionVolumes[socket.id] = collisionSystem.createBox(
      { x: 0, y: 0 },
      TANK_SX,
      TANK_SZ,
      { isCentered: true }
    );
    playerCollisionVolumes[socket.id].setAngle(players[socket.id].direction);
    collisionSystem.update();

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
    try {
      delete players[socket.id];
      collisionSystem.remove(playerCollisionVolumes[socket.id]);
      collisionSystem.update();
      delete playerCollisionVolumes[socket.id];
    } catch (e) {}

    // If there are no players, stop the game loop
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

    players[input.id] = updatePlayer(1 / TICK_RATE, players[input.id], input);
    playerCollisionVolumes[input.id].setPosition(
      players[input.id].positionX,
      players[input.id].positionZ
    );
    playerCollisionVolumes[input.id].setAngle(players[input.id].direction);
  }

  collisionSystem.update();
  collisionSystem.separate();

  // Constrain player positions based on collision separation
  for (const [id, collisionVolume] of Object.entries(playerCollisionVolumes)) {
    players[id].positionX = collisionVolume.x;
    players[id].positionZ = collisionVolume.y;
    players[id].direction = collisionVolume.angle;
  }

  io.emit('update', { players, fireTrails, explosions } as GameState);
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
    speed *= 1 - ROLLING_FRICTION;
  }

  if (Math.abs(speed) < 0.1) {
    speed = 0;
  }

  const dx = Math.sin(player.direction) * speed * dt;
  const dz = Math.cos(player.direction) * speed * dt;

  const direction = player.direction + input.turn * TURN_SPEED * dt;
  const turretDirection =
    player.turretDirection + input.turretTurn * TURRET_TURN_SPEED * dt;

  if (input.shoot && player.shootCooldown <= 0) {
    player.shootCooldown = FIRE_COOLDOWN;

    const turretWorldDirection = player.direction + player.turretDirection;
    const start = {
      x: player.positionX + Math.sin(turretWorldDirection) * 20,
      y: player.positionZ + Math.cos(turretWorldDirection) * 20,
    };
    const end = {
      x: start.x + Math.sin(turretWorldDirection) * 1024,
      y: start.y + Math.cos(turretWorldDirection) * 1024,
    };

    const hit = collisionSystem.raycast(start, end);
    if (hit) {
      const { point, body } = hit;

      const hitOpponent = Object.values(players).find(
        player => player.positionX === body.x && player.positionZ === body.y
      );
      if (hitOpponent) {
        console.log(`Player ${player.name} shot player ${hitOpponent.name}`);

        hitOpponent.health -= 10;
        if (hitOpponent.health <= 0) {
          try {
            delete players[hitOpponent.id];
            collisionSystem.remove(playerCollisionVolumes[hitOpponent.id]);
            delete playerCollisionVolumes[hitOpponent.id];
          } catch (e) {}

          io.emit('player_died', hitOpponent.id);
        }
      }
    }
  }

  if (player.shootCooldown > 0) {
    player.shootCooldown -= dt;
  }

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
