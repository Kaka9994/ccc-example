import GameController from "./GameController";
import ObstacleController from "./ObstacleController";
import RoleController from "./RoleController";
import SoundController from "./SoundController";


const { ccclass, property } = cc._decorator;

/**
 * 流程控制器
 */
@ccclass
export default class ProcessController extends cc.Component {

    @property(RoleController)
    public roleCtrl: RoleController = null;

    @property(ObstacleController)
    public obstacleCtrl: ObstacleController = null;

    @property(cc.Node)
    public btnStart: cc.Node = null;

    @property(cc.Node)
    public btnBack: cc.Node = null;

    @property(cc.Node)
    public btnStartUp: cc.Node = null;

    /** 音频控制器 */
    private _soundCtrl: SoundController = null;

    /** 游戏控制器 */
    private _gameCtrl: GameController = null;

    public onLoad(): void {
        this._soundCtrl = this.node.getComponent(SoundController);
        this._gameCtrl = this.node.getComponent(GameController);
    }

    public start(): void {
        // 返回按键监听
        this.btnBack.on("click", () => {
            if (!window["webkit"] || !window["webkit"]["messageHandlers"] ||
                !window["webkit"]["messageHandlers"]["viewClose"] ||
                !window["webkit"]["messageHandlers"]["viewClose"]["postMessage"]) {
                console.error("viewClose undefind !!!!!");
                return;
            }
            window["webkit"]["messageHandlers"]["viewClose"]["postMessage"]("123");
        })
        // 开始按键监听
        this.btnStart.on("click", () => {
            // 停止所有运动
            this.roleCtrl.node.stopAllActions();
            this._gameCtrl.node.stopAllActions();
            // 停止所有音频
            this._soundCtrl.stopAllSound();
            // 清空所有障碍物
            this.obstacleCtrl.clearObstacle();

            this.showOpening();
        })
        let kkk = false;
        // 启动按钮监听
        this.btnStartUp.on("click", () => {
            iosGrantedTips(() => {
                if (kkk) {
                    return;
                }

                kkk = true;
                // 显示开场
                this.showOpening();
            });

            // 隐藏启动按钮
            this.btnStartUp.active = false;
        })
    }

    public update(dt): void {
    }

    public onDestroy(): void {
    }

    /** 显示开场 */
    public showOpening(): void {
        this.roleCtrl.node.runAction(cc.sequence(
            // 初始化人物位置
            cc.callFunc(() => {
                this.roleCtrl.node.x = -745;
                this.roleCtrl.node.children[0].scaleX = -Math.abs(this.roleCtrl.node.children[0].scaleX);
            }),
            // 人物移动
            cc.callFunc(() => {
                this.roleCtrl.playWalk();
            }),
            cc.moveTo(3, cc.v2(0, this.roleCtrl.node.y)),
            // 人物静止
            cc.callFunc(() => {
                this.roleCtrl.playIdle();
            }),
            cc.delayTime(0.5),
            // 播放开场白
            cc.callFunc(() => {
                this._soundCtrl.playOpening();
            }),
            cc.delayTime(4),
            // 游戏开始
            cc.callFunc(() => {
                this._gameCtrl.gameStart();
            })
        ))
    }

    /** 进入讲解流程 */
    public showTeaching(): void {
        this.node.runAction(cc.sequence(
            // 播放问题音效
            cc.callFunc(() => {
                this._soundCtrl.playQuestion();
            }),
            cc.delayTime(11),
            // 播放说明音效
            cc.callFunc(() => {
                this._soundCtrl.playExplanation();
            }),
            cc.delayTime(13),
            // 播放结论音效
            cc.callFunc(() => {
                this._soundCtrl.playEnding();
            })
        ))
    }
}


function iosGrantedTips(callFunc: Function) {// 判断系统
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        // 事件授权
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response == 'granted') {
                    window.addEventListener('devicemotion', (e) => {
                        // do something with e
                        callFunc()
                    })
                }
            })
            .catch((error) => {
                alert(error);
                callFunc()
            })

        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response == 'granted') {
                    window.addEventListener('deviceorientation', (e) => {
                        // do something with e
                        callFunc()
                    })
                }
            })
            .catch((error) => {
                alert(error);
                callFunc()
            })
    } else {
        // non iOS 13+
        callFunc()
    }
}