import GameObject from "../base/GameObject";
import { GameState } from "../enum/GameState";
import ObstacleController from "./ObstacleController";


const { ccclass, property } = cc._decorator;

const OBSTACLE_SPEED = 10;

/**
 * 障碍物对象
 */
@ccclass
export default class ObstacleObject extends GameObject {

    /** 状态 */
    private _state: GameState = GameState.NONE;

    /** 边界 */
    private _border: { left: number, right: number, up: number, down: number } = null;

    /** 名字 */
    public obstacleName: string = "";

    /** 障碍物控制器 */
    private _obstacleCtrl: ObstacleController = null;

    /** 速度 */
    private _speed: number = 0;

    public onLoad(): void {
        // 设置障碍物尺寸
        this._setCollisionSize(new cc.Size(100, 100));
    }

    public start(): void {
    }

    public update(dt): void {
        if (this._state == GameState.PLAYING ||
            this._state == GameState.END) {
            this._moveObstacle(dt);
        }
    }

    public onDestroy(): void {
    }

    /** 设置状态 */
    public setState(state: GameState): void {
        this._state = state;
    }

    /** 设置边界 */
    public setBorder(border: { left: number, right: number, up: number, down: number }): void {
        this._border = border;
    }

    /** 设置障碍物控制器 */
    public setObstacleCtrl(ctrl: ObstacleController): void {
        this._obstacleCtrl = ctrl;
    }

    /** 设置声音 */
    public setSpeed(speed: number): void {
        this._speed = speed;
    }

    /** 播放出现动画 */
    public showIn(callFunc: () => void): void {
        this.node.runAction(cc.sequence(
            cc.callFunc(() => {
                this.node.scale = 0;
            }),
            cc.scaleTo(0.3, 1),
            cc.callFunc(() => {
                if (callFunc) {
                    callFunc();
                }
            })
        ))
    }

    /** 播放撞击动画 */
    public showSmash(callFunc: () => void): void {
        let pos = cc.v2(
            this.node.x + (Math.random() > 0.5 ? 1 : -1) * 100,
            this._border.down - this._collisionSize.height / 2
        );
        this.node.runAction(cc.sequence(
            cc.jumpTo(1, pos, 100, 1),
            cc.callFunc(() => {
                if (callFunc) {
                    callFunc();
                }
            })
        ))
    }

    /** 移动障碍物 */
    private _moveObstacle(dt: number): void {
        // 过滤无效节点
        if (!this.node || !this._obstacleCtrl) {
            console.error("_moveObstacle:参数无效");
            return;
        }

        // 计算速度
        this._speed += OBSTACLE_SPEED * dt;
        // 计算下一个位置
        let nextPosY = this.node.y - this._speed;

        // 超出边界
        if (this._checkOutBorder(nextPosY)) {
            // 销毁自己
            this._obstacleCtrl.destroyObstacle(this.node, false);
            return;
        }

        this.node.y = nextPosY;
    }

    /** 检测是否超出边界 */
    private _checkOutBorder(posY: number): boolean {
        // 过滤无效参数
        if (!this._border || !this._collisionSize) {
            console.error("_checkOutBorder:参数无效");
            return false;
        }

        // 超出下边界
        if (this._border.down >= posY + this._collisionSize.height / 2) {
            return true;
        }

        return false;
    }
}