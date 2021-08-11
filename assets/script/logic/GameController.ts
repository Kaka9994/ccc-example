import { GameState } from "../enum/GameState";
import CollisionManager from "./CollisionManager";
import InputGravity from "./InputGravity";
import InputUIButton from "./InputUIButton";
import ObstacleController from "./ObstacleController";
import ObstacleObject from "./ObstacleObject";
import ProcessController from "./ProcessController";
import RoleController from "./RoleController";
import SoundController from "./SoundController";

/** 碰撞检测时间s */
const COLLISSION_TIME = 0.1;

const { ccclass, property } = cc._decorator;

/**
 * 游戏主控制器
 */
@ccclass
export default class GameController extends cc.Component {

    @property(InputUIButton)
    public uiBtnCtrl: InputUIButton = null;

    @property(InputGravity)
    public gravityCtrl: InputGravity = null;

    @property(RoleController)
    public roleCtrl: RoleController = null;

    @property(ObstacleController)
    public obstacleCtrl: ObstacleController = null;

    /** 状态 */
    private _state: GameState = GameState.NONE;

    /** 碰撞管理器 */
    private _collisionManager: CollisionManager = null;

    /** 音频控制器 */
    private _soundCtrl: SoundController = null;

    /** 流程控制器 */
    private _processCtrl: ProcessController = null;

    /** 碰撞检测时间s */
    private _collisionTime: number = 0;

    /** 创建障碍物标志 */
    private _flag: number = 0;

    public onLoad(): void {
        this._collisionManager = CollisionManager.me();
        this._soundCtrl = this.node.getComponent(SoundController);
        this._processCtrl = this.node.getComponent(ProcessController);
    }

    public start(): void {
        // 绑定控制器
        this.bindCtrl();
        // 设置边界
        let border = {
            left: -this.node.width / 2, right: this.node.width / 2,
            up: this.node.height / 2, down: -this.node.height / 2
        }
        if (this.roleCtrl) {
            this.roleCtrl.setBorder(border);
        }
        if (this.obstacleCtrl) {
            this.obstacleCtrl.setBorder(border);
        }
    }

    public update(dt): void {
        if (this._state == GameState.PLAYING) {
            // 碰撞检测
            this._collisionTime -= dt;
            if (this._collisionTime < 0) {
                this._checkCollision();
                this._collisionTime = COLLISSION_TIME;
            }
        }
    }

    public onDestroy(): void {
    }

    /** 游戏开始 */
    public gameStart(): void {
        // 设置状态
        this.setState(GameState.PLAYING);

        // 开启创建障碍物
        this._flag = <any>setInterval(() => {
            this.obstacleCtrl.createObstacle();
        }, 400)
    }

    /** 游戏结束 */
    public gameEnd(): void {
        // 设置状态
        this.setState(GameState.END);

        // 开启创建障碍物
        clearInterval(this._flag);
    }

    /** 绑定控制器 */
    public bindCtrl(): void {
        if (this.uiBtnCtrl) {
            this.uiBtnCtrl.setGameCtr(this);
        }
        if (this.gravityCtrl) {
            this.gravityCtrl.setGameCtr(this);
        }
        if (this.obstacleCtrl) {
            this.obstacleCtrl.setGameCtr(this);
        }
    }

    /** 设置状态 */
    public setState(state: GameState): void {
        this._state = state;
        if (this.uiBtnCtrl) {
            this.uiBtnCtrl.setState(this._state);
        }
        if (this.gravityCtrl) {
            this.gravityCtrl.setState(this._state);
        }
        if (this.roleCtrl) {
            this.roleCtrl.setState(this._state);
        }
        if (this.obstacleCtrl) {
            this.obstacleCtrl.setState(this._state);
        }
    }

    /** 改变速度 */
    public changeSpeed(speed: number): void {
        if (this.roleCtrl) {
            this.roleCtrl.setSpeed(speed);
        }
    }

    /** 碰撞检测 */
    private _checkCollision(): void {
        // 过滤
        if (!this.obstacleCtrl || !this.roleCtrl || !this.obstacleCtrl) {
            return;
        }
        let obstacles = this.obstacleCtrl.getObstacles();

        // 碰撞
        let obstacle = this._collisionManager.checkCollisionAABB(this.roleCtrl, obstacles);
        if (obstacle) {
            // 游戏结束
            this.gameEnd();

            // 播放撞击音效
            this._soundCtrl.playSmashObstacle();

            this.roleCtrl.node.runAction(cc.sequence(
                // 播放被撞击动画
                cc.callFunc(() => {
                    this.roleCtrl.smashObstacle();
                }),
                cc.delayTime(4),
                // 进入讲解流程
                cc.callFunc(() => {
                    this._processCtrl.showTeaching();
                })
            ));

            // 销毁碰撞的
            (<ObstacleObject>obstacle).setState(GameState.NONE);
            this.obstacleCtrl.destroyObstacle(obstacle.node, true);
        }
    }
}
