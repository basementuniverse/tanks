import ContentManager from '@basementuniverse/content-manager';
import { CubeTexture } from 'three';

export class Sky {
  public skybox: CubeTexture;

  public constructor() {
    const skybox1 = ContentManager.get<HTMLImageElement>('skybox-side');
    const skybox2 = ContentManager.get<HTMLImageElement>('skybox-side');
    const skybox3 = ContentManager.get<HTMLImageElement>('skybox-top');
    const skybox4 = ContentManager.get<HTMLImageElement>('skybox-bottom');
    const skybox5 = ContentManager.get<HTMLImageElement>('skybox-side');
    const skybox6 = ContentManager.get<HTMLImageElement>('skybox-side');

    if (!skybox1 || !skybox2 || !skybox3 || !skybox4 || !skybox5 || !skybox6) {
      throw new Error('Unable to load skybox textures');
    }

    this.skybox = new CubeTexture([
      skybox1,
      skybox2,
      skybox3,
      skybox4,
      skybox5,
      skybox6,
    ]);
    this.skybox.needsUpdate = true;
  }
}
