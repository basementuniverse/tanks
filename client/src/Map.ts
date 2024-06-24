import ContentManager from '@basementuniverse/content-manager';
import {
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  Scene,
  Texture,
  Vector3 as vec3,
} from 'three';
import { Building } from './Building';
import { Sky } from './Sky';

type MapLayout = {
  sx: number;
  sz: number;
  buildings: {
    x: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
  }[];
};

export class Map {
  public ground: Mesh;

  public buildings: Building[] = [];

  public sky: Sky;

  public constructor() {
    const mapLayout = ContentManager.get<MapLayout>('map-layout');
    if (!mapLayout) {
      throw new Error('Unable to load map layout');
    }

    const groundImage = ContentManager.get<HTMLImageElement>('map-ground');
    if (!groundImage) {
      throw new Error('Unable to load ground image');
    }

    const groundTexture = new Texture(groundImage);
    groundTexture.needsUpdate = true;

    this.ground = new Mesh(
      new PlaneBufferGeometry(mapLayout.sx, mapLayout.sz),
      new MeshBasicMaterial({
        map: groundTexture,
      })
    );
    this.ground.rotateX(-Math.PI / 2);
    this.ground.position.set(0, 0, 0);

    for (const building of mapLayout.buildings) {
      this.buildings.push(
        new Building(
          new vec3(
            building.x - mapLayout.sx / 2,
            0,
            building.z - mapLayout.sz / 2
          ),
          new vec3(building.sx, building.sy, building.sz)
        )
      );
    }

    this.sky = new Sky();
  }

  public setupScene(scene: Scene) {
    scene.add(this.ground);
    for (const building of this.buildings) {
      scene.add(building.building);
    }
    scene.background = this.sky.skybox;
  }
}
