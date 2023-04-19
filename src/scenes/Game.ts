import Phaser from 'phaser';
import init from './../scripts/Initializator'
import {Localisation} from "../scripts/Localisation"
import replace from "@rollup/plugin-replace";

interface vec2<T>{
    x: T, y: T
}

const SHIP_SPEED = 4
const ASTEROID_ROTATION_SPEED = 0.025;
export default class MatchThree extends Phaser.Scene {
    private m_local: Localisation
    private m_score = 0
    private ship: Phaser.GameObjects.Sprite | undefined
    private asteroidPool: Phaser.GameObjects.Sprite[] = []
    private activeAsteroids: Set<Phaser.GameObjects.Sprite> = new Set<Phaser.GameObjects.Sprite>()
    private spawnAsteroids: boolean = false
    private asteroidSpeed: number = 2
    private difficult: number = 1000
    private isGameOver: boolean = false
    private isGameStarted: boolean = false
    private scaleModificator: number = 1
    get m_best(): number {
        return Number(localStorage.getItem('bestScore') || 0)
    }

    set m_best(val: number) {
        localStorage.setItem('bestScore', String(val))
    }
    constructor() {
        const {localisation} = init()
        const title = localisation.GetLocal('game.title')
        super(title)
        document.title = title
        this.m_local = localisation
    }

    preload() {
        this.load.spritesheet('ship', 'assets/ship.png', {
            frameHeight: 24,
            frameWidth: 16,
        })
        this.load.image('asteroid', 'assets/asteroid.png')

        this.scaleModificator = ((24*this.game.scale.height) / 256) / 24

        document.getElementById("startgame_text")!
            .textContent = this.m_local.GetLocal('game.start.text')
    }

    create() {
        this.ship = this.add.sprite(128, this.game.scale.height * 0.75, 'ship')

        this.ship.setScale(this.scaleModificator)
        this.physics.add.existing(this.ship)

        this.ship.anims.create({
            key: 'default',
            frames: 'ship',
            frameRate: 30,
            repeat:-1
        })

        this.ship.anims.play('default')

        this.ship.setInteractive({ draggable: true })

        this.input.on('drag', (event: Phaser.Input.Pointer, dragX: number) => {
            this.ship!.x = Math.max(Math.min(event.x, this.game.scale.width - 8*this.scaleModificator), 8*this.scaleModificator)
        })
        document.onclick = () => {
            this.startGame()

            document.onclick = null
        }
        this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
            const key = event.key

            if(!this.isGameStarted)
            {
                this.startGame()
            }
            switch (key){
                case "d":
                case "D":
                case "ArrowRight":
                    if(this.ship!.x + SHIP_SPEED < this.game.scale.width - 8*this.scaleModificator)
                        this.ship!.x += SHIP_SPEED;
                    else
                        this.ship!.x = this.game.scale.width - 8*this.scaleModificator

                    break

                case "a":
                case "A":
                case "ArrowLeft":
                    if(this.ship!.x - SHIP_SPEED > 8*this.scaleModificator)
                        this.ship!.x -= SHIP_SPEED;
                    else
                        this.ship!.x = 8*this.scaleModificator

                    break
            }
        })

        this.setScoreText()
    }


    private startGame() {
        this.isGameStarted = true
        this.startSpawnCycle()


        document.getElementById("startgame")!.classList.add('hidden')
    }

    update(time: number, delta: number) {
        if(this.isGameOver || !this.isGameStarted) return

        for (const activeAsteroid of this.activeAsteroids) {
            activeAsteroid.y += this.asteroidSpeed;
            activeAsteroid.rotation += ASTEROID_ROTATION_SPEED
            if(activeAsteroid.y >= (this.game.scale.height + 38*this.scaleModificator)){
                this.removeAsteroid(activeAsteroid)

                this.m_score += 1
                this.setScoreText()
                this.difficult = Math.max(1000 * Math.pow(0.99, (this.m_score + 2) / 2), 280) * this.scaleModificator
                this.asteroidSpeed = Math.min(2 * Math.pow(1.01, (this.m_score + 2) / 2), 5) * this.scaleModificator

                console.log({
                    difficult: this.difficult,
                    asteroidSpeed: this.asteroidSpeed,
                    poolSize: this.asteroidPool.length,
                    activeAsteroidsCount: this.activeAsteroids.size
                })
            }

            const isCollidesWithShip = this.physics.collide(activeAsteroid, this.ship)

            if(isCollidesWithShip){
                console.log('gameover')
                this.gameOver()
            }
        }
    }
    private gameOver(){
        this.spawnAsteroids = false

        this.isGameOver = true

        const gameoverEl = document.getElementById('gameover')!

        gameoverEl.classList.remove('hidden')

        const loseText = gameoverEl.querySelector('#lose_text')!
        const scoreText = gameoverEl.querySelector('#total_score_text')!
        const bestScoreText = gameoverEl.querySelector('#best_score_text')!
        const restartBtn = gameoverEl.querySelector('#restart_button')! as HTMLButtonElement
        const continueBtn = gameoverEl.querySelector('#revive_show_add_button')! as HTMLButtonElement

        loseText.textContent = this.m_local.GetLocal('game.lose_text')
        scoreText.textContent = this.m_local.GetLocal('game.score_text') + this.m_score
        bestScoreText.textContent = this.m_local.GetLocal('game.best_score_text') + (this.m_score > this.m_best ? this.m_best = this.m_score : this.m_best)
        restartBtn.textContent = this.m_local.GetLocal('game.restart.text')
        continueBtn.textContent = this.m_local.GetLocal('game.continue.text')

        restartBtn.onclick = () => {
            this.restart()
        }

        continueBtn.onclick = () => {

        }

    }
    private startSpawnCycle(){
        this.spawnAsteroids = true

        const closure = () => {
            if(!this.spawnAsteroids) return

            this.spawnAsteroid()

            setTimeout(closure,this.difficult)
        }

        setTimeout(closure)
    }

    private spawnAsteroid(){
        const x = Math.max(
            Math.min(
            Math.random() * this.game.scale.width,
                this.game.scale.width - 19*this.scaleModificator
            ),
            19*this.scaleModificator
        )
        this.addAsteroid(x, -20*this.scaleModificator)
    }

    private addAsteroid(x: number, y: number){

        let asteroid

        if(this.asteroidPool.length !== 0) {
            asteroid = this.asteroidPool.pop()!
            asteroid.setVisible(true)
            asteroid.addToUpdateList()
            asteroid.x = x
            asteroid.y = y
        }
        else {
            asteroid = this.add.sprite(x, y, 'asteroid')
            asteroid.setScale(this.scaleModificator)
            this.physics.add.existing(asteroid)
            const body = asteroid.body as Phaser.Physics.Arcade.Body

            body.setSize(asteroid.width*0.75, this.scaleModificator)
            body.offset.y = asteroid.height - this.scaleModificator

        }


        this.activeAsteroids.add(asteroid)


        return asteroid
    }

    private removeAsteroid(asteroid: Phaser.GameObjects.Sprite){
        this.activeAsteroids.delete(asteroid)

        asteroid.setVisible(false)
        asteroid.removeFromUpdateList()

        this.asteroidPool.push(asteroid)
    }

    private setScoreText(){
        document.getElementById("score_text")!
            .textContent = this.m_local.GetLocal('game.score_text') + this.m_score
    }

    private restart() {
        this.isGameOver = false
        this.m_score = 0

        this.removeActiveAsteroids()
        this.startSpawnCycle()

        const gameoverEl = document.getElementById('gameover')!

        gameoverEl.classList.add('hidden')
    }

    private removeActiveAsteroids() {
        for (const activeAsteroid of this.activeAsteroids) {
            this.removeAsteroid(activeAsteroid)
        }
    }
}
