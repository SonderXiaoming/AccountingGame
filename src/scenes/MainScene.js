import { NONE, Scene } from "phaser";
import { Player } from "../gameobjects/Player";
import { BlueEnemy } from "../gameobjects/BlueEnemy";
import { ConveyorBelt } from "../gameobjects/ConveyorBelt";

import { Ball } from "../gameobjects/Ball";
import { Basket } from "../gameobjects/Basket";
import axios from 'axios';
export const base_url = import.meta.env.VITE_API_URL;

const DEBIT = "debit";
const CREDIT = "credit";
const ASSETS = "assets";
const LIABITILITIES = "liabilities";
const STAKEHOLDERS_EQUITY = "stakeholders_equity";
const EXPENSES = "expenses";
const REVENUES = "revenues";

const fetchData = async (num_ball, game_type, retries = 3, delay = 1000) => {
    let api_url = null;
    if (game_type == "debit_credit") {
        api_url = `${base_url}/get_random_nb_elements`;
    } else if (game_type == "accounting") {
        api_url = `${base_url}/get_random_all_elements`;
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(api_url, { num: num_ball }, { withCredentials: true });
            console.log(response.data);
            return response.data; // success, return early
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, delay)); // wait before retry
            } else {
                console.error("All attempts failed.");
                throw error; // after all attempts have failed, throw the error
            }
        }
    }
};

const config = {
    num_balls_at_time: 4,
    // The following two are in secs
    time_limit: 20000,
    time_between_ball_spawns: 1000,
    // This is in frames
    time_move_across_screen: 600
}

export class MainScene extends Scene {
    player = null;
    // Easy fix to make it where we can use same key for picking up and putting down
    player_dropped_ball_this_frame = false;
    enemy_blue = null;
    cursors = null;

    points;
    game_over_timeout;


    config = config


    constructor() {
        super("MainScene");
    }

    init(data) {
        this.ballCount = 0;
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        const game_type = data.type || "accounting"; // "debit_credit" or "accounting"
        if (game_type == "debit_credit") {
            this.config.basket_types = [DEBIT, CREDIT];
            this.config.belt_types = [NONE, NONE, NONE, DEBIT, CREDIT];
            this.config.belt_labels = [4, 5];
        }
        else if (game_type == "accounting") {
            this.config.basket_types = [ASSETS, LIABITILITIES, STAKEHOLDERS_EQUITY, REVENUES, EXPENSES];
            this.config.belt_types = [ASSETS, LIABITILITIES, STAKEHOLDERS_EQUITY, REVENUES, EXPENSES];
            this.config.belt_labels = [1, 2, 3, 4, 5];
        }

        const NUM_BALLS = Math.ceil(this.config.time_limit / this.config.time_between_ball_spawns);

        // Reset points
        this.points = 0;
        this.game_over_timeout = this.config.time_limit / 1000;
        fetchData(NUM_BALLS, game_type).then((data) => {
            this.elements = data;
            this.scene.launch("MenuScene");
        }).catch((error) => {
            console.error("Failed to fetch data:", error);
        });

        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    addBall() {
        if (this.ballCount < this.elements.length) {
            if (this.balls.getLength() < this.config.num_balls_at_time) {
                let starting_conveyor_belt = this.starting_conveyor_belts[Math.floor(Math.random() * this.starting_conveyor_belts.length)];

                let ball = new Ball(this, starting_conveyor_belt.x, starting_conveyor_belt.y, this.elements[this.ballCount].name, this.elements[this.ballCount].type);
                ball.start();
                this.balls.add(ball);
                this.ballCount++;
            }
        } else {
            throw new Error("Ran out of balls");
        }
    }

    create() {
        this.add.image(0, 0, "background")
            .setOrigin(0, 0);
        this.add.image(0, this.scale.height, "floor").setOrigin(0, 1);

        // TO DO
        // Load from player choice
        //let belts_chosen = [1, 2, 3, 4, 5];
        //let belt_types = [ASSETS, LIABITILITIES, STAKEHOLDERS_EQUITY, REVENUES, EXPENSES];

        // DEBIT VS CREDIT
        let belts_chosen = this.config.belt_labels;
        let belt_types = this.config.belt_types;

        // Place Conveyor Belts and Vocab Baskets
        this.conveyor_belts = [];
        this.baskets = [];
        this.starting_conveyor_belts = [];
        belts_chosen.forEach((belt_label) => {
            this.conveyor_belts.push(new ConveyorBelt(this));

            // Assumes default sprite for ConveyorBelt is up/down
            const BELT_WIDTH = this.conveyor_belts[this.conveyor_belts.length - 1].width;
            const BELT_HEIGHT = this.conveyor_belts[this.conveyor_belts.length - 1].height;

            let num_belts = NONE
            if (belt_label == 1 || belt_label == 2 || belt_label == 3) {
                num_belts = this.scale.height / BELT_HEIGHT;
            } else if (belt_label == 4 || belt_label == 5) {
                num_belts = this.scale.width / BELT_HEIGHT;
            } else {
                throw new Error("Undefined Conveyor Belt Choice");
            }

            // ___1___2___3___
            // |
            // 4
            // |
            // 5
            // |
            // belt_num: int - how many belts along it is (0 is the first one)
            function get_pos_from_belt_and_num(scene, belt_label, belt_num) {
                let x;
                let y;

                if (belt_label == 1 || belt_label == 3) {
                    x = ((scene.scale.width / 4) * belt_label)
                    y = belt_num * BELT_HEIGHT + (BELT_HEIGHT / 2)
                } else if (belt_label == 2) {
                    x = ((scene.scale.width / 4) * belt_label)
                    y = scene.scale.height - (belt_num * BELT_HEIGHT + (BELT_HEIGHT / 2))
                } else if (belt_label == 5) {
                    y = ((scene.scale.height / 3) * (belt_label - 3))
                    x = belt_num * BELT_HEIGHT + (BELT_HEIGHT / 2)
                } else if (belt_label == 4) {
                    y = ((scene.scale.height / 3) * (belt_label - 3))
                    x = scene.scale.width - (belt_num * BELT_HEIGHT + (BELT_HEIGHT / 2))
                } else {
                    throw new Error("Undefined Conveyor Belt Choice");
                }

                return [x, y];
            }

            let [x, y] = get_pos_from_belt_and_num(this, belt_label, 0);
            this.conveyor_belts[this.conveyor_belts.length - 1].set_pos_and_belt_label(x, y, belt_label);
            this.starting_conveyor_belts.push(this.conveyor_belts[this.conveyor_belts.length - 1]);

            let belt_num = 1
            while (belt_num < num_belts - 1) {
                this.conveyor_belts.push(new ConveyorBelt(this));

                let [x, y] = get_pos_from_belt_and_num(this, belt_label, belt_num);

                this.conveyor_belts[this.conveyor_belts.length - 1].set_pos_and_belt_label(x, y, belt_label);
                belt_num += 1;
            }

            // Place Basket
            let basket_x;
            let basket_y;
            [basket_x, basket_y] = get_pos_from_belt_and_num(this, belt_label, belt_num);

            this.baskets.push(new Basket(this, basket_x, basket_y, belt_types[belt_label - 1]));
        });

        const BELT_WIDTH = this.conveyor_belts[0].width;
        const BELT_HEIGHT = this.conveyor_belts[0].height;

        // Create ball return pit
        this.ball_pit_x = (this.scale.width / 4) * 2.5;
        this.ball_pit_y = (this.scale.height / 3) * 1.5;
        this.ball_pit_width = (this.scale.width / 4) - BELT_WIDTH;
        this.ball_pit_height = (this.scale.height / 3) - BELT_WIDTH;

        // Start ball spawning
        this.balls = this.add.group();


        // Enemy
        // this.enemy_blue = new BlueEnemy(this);

        // Player
        this.player = new Player({ scene: this });

        // Cursor keys 
        this.cursors = this.input.keyboard.createCursorKeys();
        // this.cursors.space.on("down", () => {
        //     this.player.fire();
        // });
        // this.input.on("pointerdown", (pointer) => {
        //     this.player.fire(pointer.x, pointer.y);
        // });

        // Overlap player or ball with conveyor belts
        function move_along_conveyor_belt(scene, conveyor_belt, player_or_ball) {
            let { belt_label } = conveyor_belt

            if (player_or_ball.state === "picked") {
                return;
            } // Ball already picked

            if (belt_label == 1 || belt_label == 3) {
                player_or_ball.y += scene.scale.height / config.time_move_across_screen;
            } else if (belt_label == 2) {
                player_or_ball.y -= scene.scale.height / config.time_move_across_screen;
            } else if (belt_label == 4) {
                player_or_ball.x -= scene.scale.width / config.time_move_across_screen;
            } else if (belt_label == 5) {
                player_or_ball.x += scene.scale.width / config.time_move_across_screen;
            } else {
                throw new Error("Undefined Conveyor Belt Choice");
            }
        }

        //this.physics.add.overlap(this.conveyor_belts, this.player, (conveyor_belt, player) => move_along_conveyor_belt(this, conveyor_belt, player))
        this.physics.add.overlap(this.conveyor_belts, this.balls, (conveyor_belt, ball) => {
            if (ball.state !== "picked") {
                // Check if ball's direction belt label needs to be set
                if (ball.direction_belt_label == null) {
                    ball.direction_belt_label = conveyor_belt.belt_label;
                }

                // Only move balls of this belt
                if (conveyor_belt.belt_label == ball.direction_belt_label) {
                    move_along_conveyor_belt(this, conveyor_belt, ball)
                }
            }
        });
        this.physics.add.overlap(this.balls, this.baskets, (ball, basket) => { basket.checkForBall(ball) });

        // Overlap enemy with bullets
        this.physics.add.overlap(this.player.bullets, this.enemy_blue, (enemy, bullet) => {
            bullet.destroyBullet();
            this.enemy_blue.damage(this.player.x, this.player.y);
            this.points += 10;
            this.scene.get("HudScene")
                .update_points(this.points);
        });

        // // Overlap player with enemy bullets
        // this.physics.add.overlap(this.enemy_blue.bullets, this.player, (player, bullet) => {
        //     bullet.destroyBullet();
        //     this.cameras.main.shake(100, 0.01);
        //     // Flash the color white for 300ms
        //     this.cameras.main.flash(300, 255, 10, 10, false,);
        //     this.points -= 10;
        //     this.scene.get("HudScene")
        //         .update_points(this.points);
        // });

        // This event comes from MenuScene
        this.game.events.on("start-game", () => {
            this.scene.stop("MenuScene");
            this.time.addEvent({
                delay: this.config.time_between_ball_spawns, // happens every 2 seconds
                callback: this.addBall,
                callbackScope: this,
                loop: true
            });
            this.scene.launch("HudScene", { remaining_time: this.game_over_timeout });
            this.conveyor_belts.forEach((conveyor_belt) => { conveyor_belt.start() });
            //this.enemy_blue.start();
            this.player.start();
            // this.balls.forEach((ball) => { ball.start() });

            // Game Over timeout
            this.time.addEvent({
                delay: 1000,
                loop: true,
                callback: () => {
                    if (this.game_over_timeout === 0) {
                        // You need remove the event listener to avoid duplicate events.
                        this.game.events.removeListener("start-game");
                        // It is necessary to stop the scenes launched in parallel.
                        this.scene.stop("HudScene");
                        this.scene.start("GameOverScene", { points: this.points });
                    } else {
                        this.game_over_timeout--;
                        this.scene.get("HudScene").update_timeout(this.game_over_timeout);
                    }
                }
            });
        });
    }

    update(time, delta) {
        this.conveyor_belts.forEach((conveyor_belt) => { conveyor_belt.update(time, delta) });
        //this.enemy_blue.update();
        this.player.update(time, delta);

        // Sprite ordering
        // TEMP?
        //this.bringToTop(player)
        //this.balls.children.iterate((ball) => {
        //ball.update(); // Update each ball
        //})

        // Player movement entries
        if (this.cursors.up.isDown) {
            this.player.move("up");
        }
        if (this.cursors.down.isDown) {
            this.player.move("down");
        }
        if (this.cursors.right.isDown) {
            this.player.move("right");
        }
        if (this.cursors.left.isDown) {
            this.player.move("left");
        }

        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            if (this.player.ball && this.player.ball.state === "picked") {
                this.player.drop();
                return
            }
            let ball = this.physics.closest(this.player, this.balls.getChildren());
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, ball.x, ball.y) < 30) {
                this.player.pick(ball);
            }
        };

        // d key to drop the ball


    }
}