import ContentManager from '@basementuniverse/content-manager';
import InputManager from '@basementuniverse/input-manager';
import { clamp } from '@basementuniverse/utils';
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3 as vec3,
} from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { Camera } from './Camera';

export class Tank {
  private static readonly SCALE: number = 10;

  private static readonly ACCELERATION: number = 9;

  private static readonly ROLLING_FRICTION: number = 0.25;

  private static readonly MAX_SPEED: number = 30;

  private static readonly TURN_SPEED: number = 1.2;

  private static readonly TURRET_TURN_SPEED: number = 1;

  public tank: Group;

  private body: Group;

  private turret: Group;

  private thrust: number = 0;

  private turn: number = 0;

  private turretTurn: number = 0;

  private speed: number = 0;

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

  public update(dt: number, camera: Camera) {
    let cameraWorldDirection: vec3 = new vec3();
    camera.camera.getWorldDirection(cameraWorldDirection);
    const cameraTheta = Math.atan2(cameraWorldDirection.x, cameraWorldDirection.z);

    let turretWorldDirection: vec3 = new vec3();
    this.turret.getWorldDirection(turretWorldDirection);
    const turretTheta = Math.atan2(turretWorldDirection.x, turretWorldDirection.z);

    this.turretTurn = cameraTheta - turretTheta;
    if (this.turretTurn > Math.PI) {
      this.turretTurn -= Math.PI * 2;
    }
    if (this.turretTurn < -Math.PI) {
      this.turretTurn += Math.PI * 2;
    }
    const turretTurnAmount = this.turretTurn * Tank.TURRET_TURN_SPEED * dt;

    this.turret.rotation.y += turretTurnAmount;
    this.turretDirection = this.turret.rotation.y;

    this.thrust = 0;
    if (InputManager.keyDown('KeyW') && !InputManager.keyDown('KeyS')) {
      this.thrust = 1;
    }
    if (InputManager.keyDown('KeyS') && !InputManager.keyDown('KeyW')) {
      this.thrust = -1;
    }

    this.speed += this.thrust * Tank.ACCELERATION * dt;
    this.speed = clamp(this.speed, -Tank.MAX_SPEED, Tank.MAX_SPEED);

    if (!InputManager.keyDown('KeyS') && !InputManager.keyDown('KeyW')) {
      this.speed *= 1 - Tank.ROLLING_FRICTION * dt;
    }

    if (Math.abs(this.speed) < 0.1) {
      this.speed = 0;
    }

    this.turn = 0;
    if (InputManager.keyDown('KeyA') && !InputManager.keyDown('KeyD')) {
      this.turn = 1;
    }
    if (InputManager.keyDown('KeyD') && !InputManager.keyDown('KeyA')) {
      this.turn = -1;
    }

    const turnAmount = this.turn * Tank.TURN_SPEED * dt;

    this.tank.rotation.y += turnAmount;
    this.direction = this.tank.rotation.y;

    this.tank.translateZ(this.speed * dt);
    this.position.copy(this.tank.position);
  }
}
