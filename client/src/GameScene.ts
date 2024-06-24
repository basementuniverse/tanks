import InputManager from '@basementuniverse/input-manager';
import SceneManager, {
  Scene,
  SceneTransitionState,
} from '@basementuniverse/scene-manager';
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

export type GameState = {
  players: {
    [id: string]: PlayerState;
  };
};

export type PlayerState = {
  id: string;
  colour: string;
  speed: number;
  positionX: number;
  positionZ: number;
  direction: number;
  turretDirection: number;
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

  private socket: Socket;

  private joined: boolean = false;

  private scene: Scene3D;

  private camera: Camera | null = null;

  private renderer: WebGLRenderer;

  private ambientLight: AmbientLight;

  private directionalLight: DirectionalLight;

  private map: Map;

  private player: Player | null = null;

  private opponents: Opponent[] = [];

  public constructor() {
    super({
      transitionTime: GameScene.TRANSITION_TIME,
    });
  }

  public initialise() {
    // Connect to server and set up event handlers
    this.socket = io('http://localhost:3000/');

    this.socket.on('connect', () => {
      console.log('Connected to server. Joining game...');
      this.socket.emit('join_game');
    });

    this.socket.on(
      'joined',
      (gameState: GameState, playerState: PlayerState) => {
        // Add player
        this.player = new Player(
          playerState.id,
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

    this.directionalLight = new DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(600, -200, 800);
    this.directionalLight.lookAt(0, 0, 0);
    this.scene.add(this.directionalLight);

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
      } as PlayerInputState);
    }
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();
    if (this.transitionState !== SceneTransitionState.None) {
      context.globalAlpha = this.transitionAmount;
    }

    if (this.joined && this.player && this.camera) {
      this.renderer.render(this.scene, this.camera.camera);

      context.drawImage(
        this.renderer.domElement,
        0,
        0,
        Game.screen.x,
        Game.screen.y
      );
    }

    context.restore();
  }

  public resize(width: number, height: number) {
    if (this.camera) {
      this.camera.resize(width, height);
    }
    this.renderer.setSize(width, height);
  }
}
