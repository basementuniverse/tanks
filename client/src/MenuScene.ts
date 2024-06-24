import InputManager from '@basementuniverse/input-manager';
import SceneManager, {
  Scene,
  SceneTransitionState,
} from '@basementuniverse/scene-manager';
import { lerp } from '@basementuniverse/utils';
import Game from './Game';
import { GameScene } from './GameScene';

export class MenuScene extends Scene {
  private static readonly TRANSITION_TIME: number = 1;

  public constructor() {
    super({
      transitionTime: MenuScene.TRANSITION_TIME,
    });
  }

  public initialise() {}

  public update(dt: number) {
    if (InputManager.keyPressed()) {
      SceneManager.push(new GameScene());
    }
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();
    if (this.transitionState !== SceneTransitionState.None) {
      context.globalAlpha = this.transitionAmount;
    }

    const y = lerp(-50, Game.screen.y / 2, this.transitionAmount);
    context.fillStyle = 'white';
    context.font = '20px monospace';
    context.textAlign = 'center';
    context.fillText('Press a key or click to start', Game.screen.x / 2, y);

    context.restore();
  }
}
