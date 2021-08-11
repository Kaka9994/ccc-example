

const { ccclass, property } = cc._decorator;

/**
 * 音频控制器
 */
@ccclass
export default class SoundController extends cc.Component {

    @property({ type: cc.AudioClip })
    public sound1: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    public sound2: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    public sound3: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    public sound4: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    public sound5: cc.AudioClip = null;

    public onLoad(): void {
    }

    public start(): void {
    }

    public update(dt): void {
    }

    public onDestroy(): void {
    }

    /** 播放开场白 */
    public playOpening(): void {
        cc.audioEngine.play(this.sound1, false, 1);
    }

    /** 播放被障碍物砸中 */
    public playSmashObstacle(): void {
        cc.audioEngine.play(this.sound2, false, 1);
    }

    /** 播放问题音效 */
    public playQuestion(): void {
        cc.audioEngine.play(this.sound3, false, 1);
    }

    /** 播放说明音效 */
    public playExplanation(): void {
        cc.audioEngine.play(this.sound4, false, 1);
    }

    /** 播放结论音效 */
    public playEnding(): void {
        cc.audioEngine.play(this.sound5, false, 1);
    }

    /** 停止所有音效 */
    public stopAllSound(): void {
        cc.audioEngine.stopAll();
    }
}
