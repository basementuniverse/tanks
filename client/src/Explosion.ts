import {
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3 as vec3,
} from 'three';

export class Explosion {
  private static readonly RADIUS = 20;

  public explosion: Mesh;

  constructor(public id: string, public position: vec3) {
    const material = new MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.5,
    });

    const geometry = new SphereGeometry(Explosion.RADIUS, 16, 16);

    this.explosion = new Mesh(geometry, material);
    this.explosion.position.copy(position);
    this.explosion.scale.set(1, 1, 1);
  }
}
