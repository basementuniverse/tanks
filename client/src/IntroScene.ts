import ContentManager from '@basementuniverse/content-manager';
import InputManager from '@basementuniverse/input-manager';
import SceneManager, {
  Scene,
  SceneTransitionState,
} from '@basementuniverse/scene-manager';
import { vec } from '@basementuniverse/vec';
import Game from './Game';
import { MenuScene } from './MenuScene';

export class IntroScene extends Scene {
  private static readonly TRANSITION_TIME: number = 2;

  public constructor() {
    super({
      transitionTime: IntroScene.TRANSITION_TIME,
    });
  }

  public initialise() {}

  public update(dt: number) {
    if (InputManager.keyPressed() || InputManager.mousePressed()) {
      SceneManager.pop();
      SceneManager.push(new MenuScene());
    }
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();

    if (this.transitionState !== SceneTransitionState.None) {
      context.globalAlpha = this.transitionAmount;
    }

    const logo = ContentManager.get<HTMLImageElement>('basement-universe');
    if (logo) {
      const center = vec.mul(Game.screen, 0.5);
      const logoSize = vec(logo.width, logo.height);
      context.drawImage(
        logo,
        center.x - logoSize.x / 2,
        center.y - logoSize.y / 2,
        logoSize.x,
        logoSize.y
      );
    }

    context.restore();
  }
}
