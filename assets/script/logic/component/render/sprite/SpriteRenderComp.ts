import CustomRenderComp from "./CustomRenderComp";
import SpriteAssembler from "../assembler/SpriteAssembler";


const { ccclass, property } = cc._decorator;


/** 自定义精灵组件渲染组件 */
@ccclass
export default class SpriteRenderComp extends CustomRenderComp {
    @property({ type: cc.SpriteFrame })
    public _spriteFrame: cc.SpriteFrame = null
    @property({ type: cc.SpriteFrame })
    public get spriteFrame(): cc.SpriteFrame {
        return this._spriteFrame
    }
    public set spriteFrame(value: cc.SpriteFrame) {
        var lastSprite = this._spriteFrame
        if (CC_EDITOR) {
            // @ts-ignore
            if ((lastSprite && lastSprite._uuid) === (value && value._uuid)) {
                return
            }
        }
        else {
            if (lastSprite === value) {
                return
            }
        }
        this._spriteFrame = value
        this._applySpriteFrame(lastSprite)
        if (CC_EDITOR) {
            this.node.emit('spriteframe-changed', this)
        }
    }

    public onEnable(): void {
        super.onEnable()
        this._applySpriteFrame()
    }

    /** 更新材质 */
    protected _updateMaterial(): void {
        let texture = this._spriteFrame && this._spriteFrame.getTexture()

        // make sure material is belong to self.
        let material = this.getMaterial(0)
        material && material.setProperty('texture', texture)

        // @ts-ignore
        cc.BlendFunc.prototype._updateMaterial.call(this)
    }

    /** 应用纹理 */
    protected _applySpriteFrame(oldFrame?: cc.SpriteFrame): void {
        let oldTexture = oldFrame && oldFrame.getTexture()
        if (oldTexture && !oldTexture.loaded) {
            oldFrame.off('load', this._applySpriteSize, this)
        }

        let spriteFrame = this._spriteFrame
        if (spriteFrame) {
            this._updateMaterial()
            let newTexture = spriteFrame.getTexture()
            if (oldTexture === newTexture && newTexture.loaded) {
                this._applySpriteSize()
            }
            else {
                // @ts-ignore
                this.disableRender()
                // @ts-ignore
                spriteFrame.onTextureLoaded(this._applySpriteSize, this)
            }
        }
        else {
            // @ts-ignore
            this.disableRender()
        }
    }

    /** 应用精灵尺寸 */
    protected _applySpriteSize(): void {
        if (!this._spriteFrame || !this.isValid) return

        // @ts-ignore
        var rect = this._spriteFrame._rect
        // this.node.setContentSize(rect.width, rect.height)

        // @ts-ignore
        this.setVertsDirty()
    }
}

// @ts-ignore
cc.Assembler.register(SpriteRenderComp, SpriteAssembler)