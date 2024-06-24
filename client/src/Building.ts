import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector3 as vec3,
} from 'three';

export class Building {
  public building: Mesh;

  public constructor(public position: vec3, public size: vec3) {
    const buildingGeometry = new BoxGeometry(size.x, size.y, size.z);
    const buildingMaterial = new MeshStandardMaterial({ color: 0x998877 });

    this.building = new Mesh(buildingGeometry, buildingMaterial);
    this.building.position.set(position.x, size.y / 2, position.z);
  }
}
