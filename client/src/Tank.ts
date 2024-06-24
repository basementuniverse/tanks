import ContentManager from '@basementuniverse/content-manager';
import { Group, Mesh, MeshStandardMaterial, Vector3 as vec3 } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

export class Tank {
  private static readonly SCALE: number = 10;

  public tank: Group;

  private body: Group;

  public turret: Group;

  public constructor(
    public colour: string,
    public position: vec3,
    public direction: number,
    public turretDirection: number
  ) {
    const objData = ContentManager.get<string>('tank-mesh');
    if (!objData) {
      throw new Error('Unable to load tank mesh');
    }

    const loader = new OBJLoader();
    const obj = loader.parse(objData);

    const material = new MeshStandardMaterial({
      color: this.colour,
    });

    this.tank = new Group();
    this.tank.position.copy(position);
    this.tank.rotation.y = direction;
    this.tank.scale.set(Tank.SCALE, Tank.SCALE, Tank.SCALE);

    this.body = new Group();
    const body = obj.children[0] as Mesh;
    body.material = material;
    this.body.add(body);

    this.turret = new Group();
    this.turret.position.set(0, 0, -0.2);
    const turretBase = obj.children[0] as Mesh;
    const turret = obj.children[1] as Mesh;
    turretBase.material = material;
    turret.material = material;
    turretBase.geometry.translate(0, 0, 0.2);
    turret.geometry.translate(0, 0, 0.2);
    this.turret.add(turretBase);
    this.turret.add(turret);

    this.tank.add(this.body);
    this.tank.add(this.turret);
  }

  public onUpdate(position: vec3, direction: number, turretDirection: number) {
    this.position.set(position.x, position.y, position.z);
    this.tank.position.set(position.x, position.y, position.z);

    this.direction = direction;
    this.tank.rotation.y = direction;

    this.turretDirection = turretDirection;
    this.turret.rotation.y = turretDirection;
  }
}
