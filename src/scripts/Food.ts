import Phaser from "phaser";

export class Food {
    public points: number = 0
    public textureName: string = ""
    public name: string = ""

    constructor(name: string, points: number, textureName: string) {
        this.points = points
        this.name = name
        this.textureName = textureName
    }
}