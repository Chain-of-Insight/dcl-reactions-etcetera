import utils from '../../node_modules/decentraland-ecs-utils/index';
import { InterpolationType } from '../../node_modules/decentraland-ecs-utils/transform/math/interpolation';
import * as ui from '../../node_modules/@dcl/ui-utils/index';
import { ImageSection } from '../../node_modules/@dcl/ui-utils/utils/types';

// External params
const ZINCITE = "zincite";

let inventory = [];
let minSpawnX = 4;
let maxSpawnX = 60;
let minSpawnY = 65;
let maxSpawnY = 120;
let currentSpawns = {
  x: [],
  z: []
};
const X_COORD = 0;
const Y_COORD = 1;
const S_COORD = 2;

// Sounds
// Mining sound effect
const diggingSound = new Entity();
diggingSound.addComponent(
  new AudioSource(
    new AudioClip('sounds/shovel.mp3')
  )
);
diggingSound.addComponent(new Transform());
diggingSound.getComponent(Transform).position = Camera.instance.position;
engine.addEntity(diggingSound);

// Mineral
export class Mineral extends Entity {
  constructor(
    // Constructed
    model: Entity,
    public mineralType: string,
    public spritePosition: ImageSection,
    // Defaulted
    private isMining: boolean = false,
    private icon: ui.SmallIcon = null,
  ) {
    super();

    this.addComponent(model);

    let position = this.getSpawnPosition();
    let scale = this.getSpawnScale();
    this.addComponent(new Transform({
      position: new Vector3(position.x, position.y ,position.z),
      scale: new Vector3(scale.x, scale.y, scale.z)
    }));

    // XXX TODO: add random model scale size
    //here

    engine.addEntity(this);

    this.addComponent(
      new OnPointerDown(
        (e) => {
          if (inventory.length < 3) {
            // Play digging sound
            diggingSound.getComponent(AudioSource).playOnce();
            // Reduce or remove pile ore deposit
            this.miningEvent(this.mineralType);
          } else {
            ui.displayAnnouncement('You\'re carrying a heavy load');
          }
        },
        { 
          button: ActionButton.POINTER, 
          hoverText: (this.mineralType == ZINCITE) ? this.mineralType + ' crystal' : this.mineralType + ' ore' 
        }
      )
    );
  }

  private getSpawnPosition() {
    let randomX = this.randomCoordinate(X_COORD);
    let randomZ = this.randomCoordinate(Y_COORD);

    let spawnPosition = {
      x: randomX,
      y: 0,
      z: randomZ
    };

    currentSpawns.x.push(spawnPosition.x);
    currentSpawns.z.push(spawnPosition.z);

    return spawnPosition;
  };

  private getSpawnScale() {
    let randomS = this.randomCoordinate(S_COORD);

    let spawnScale = {
      x: randomS,
      y: randomS,
      z: randomS
    };

    return spawnScale;
  };

  public getInventory(): Array<string> {
    return inventory;
  };

  public destroy() {
    if (this.icon) {
      this.icon.image.visible = false;
    }
    if (this.isAddedToEngine()) {
      engine.removeEntity(this);
    }
  };

  public reset() {
    if (inventory.length) {
      inventory = [];
    }

    if (currentSpawns.x.length) {
      currentSpawns.x = [];
    }

    if (currentSpawns.z.length) {
      currentSpawns.z = [];
    }

    if (this.icon) {
      this.icon.image.visible = false;
    }

    if (this.isAddedToEngine()) {
      engine.removeEntity(this);
    }

    this.isMining = false;

    let position = this.getSpawnPosition();
    this.addComponentOrReplace(new Transform({
      position: new Vector3(position.x, position.y ,position.z),
      scale: new Vector3(1,1,1)
    }));

    engine.addEntity(this);
  }

  private randomCoordinate(spawn: number = 0) {
    let randomNum;
    
    // XXX (note): Um, so this collider protection doesn't really work
    if (spawn == X_COORD) {
      let randomNumX = Math.round(Math.random() * (maxSpawnX - minSpawnX) + minSpawnX);
      if (
        currentSpawns.x.indexOf(randomNumX) !== -1 
        && currentSpawns.x.indexOf(randomNumX + 1) !== -1 
        && currentSpawns.x.indexOf(randomNumX - 1) !== -1 
        && currentSpawns.x.indexOf(randomNumX + 2) !== -1 
        && currentSpawns.x.indexOf(randomNumX - 2) !== -1  
      ) {
        randomNum = this.randomCoordinate(X_COORD);
      } else {
        randomNum = randomNumX;
      }

    } else if (spawn == Y_COORD) {
      let randomNumY = Math.round(Math.random() * (maxSpawnY - minSpawnY) + minSpawnY);
      if (
        currentSpawns.z.indexOf(randomNumY) !== -1
        && currentSpawns.z.indexOf(randomNumY + 1) !== -1 
        && currentSpawns.z.indexOf(randomNumY - 1) !== -1 
        && currentSpawns.z.indexOf(randomNumY + 2) !== -1 
        && currentSpawns.z.indexOf(randomNumY - 2) !== -1 
      ) {
        randomNum = this.randomCoordinate(Y_COORD);
      } else {
        randomNum = randomNumY;
      }
    } else if (spawn == S_COORD) {
      randomNum = Math.random() + 0.2;
    }

    return randomNum;
  }

  private miningEvent(type: string) {
    let ucaseType = type.charAt(0).toUpperCase() + type.slice(1);

    // Handle mining event
    if (this.isMining) {
      engine.removeEntity(this);
      let xOffset = 0;
      switch (inventory.length) {
        case 0:
          xOffset = -25;
          break;
        case 1:
          xOffset = -80;
          break;
        case 2:
          xOffset = -135;
          break;
      }
  
      // Handle Inventory
      this.icon = new ui.SmallIcon(
        'models/alchemy/icons/ores.png', 
        // x, y
        xOffset, 80, 
        // Width, height
        48, 48, 
        // Sprite sheet position
        this.spritePosition
      );
      
      // Add to inventory
      inventory.push(type);
  
      // Inform player of inventory item
      ui.displayAnnouncement(ucaseType + ' added to your inventory');
  
    } else {
      this.isMining = true;
      let currentScale = this.getComponent(Transform).scale.z;
      let startScale = new Vector3(currentScale * 0.75, currentScale * 0.75, currentScale * 0.75);
      let endScale = new Vector3(currentScale * 0.35, currentScale * 0.35, currentScale * 0.45);
  
      this.addComponent(
        new utils.ScaleTransformComponent(
          startScale,
          endScale,
          0.5,
          null,
          InterpolationType.LINEAR
        )
      );
    }
  };
};