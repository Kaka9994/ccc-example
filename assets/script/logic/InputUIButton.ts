import { DirEnum } from "../enum/DirEnum";
import { GameState } from "../enum/GameState";
import GameController from "./GameController";


const { ccclass, property } = cc._decorator;

const DECR_SPEED = 1;

/**
 * UI按键输入控制器
 */
@ccclass
export default class InputUIButton extends cc.Component {

    @property(cc.Node)
    public btnLeft: cc.Node = null;

    @property(cc.Node)
    public btnRight: cc.Node = null;

    /** 状态 */
    private _state: GameState = GameState.NONE;

    /** 游戏控制脚本 */
    private _gameCtrl: GameController = null;

    /** 输入列表 */
    private _inputList: DirEnum[] = [];

    /** 速度 */
    private _speed: number = 0;

    public onLoad(): void {
        this.register();
    }

    public start(): void {
    }

    public update(dt): void {
        if (this._state == GameState.PLAYING) {
            // this._changeSpeed(dt);
        }
    }

    public onDestroy(): void {
    }

    /** 注册监听 */
    public register(): void {
        if (this.btnLeft) {
            this.btnLeft.on(cc.Node.EventType.TOUCH_START, this._onClick.bind(this, DirEnum.LEFT));
            this.btnLeft.on(cc.Node.EventType.TOUCH_END, this._onClickEnd.bind(this, DirEnum.LEFT));
            this.btnLeft.on(cc.Node.EventType.TOUCH_CANCEL, this._onClickEnd.bind(this, DirEnum.LEFT));
        }
        if (this.btnRight) {
            this.btnRight.on(cc.Node.EventType.TOUCH_START, this._onClick.bind(this, DirEnum.RIGHT));
            this.btnRight.on(cc.Node.EventType.TOUCH_END, this._onClickEnd.bind(this, DirEnum.RIGHT));
            this.btnRight.on(cc.Node.EventType.TOUCH_CANCEL, this._onClickEnd.bind(this, DirEnum.RIGHT));
        }
    }

    /** 注销监听 */
    public unregister(): void {
        if (this.btnLeft) {
            this.btnLeft.off(cc.Node.EventType.TOUCH_START, this._onClick.bind(this, DirEnum.LEFT));
            this.btnLeft.off(cc.Node.EventType.TOUCH_END, this._onClickEnd.bind(this, DirEnum.LEFT));
            this.btnLeft.off(cc.Node.EventType.TOUCH_CANCEL, this._onClickEnd.bind(this, DirEnum.LEFT));
        }
        if (this.btnRight) {
            this.btnRight.off(cc.Node.EventType.TOUCH_START, this._onClick.bind(this, DirEnum.RIGHT));
            this.btnRight.off(cc.Node.EventType.TOUCH_END, this._onClickEnd.bind(this, DirEnum.RIGHT));
            this.btnRight.off(cc.Node.EventType.TOUCH_CANCEL, this._onClickEnd.bind(this, DirEnum.RIGHT));
        }
    }

    /** 设置状态 */
    public setState(state: GameState): void {
        this._state = state;
    }

    /** 绑定游戏控制脚本 */
    public setGameCtr(gameCtr: GameController): void {
        this._gameCtrl = gameCtr;
    }

    /** 点击 */
    private _onClick(dir: DirEnum, event: any): void {
        // 判断输入列表里是否存在
        let index = this._inputList.indexOf(dir);
        if (index == -1) {
            this._inputList.push(dir);
        }
    }

    /** 点击结束 */
    private _onClickEnd(dir: DirEnum, event: any): void {
        // 判断输入列表里是否存在
        let index = this._inputList.indexOf(dir);
        if (index != -1) {
            this._inputList.splice(index, 1);
        }
    }

    /** 改变速度 */
    private _changeSpeed(dt: number): void {
        let dir = this._inputList[0];
        // 速度递增
        if (dir) {
            this._speed += this._getDirNum(dir) * dt;
            this._speed = Math.max(-1, this._speed);
            this._speed = Math.min(1, this._speed);
        }
        // 速度递减
        else if (this._speed != 0) {
            let nextSpeed = this._speed + (this._speed > 0 ? -1 : 1) * dt * DECR_SPEED;
            if (nextSpeed * this._speed < 0) {
                this._speed = 0;
            } else {
                this._speed = nextSpeed;
            }
        }

        // 通知速度改变
        this._gameCtrl.changeSpeed(this._speed);
    }

    /** 获取方向对应的数值 */
    private _getDirNum(dir: DirEnum): number {
        switch (dir) {
            case DirEnum.NONE: return 0;
            case DirEnum.LEFT: return -1;
            case DirEnum.RIGHT: return 1;
            default: return 0;
        }
    }
}
