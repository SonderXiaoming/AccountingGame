import { GameObjects, Physics } from "phaser";
import { Bullet } from "./Bullet";

export class Player extends Physics.Arcade.Image {

    // Player states: waiting, start, can_move
    state = "waiting";
    // propulsion_fire = null;
    scene = null;
    bullets = null;
    ball = null;

    constructor({ scene }) {
        super(scene, -190, 100, "player");
        this.scene = scene;
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        // this.propulsion_fire = this.scene.add.sprite(this.x - 32, this.y, "propulsion-fire");
        // this.propulsion_fire.play("fire");

        // Bullets group to create pool
        this.bullets = this.scene.physics.add.group({
            classType: Bullet,
            maxSize: 100,
            runChildUpdate: true
        });
        this.setDepth(114514);

        this.moved_by_belt_this_frame = false;
    }

    start() {
        this.state = "start";
        // const propulsion_fires_trail = [];

        // Effect to move the player from left to right
        this.scene.tweens.add({
            targets: this,
            x: 200,
            duration: 800,
            delay: 1000,
            ease: "Power2",
            yoyo: false,
            onUpdate: () => {
                // Just a little trail FX
                // const propulsion = this.scene.add.sprite(this.x - 32, this.y, "propulsion-fire");
                // propulsion.play("fire");
                // propulsion_fires_trail.push(propulsion);
            },
            onComplete: () => {
                // Destroy all the trail FX
                // propulsion_fires_trail.forEach((propulsion, i) => {
                //     this.scene.tweens.add({
                //         targets: propulsion,
                //         alpha: 0,
                //         scale: 0.5,
                //         duration: 200 + (i * 2),
                //         ease: "Power2",
                //         onComplete: () => {
                //             propulsion.destroy();
                //         }
                //     });
                // });

                // this.propulsion_fire.setPosition(this.x - 32, this.y);

                // When all tween are finished, the player can move
                this.state = "can_move";
            }
        });
    }

    move(direction) {
        if (this.state === "can_move") {
            if (direction === "up") {
                this.y -= 5;
                //this.updatePropulsionFire();
            } else if (direction === "down") {
                this.y += 5;
                //this.updatePropulsionFire();
            }

            if (direction === "left") {
                this.x -= 5;
                //this.updatePropulsionFire();
            } else if (direction === "right") {
                this.x += 5;
                //this.updatePropulsionFire();
            }
        }
    }

    fire(x, y) {
        if (this.state === "can_move") {
            // Create bullet
            const bullet = this.bullets.get();
            if (bullet) {
                bullet.fire(this.x + 16, this.y + 5, x, y);
            }
        }
    }

    // updatePropulsionFire() {
    //     this.propulsion_fire.setPosition(this.x - 32, this.y);
    // }

    pick(ball) {
        if (this.ball && this.ball.state === "picked") {
            return;
        } // Ball already picked
        this.ball = ball;
        this.ball.state = "picked";
        if (this.ball.pit_number != null) {
            this.scene.pit_fullnesses[this.ball.pit_number] = false;
            this.ball.pit_number = null;
        }
    }

    drop() {
        this.ball.direction_belt_label = null;
        this.ball.state = null;
        this.ball = null;
    }

    update() {
        this.moved_by_belt_this_frame = false;

        // Sinusoidal movement up and down up and down 2px
        this.y += Math.sin(this.scene.time.now / 200) * 0.10;
        // this.propulsion_fire.y = this.y;
        if (this.ball) {
            this.ball.setPosition(this.x, this.y - 20);
        }
    }

}