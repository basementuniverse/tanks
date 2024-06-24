import Game from './Game';
import SceneManager, { Scene, SceneTransitionState } from '@basementuniverse/scene-manager';
import InputManager from '@basementuniverse/input-manager';
import {
  Scene as Scene3D,
  Color,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Vector3 as vec3,
} from 'three';
import { Tank } from './Tank';
import { Map } from './Map';
import { Camera } from './Camera';
import { io, Socket } from 'socket.io-client';

type PlayerState = {
  id: string;
  colour: string;
  positionX: number;
  positionZ: number;
  direction: number;
  turretDirection: number;
};

export class GameScene extends Scene {
  private static readonly TRANSITION_TIME: number = 1;

  private socket: Socket;

  private scene: Scene3D;

  private camera: Camera;

  private renderer: WebGLRenderer;

  private ambientLight: AmbientLight;

  private directionalLight: DirectionalLight;

  private map: Map;

  private player: Tank;

  public constructor() {
    super({
      transitionTime: GameScene.TRANSITION_TIME,
    });
  }

  public initialise() {
    // Connect to server and set up event handlers
    this.socket = io('http://localhost:3000/');

    this.socket.on('connect', () => {
      this.socket.emit('join_game');
    });

    // this.socket.on('joined', (state: PlayerState) => {
    //   this.player = new Tank(
    //     state.colour,
    //     new vec3(state.positionX, 0, state.positionZ),
    //     state.direction,
    //     state.turretDirection
    //   );
    //   this.scene.add(this.player.tank);

    //   this.camera = new Camera(this.player.tank, new vec3(0, 1, 10));
    //   this.scene.add(this.camera.pivot);
    // });

    this.socket.on('update', (state: any) => {
      console.log(state);
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

    this.map = new Map();
    this.map.setupScene(this.scene);

    this.player = new Tank(
      '#bf4f4f',
      new vec3(0, 0, 0),
      Math.PI,
      0
    );
    this.scene.add(this.player.tank);

    this.camera = new Camera(this.player.tank, new vec3(0, 1, 10));
    this.scene.add(this.camera.pivot);
  }

  public update(dt: number) {
    if (InputManager.keyPressed('Escape')) {
      this.socket.disconnect();
      SceneManager.pop();
    }

    this.player.update(dt, this.camera);
    this.camera.update(dt);

    // this.socket.emit('update', {
    //   id: this.socket.id,
    //   positionX: this.player.tank.position.x,
    //   positionZ: this.player.tank.position.z,
    //   direction: this.player.direction,
    //   turretDirection: this.player.turretDirection,
    // });
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();
    if (this.transitionState !== SceneTransitionState.None) {
      context.globalAlpha = this.transitionAmount;
    }

    this.renderer.render(this.scene, this.camera.camera);

    context.drawImage(
      this.renderer.domElement,
      0,
      0,
      Game.screen.x,
      Game.screen.y
    );

    context.restore();
  }

  public resize(width: number, height: number) {
    this.camera.resize(width, height);
    this.renderer.setSize(width, height);
  }
}
