import { GameState } from "../enum/GameState";
import GameController from "./GameController";


const { ccclass, property } = cc._decorator;

const DECR_SPEED = 2.5;

/**
 * 重力感应输入控制器
 */
@ccclass
export default class InputGravity extends cc.Component {

    /** 状态 */
    private _state: GameState = GameState.NONE;

    /** 游戏控制脚本 */
    private _gameCtrl: GameController = null;

    /** 输入值 */
    private _inputValue: number = 0;

    /** 速度 */
    private _speed: number = 0;

    public onLoad(): void {
        // 启用加速度计事件
        cc.systemEvent.setAccelerometerEnabled(true);
        this.register();
    }

    public start(): void {
    }

    public update(dt): void {
        if (this._state == GameState.PLAYING) {
            this._changeSpeed(dt);
        }
    }

    public onDestroy(): void {
        this.unregister();
    }

    /** 注册监听 */
    public register(): void {
        cc.systemEvent.on(cc.SystemEvent.EventType.DEVICEMOTION, this._onGravity.bind(this));
    }

    /** 注销监听 */
    public unregister(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.DEVICEMOTION, this._onGravity.bind(this));
    }

    /** 设置状态 */
    public setState(state: GameState): void {
        this._state = state;
    }

    /** 绑定游戏控制脚本 */
    public setGameCtr(gameCtr: GameController): void {
        this._gameCtrl = gameCtr;
    }

    /** 重力感应 */
    private _onGravity(event: any): void {
        this._inputValue = event.acc.x;
    }

    /** 改变速度 */
    private _changeSpeed(dt: number): void {
        this._speed = Math.max(-1, this._inputValue * DECR_SPEED);
        this._speed = Math.min(1, this._inputValue * DECR_SPEED);

        // 速度递减
        if (this._speed != 0) {
            let nextSpeed = this._speed + (this._speed > 0 ? -1 : 1) * dt;
            if (nextSpeed * this._speed < 0) {
                this._speed = 0;
            } else {
                this._speed = nextSpeed;
            }
        }

        // 通知速度改变
        this._gameCtrl.changeSpeed(this._speed);
    }
}
