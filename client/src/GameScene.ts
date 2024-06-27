import Debug from '@basementuniverse/debug';
import InputManager from '@basementuniverse/input-manager';
import SceneManager, {
  Scene,
  SceneTransitionState,
} from '@basementuniverse/scene-manager';
import { lerp } from '@basementuniverse/utils';
import { vec as vec2 } from '@basementuniverse/vec';
import { Socket, io } from 'socket.io-client';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Material,
  Scene as Scene3D,
  WebGLRenderer,
  Vector3 as vec3,
} from 'three';
import { Camera } from './Camera';
import { Explosion } from './Explosion';
import { FireTrail } from './FireTrail';
import Game from './Game';
import { Map } from './Map';
import { Opponent } from './Opponent';
import { Player } from './Player';
import { Tank } from './Tank';
import * as config from './config.json';

export type GameState = {
  players: {
    [id: string]: PlayerState;
  };
  fireTrails: FireTrailState[];
  explosions: ExplosionState[];
};

export type PlayerState = {
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

export type PlayerInputState = {
  id: string;
  thrust: number;
  turn: number;
  turretTurn: number;
  shoot: boolean;
};

export type FireTrailState = {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  fade: number;
};

export type ExplosionState = {
  id: string;
  positionX: number;
  positionZ: number;
  fade: number;
};

export class GameScene extends Scene {
  private static readonly TRANSITION_TIME: number = 1;

  private static readonly NAME_TAG_RENDER_DISTANCE: number = 180;

  private static readonly NAME_TAG_OFFSET: vec2 = vec2(0, -90);

  private socket: Socket;

  private joined: boolean = false;

  private dead: boolean = false;

  private scene: Scene3D;

  private camera: Camera | null = null;

  private renderer: WebGLRenderer;

  private ambientLight: AmbientLight;

  private directionalLight1: DirectionalLight;

  private directionalLight2: DirectionalLight;

  private map: Map;

  private player: Player | null = null;

  private opponents: Opponent[] = [];

  private fireTrails: FireTrail[] = [];

  private explosions: Explosion[] = [];

  public constructor() {
    super({
      transitionTime: GameScene.TRANSITION_TIME,
    });
  }

  public initialise(name: string) {
    // Connect to server and set up event handlers
    this.socket = io(config.server[config.env as 'development' | 'production']);

    this.socket.on('connect', () => {
      console.log('Connected to server. Joining game...');
      this.socket.emit('join_game', name);
    });

    this.socket.on(
      'joined',
      (gameState: GameState, playerState: PlayerState) => {
        // Add player
        this.player = new Player(
          playerState.id,
          playerState.name,
          new Tank(
            playerState.colour,
            new vec3(playerState.positionX, 0, playerState.positionZ),
            playerState.direction,
            playerState.turretDirection
          )
        );
        this.scene.add(this.player.tank.tank);

        this.camera = new Camera(this.player.tank.tank);
        this.scene.add(this.camera.pivot);

        // Add opponents
        for (const [id, state] of Object.entries(gameState.players)) {
          if (id === this.socket.id) {
            continue;
          }

          const opponent = new Opponent(
            id,
            state.name,
            new Tank(
              state.colour,
              new vec3(state.positionX, 0, state.positionZ),
              state.direction,
              state.turretDirection
            )
          );
          this.opponents.push(opponent);
          this.scene.add(opponent.tank.tank);
        }

        this.joined = true;
      }
    );

    this.socket.on('update', (gameState: GameState) => {
      if (!this.joined) {
        return;
      }

      // Update player
      if (this.player && gameState.players[this.socket.id ?? '']) {
        this.player.onUpdate(gameState.players[this.socket.id ?? '']);
      }

      // Update opponents
      for (const [id, state] of Object.entries(gameState.players)) {
        if (id === this.socket.id) {
          continue;
        }

        const found = this.opponents.find(opponent => opponent.id === id);
        if (found) {
          found.onUpdate(gameState.players[found.id]);
        } else {
          const opponent = new Opponent(
            id,
            state.name,
            new Tank(
              state.colour,
              new vec3(state.positionX, 0, state.positionZ),
              state.direction,
              state.turretDirection
            )
          );
          this.opponents.push(opponent);
          this.scene.add(opponent.tank.tank);
        }
      }

      // Remove any opponents who don't exist any more
      const opponentsToRemove = this.opponents.filter(
        opponent => !Object.keys(gameState.players).includes(opponent.id)
      );
      for (const opponent of opponentsToRemove) {
        this.scene.remove(opponent.tank.tank);
        this.opponents.splice(this.opponents.indexOf(opponent), 1);
      }

      // Update fire trails
      for (const fireTrailState of gameState.fireTrails) {
        const found = this.fireTrails.find(f => f.id === fireTrailState.id);
        if (found !== undefined) {
          const material = found.line.material as Material;
          material.opacity = lerp(fireTrailState.fade, 0.5, 0);
        } else {
          const start = new vec3(
            fireTrailState.startX,
            FireTrail.FIRE_TRAIL_Y,
            fireTrailState.startZ
          );
          const end = new vec3(
            fireTrailState.endX,
            FireTrail.FIRE_TRAIL_Y,
            fireTrailState.endZ
          );
          const fireTrail = new FireTrail(fireTrailState.id, start, end);
          this.fireTrails.push(fireTrail);
          this.scene.add(fireTrail.line);
        }
      }

      // Remove any fire trails that don't exist any more
      for (const fireTrail of this.fireTrails) {
        if (
          gameState.fireTrails.find(f => f.id === fireTrail.id) === undefined
        ) {
          this.scene.remove(fireTrail.line);
          this.fireTrails.splice(this.fireTrails.indexOf(fireTrail), 1);
        }
      }

      // Update explosions
      for (const explosionState of gameState.explosions) {
        const found = this.explosions.find(e => e.id === explosionState.id);
        if (found !== undefined) {
          const material = found.explosion.material as Material;
          material.opacity = explosionState.fade;
          found.explosion.scale.setScalar(lerp(explosionState.fade, 1, 2));
        } else {
          const position = new vec3(
            explosionState.positionX,
            0,
            explosionState.positionZ
          );
          const explosion = new Explosion(explosionState.id, position);
          this.explosions.push(explosion);
          this.scene.add(explosion.explosion);
        }
      }

      // Remove any explosions that don't exist any more
      for (const explosion of this.explosions) {
        if (
          gameState.explosions.find(e => e.id === explosion.id) === undefined
        ) {
          this.scene.remove(explosion.explosion);
          this.explosions.splice(this.explosions.indexOf(explosion), 1);
        }
      }
    });

    this.socket.on('player_died', (id: string) => {
      if (this.player && this.player.id === id) {
        this.dead = true;
      } else {
        const opponent = this.opponents.find(opponent => opponent.id === id);
        if (opponent) {
          console.log(`${opponent.name} died`);
          this.scene.remove(opponent.tank.tank);
          this.opponents.splice(this.opponents.indexOf(opponent), 1);
        }
      }
    });

    this.socket.on('disconnect', () => {
      console.error('Disconnected from server');
    });

    // Set up scene
    this.scene = new Scene3D();
    this.scene.background = new Color('#333');

    // Set up renderer
    this.renderer = new WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(Game.screen.x, Game.screen.y);

    // Lighting
    this.ambientLight = new AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight1 = new DirectionalLight(0xffffff, 0.8);
    this.directionalLight1.position.set(600, -200, 800);
    this.directionalLight1.lookAt(0, 0, 0);
    this.scene.add(this.directionalLight1);

    this.directionalLight2 = new DirectionalLight(0xffffff, 0.6);
    this.directionalLight2.position.set(-600, 200, 0);
    this.directionalLight2.lookAt(0, 0, 0);
    this.scene.add(this.directionalLight2);

    // Initialise map
    this.map = new Map();
    this.map.setupScene(this.scene);
  }

  public update(dt: number) {
    if (InputManager.keyPressed('Escape')) {
      this.socket.disconnect();
      SceneManager.pop();
    }

    if (this.joined && this.player && this.camera) {
      this.player.update(this.camera);
      this.camera.update();

      this.socket.emit('update', {
        id: this.player.id,
        thrust: this.player.thrust,
        turn: this.player.turn,
        turretTurn: this.player.turretTurn,
        shoot: this.player.shoot,
      } as PlayerInputState);
    }
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();
    if (this.transitionState !== SceneTransitionState.None) {
      context.globalAlpha = this.transitionAmount;
    }

    Debug.value('Health', this.player?.health ?? 0);

    if (this.joined && this.player && this.camera) {
      this.renderer.render(this.scene, this.camera.camera);

      context.drawImage(
        this.renderer.domElement,
        0,
        0,
        Game.screen.x,
        Game.screen.y
      );

      // Render player names
      for (const opponent of this.opponents) {
        if (
          this.player.tank.tank.position.distanceTo(
            opponent.tank.tank.position
          ) < GameScene.NAME_TAG_RENDER_DISTANCE
        ) {
          this.drawOpponentName(context, opponent);
        }
      }
    }

    if (this.dead) {
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillRect(0, 0, Game.screen.x, Game.screen.y);

      context.fillStyle = 'white';
      context.font = '40px monospace';
      context.textAlign = 'center';
      context.fillText('You died', Game.screen.x / 2, Game.screen.y / 2);
    }

    context.restore();
  }

  private drawOpponentName(
    context: CanvasRenderingContext2D,
    opponent: Opponent
  ) {
    const v = new vec3();
    opponent.tank.tank.updateMatrixWorld();
    v.setFromMatrixPosition(opponent.tank.tank.matrixWorld);
    v.project(this.camera!.camera!);

    const p = vec2.add(
      GameScene.NAME_TAG_OFFSET,
      vec2(
        Math.round((0.5 + v.x / 2) * Game.screen.x),
        Math.round((0.5 - v.y / 2) * Game.screen.y)
      )
    );

    context.fillStyle = opponent.tank.colour;
    context.strokeStyle = 'black';
    context.lineWidth = 2;
    context.font = '20px monospace';
    context.textAlign = 'center';

    context.strokeText(opponent.name, p.x, p.y);
    context.fillText(opponent.name, p.x, p.y);

    // Health bar
    context.fillStyle = 'black';
    context.fillRect(p.x - 50, p.y + 10, 100, 14);
    context.fillStyle = opponent.tank.colour;
    context.fillRect(p.x - 48, p.y + 12, 96 * (opponent.health / 100), 10);
  }

  public resize(width: number, height: number) {
    if (this.camera) {
      this.camera.resize(width, height);
    }
    this.renderer.setSize(width, height);
  }
}
