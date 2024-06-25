import InputManager from '@basementuniverse/input-manager';
import SceneManager, {
  Scene,
  SceneTransitionState,
} from '@basementuniverse/scene-manager';
import { vec as vec2 } from '@basementuniverse/vec';
import { Socket, io } from 'socket.io-client';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Scene as Scene3D,
  WebGLRenderer,
  Vector3 as vec3,
} from 'three';
import { Camera } from './Camera';
import Game from './Game';
import { Map } from './Map';
import { Opponent } from './Opponent';
import { Player } from './Player';
import { Tank } from './Tank';
import * as config from './config.json';
import Debug from '@basementuniverse/debug';

export type GameState = {
  players: {
    [id: string]: PlayerState;
  };
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

    // if (this.dead && InputManager.keyPressed()) {
    //   this.socket.disconnect();
    //   SceneManager.pop();
    //   SceneManager.push(new GameScene(), this.player?.name ?? 'Anonymous');
    // }
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
