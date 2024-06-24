import ContentManager from '@basementuniverse/content-manager';
import Debug from '@basementuniverse/debug';
import InputManager from '@basementuniverse/input-manager';
import SceneManager from '@basementuniverse/scene-manager';
import { vec } from '@basementuniverse/vec';
import { LoadingScene } from './LoadingScene';
import * as config from './config.json';
import * as constants from './constants';

export default class Game {
  public static canvas: HTMLCanvasElement;

  private context: CanvasRenderingContext2D;

  private lastFrameTime: number;

  private lastFrameCountTime: number;

  private frameRate: number = 0;

  private frameCount: number = 0;

  public static screen: vec;

  public constructor(container: HTMLElement | null) {
    if (container === null) {
      throw new Error('A valid container element must be specified.');
    }
    if (container.tagName.toLowerCase() !== 'canvas') {
      throw new Error('Container element must be a canvas.');
    }
    Game.canvas = container as HTMLCanvasElement;

    // Get a 2d context
    const context = Game.canvas.getContext('2d');
    if (context !== null) {
      this.context = context;
    } else {
      throw new Error("Couldn't get a 2d context.");
    }

    // Handle resize
    window.addEventListener('resize', this.resize.bind(this), false);
    this.resize();
  }

  private resize() {
    Game.canvas.width = window.innerWidth;
    Game.canvas.height = window.innerHeight;

    try {
      SceneManager.resize(Game.canvas.width, Game.canvas.height);
    } catch (e) {}
  }

  public initialise() {
    // Initialise subsystems
    ContentManager.initialise({
      // simulateSlowLoading: constants.DEBUG,
    });
    Debug.initialise();
    InputManager.initialise();
    SceneManager.initialise();

    // Start game loop
    this.lastFrameTime = this.lastFrameCountTime = performance.now();
    this.loop();

    // Push the initial scene
    SceneManager.push(new LoadingScene());
  }

  private loop() {
    const now = performance.now();
    const elapsedTime = Math.min(now - this.lastFrameTime, constants.FPS_MIN);

    // Calculate framerate
    if (now - this.lastFrameCountTime >= 1000) {
      this.lastFrameCountTime = now;
      this.frameRate = this.frameCount;
      this.frameCount = 0;
    }
    this.frameCount++;
    this.lastFrameTime = now;
    if (config.showFPS) {
      Debug.value('FPS', this.frameRate, { align: 'right' });
    }

    // Do game loop
    this.update(elapsedTime);
    this.draw();
    window.requestAnimationFrame(this.loop.bind(this));
  }

  update(dt: number) {
    Game.screen = vec(Game.canvas.width, Game.canvas.height);

    SceneManager.update(dt);
    InputManager.update(); // Input manager should be updated last
  }

  draw() {
    this.context.clearRect(0, 0, Game.screen.x, Game.screen.y);

    SceneManager.draw(this.context);
    Debug.draw(this.context);
  }
}
