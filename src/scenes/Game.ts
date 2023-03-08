import Phaser from 'phaser';
import init from './../scripts/Initializator'
import {Localisation} from "../scripts/Localisation"
import {Food} from "../scripts/Food";
import Key = Phaser.Input.Keyboard.Key;

const MapXSize = 8, MapOffsetX = 72
const MapYSize = 8, MapOffsetY = 72
const MapSeqLength = 3
interface FoodPoint {
    food: Food,
    obj: Phaser.GameObjects.Sprite,
    x: number,
    y: number
}
interface vec2<T>{
    x: T, y: T
}
interface DragFoodPointData {
    foodPoint: FoodPoint,
    gameObject: Phaser.GameObjects.Sprite,
    startDragPosition:  vec2<number>,
    currentDragPosition: vec2<number>,
    swapsFoodPoint: FoodPoint | undefined,
    swapDirection: Direction
}

enum Direction {
    None,
    Up,
    Down,
    Right,
    Left
}
export default class MatchThree extends Phaser.Scene {
    private m_local: Localisation
    private m_foods: Food[] = []

    private m_map: Map<string, FoodPoint> = new Map<string, FoodPoint>()

    private m_scoreText: Phaser.GameObjects.Text | undefined

    private m_score = 0
    private dragData : DragFoodPointData | undefined

    constructor() {
        const {localisation} = init()
        const title = localisation.GetLocal('game.title')
        super(title)
        document.title = title
        this.m_local = localisation
    }

    preload() {
        this.load.image('apple-texture', 'assets/Food/Apple.png')
        this.load.image('apple-worm-texture', 'assets/Food/AppleWorm.png')
        this.load.image('avocado-texture', 'assets/Food/Avocado.png')
        this.load.image('bacon-texture', 'assets/Food/Bacon.png')

        const apple = new Food('apple', 2, 'apple-texture')
        const appleWorm = new Food('apple-worm', -5, 'apple-worm-texture')
        const avocado = new Food('avocado', 4, 'avocado-texture')
        const bacon = new Food('bacon', 6, 'bacon-texture')

        this.m_foods = [apple, appleWorm, avocado, bacon]
    }

    create() {
        let x = 0
        this.generateMap()

        this.input.keyboard.on('keydown-SPACE', this.checkMap, this);
        this.input.on('pointerdown', this.handleOnFoodClick, this)

        this.m_scoreText = this.add.text(0, 16, 'Score: 0')
    }
    update(time: number, delta: number) {
    }

    instantiateFood(food: Food, x: number, y: number) {
        const obj = this.add.sprite(x, y, food.textureName)

        return obj
    }

    makeInteractive(foodPoint: FoodPoint, obj: Phaser.GameObjects.Sprite){
        obj
            .setInteractive({ draggable: true })
            .on('dragstart', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                this.dragData = {
                    currentDragPosition: {x: dragX, y: dragY},
                    foodPoint: foodPoint,
                    gameObject: obj,
                    startDragPosition: {x: dragX, y: dragY},
                    swapsFoodPoint: undefined,
                    swapDirection: Direction.None
                }
            }, this);
        obj.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            this.dragData!.currentDragPosition = {x: dragX, y: dragY}
            const startPos = this.dragData?.startDragPosition!

            if(startPos.x > dragX)
                this.dragData!.swapDirection = Direction.Right
            else if(startPos.x < dragX)
                this.dragData!.swapDirection = Direction.Left
            else if(startPos.y < dragY)
                this.dragData!.swapDirection = Direction.Down
            else if(startPos.y > dragY)
                this.dragData!.swapDirection = Direction.Up


            obj.setPosition(dragX, dragY);
        }, this);
        obj.on('dragend', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean) => {
            let objects: FoodPoint[] = []

            switch (this.dragData!.swapDirection){
                case Direction.Down:
                    this.dragData!.swapsFoodPoint = this.m_map.get(MatchThree.getPosition(
                        this.dragData!.foodPoint.x,
                        this.dragData!.foodPoint.y + 1,
                    ))
                    break
                case Direction.Left:
                    this.dragData!.swapsFoodPoint = this.m_map.get(MatchThree.getPosition(
                        this.dragData!.foodPoint.x - 1,
                        this.dragData!.foodPoint.y,
                    ))
                    break
                case Direction.Up:
                    this.dragData!.swapsFoodPoint = this.m_map.get(MatchThree.getPosition(
                        this.dragData!.foodPoint.x,
                        this.dragData!.foodPoint.y - 1,
                    ))
                    break
                case Direction.Right:
                    this.dragData!.swapsFoodPoint = this.m_map.get(MatchThree.getPosition(
                        this.dragData!.foodPoint.x + 1,
                        this.dragData!.foodPoint.y,
                    ))
                    break
            }

            this.swapFood(this.dragData?.foodPoint!, this.dragData?.swapsFoodPoint!)

            switch (this.dragData!.swapDirection){
                case Direction.Down:
                    objects = this.checkDownNeighbours(
                        this.dragData!.foodPoint.x,
                        this.dragData!.foodPoint.y,
                        this.dragData!.foodPoint.food
                    )
                    break
                case Direction.Left:
                    objects = this.checkLeftNeighbours(
                        this.dragData!.foodPoint.x,
                        this.dragData!.foodPoint.y,
                        this.dragData!.foodPoint.food
                    )
                    break
                case Direction.Up:
                    objects = this.checkUpNeighbours(
                        this.dragData!.foodPoint.x,
                        this.dragData!.foodPoint.y,
                        this.dragData!.foodPoint.food
                    )
                    break
                case Direction.Right:
                    objects = this.checkRightNeighbours(
                        this.dragData!.foodPoint.x,
                        this.dragData!.foodPoint.y,
                        this.dragData!.foodPoint.food
                    )
                    break
            }

            if(objects.length){
                this.replaceFoods(objects)
            }
            else {

                this.swapFood(this.dragData?.foodPoint!, this.dragData?.swapsFoodPoint!)


            }
        }, this);
    }
    static getPosition(x: number, y: number){
        return x + ':' + y
    }
    swapFood(dst: FoodPoint, src: FoodPoint){
        const tmp = dst
        const pos = {x: dst.x, y: dst.y}

        dst.x = src.x
        dst.y = src.y

        src.x = pos.x
        src.y = pos.y

        this.m_map.set(MatchThree.getPosition(dst.x, dst.y), dst)
        this.m_map.set(MatchThree.getPosition(src.x, src.y), src)

        dst.obj.setPosition(MapOffsetX + dst.x * 16, MapOffsetY + dst.y * 16)
        src.obj.setPosition(MapOffsetX + src.x * 16, MapOffsetY + src.y * 16)
    }
    handleOnFoodClick(pointer: Phaser.Input.Pointer, objectsClicked: Phaser.GameObjects.GameObject[]){
        const obj = pointer
    }
    generateMap() {
        for (let value of this.m_map.values()) {
            value.obj.destroy()
        }
        this.m_map.clear()

        for (let x = 0; x < MapXSize; x++) {
            for (let y = 0; y < MapYSize; y++) {
                const rndIdx = Math.round(Math.random() * (this.m_foods.length - 1))
                const food = this.m_foods.at(rndIdx)!

                const obj = this.instantiateFood(food, MapOffsetX + x * 16, MapOffsetY + y * 16)
                const foodPoint = {
                    food: food,
                    obj: obj,
                    x: x,
                    y: y
                }

                this.makeInteractive(foodPoint, obj)

                this.m_map.set(
                    MatchThree.getPosition(x, y),
                    foodPoint
                )
            }
        }
    }
    replaceFoods(foods: FoodPoint[]){
        for (let foodPoint of foods) {
            const rndIdx = Math.round(Math.random() * (this.m_foods.length - 1))
            const food = this.m_foods[rndIdx]
            foodPoint.obj.destroy()
            this.m_score += foodPoint.food.points

            const obj = this.instantiateFood(food, MapOffsetX + foodPoint.x * 16, MapOffsetY + foodPoint.y * 16)
            const newFoodPoint = {
                food: food,
                obj: obj,
                x: foodPoint.x,
                y: foodPoint.y
            }
            this.makeInteractive(newFoodPoint, obj)
            this.m_map.set(
                MatchThree.getPosition(foodPoint.x, foodPoint.y),
                newFoodPoint
            )
        }
    }

    checkMap(): boolean {
        let earned = false

        const objectsToReplace = new Set<FoodPoint>()

        const add = (a: FoodPoint[]) => {
            for (let foodPoint of a) {
                objectsToReplace.add(foodPoint)
            }
        }
        for (let x = 0; x < MapXSize; x++) {
            for (let y = 0; y < MapYSize; y++) {
                const foodPoint = this.m_map.get(MatchThree.getPosition(x, y))

                const curFood = foodPoint!.food

                add(this.checkRightNeighbours(x, y, curFood))
                add(this.checkLeftNeighbours(x, y, curFood))
                add(this.checkDownNeighbours(x, y, curFood))
                add(this.checkUpNeighbours(x, y, curFood))
            }
        }

        this.replaceFoods(new Array<FoodPoint>(...objectsToReplace.values()))

        this.m_scoreText!.text = "Score: " + this.m_score
        return objectsToReplace.size > 0
    }

    checkRightNeighbours(x: number, y: number, food: Food): FoodPoint[] {
        const objs = []

        if(x + MapSeqLength >= MapXSize - 1) return []

        for (let i = 0; i < MapSeqLength; i++) {
            const neighbour = this.m_map.get(MatchThree.getPosition(x + i, y))!

            if (neighbour.food !== food)
                return []

            objs.push(neighbour)
        }

        return objs
    }

    checkLeftNeighbours(x: number, y: number, food: Food): FoodPoint[] {
        const objs = []

        if(x - MapSeqLength < 0) return []

        for (let i = 0; i < MapSeqLength; i++) {
            const neighbour = this.m_map.get(MatchThree.getPosition(x - 1, y))!

            if (neighbour.food !== food)
                return []

            objs.push(neighbour)
        }

        return objs
    }

    checkDownNeighbours(x: number, y: number, food: Food): FoodPoint[] {
        const objs = []

        if(y + MapSeqLength >= MapYSize - 1) return []

        for (let i = 0; i < MapSeqLength; i++) {
            const neighbour = this.m_map.get(MatchThree.getPosition(x, y + i))!

            if (neighbour.food !== food)
                return []

            objs.push(neighbour)
        }

        return objs
    }

    checkUpNeighbours(x: number, y: number, food: Food): FoodPoint[] {
        const objs = []

        if(y - MapSeqLength < 0) return []

        for (let i = 0; i < MapSeqLength; i++) {
            const neighbour = this.m_map.get(MatchThree.getPosition(x, y - i))!

            if (neighbour.food !== food)
                return []

            objs.push(neighbour)
        }

        return objs
    }
}
