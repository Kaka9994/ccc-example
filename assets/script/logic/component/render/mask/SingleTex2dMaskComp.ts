

const { ccclass, property, executeInEditMode, requireComponent } = cc._decorator;

let MaskType = cc.Enum({
    /**
     * !#en Rect mask.
     * !#zh 使用矩形作为遮罩
     * @property {Number} RECT
     */
    RECT: 0,
    /**
     * !#en Circle Mask.
     * !#zh 使用圆作为遮罩
     * @property {Number} CIRCLE
     */
    CIRCLE: 1,
    /**
     * !#en Image Stencil Mask.
     * !#zh 使用图像模版作为遮罩
     * @property {Number} IMAGE_STENCIL
     */
    IMAGE_STENCIL: 2,
});

/**
 * 单纹理遮罩组件
 * @description 暂不支持图集，暂不支持Simple以外的模式
 */
@ccclass
@executeInEditMode
@requireComponent(cc.Sprite)
export default class SingleTex2dMaskComp extends cc.Component {
    /** 默认材质 */
    @property({ type: cc.Material })
    public defMaterial: cc.Material = null;

    /** 遮罩材质 */
    @property({ type: cc.Material })
    public _material: cc.Material = null;
    @property({ type: cc.Material, tooltip: "遮罩材质" })
    public get material(): cc.Material { return this._material }
    public set material(m: cc.Material) {
        this._material = m;
        this._setMaterial();
    }

    /** 遮罩类型 */
    @property({ type: MaskType })
    private _type: number = MaskType.RECT;
    @property({ type: MaskType, tooltip: "遮罩类型" })
    public get type(): number { return this._type }
    public set type(t: number) {
        this._type = t;
        this._setProperty("maskType", this._type);
    }

    /** 中心点 */
    @property
    private _centerPoint: cc.Vec2 = cc.v2(0.5, 0.5);
    @property({ tooltip: "中心点" })
    public get centerPoint(): cc.Vec2 { return this._centerPoint }
    public set centerPoint(p: cc.Vec2) {
        this._centerPoint = p;
        this._setProperty("centerPoint", this._centerPoint);
    }

    /** 矩形遮罩尺寸 */
    @property
    private _rectSize: cc.Size = cc.size(1, 1);
    @property({ tooltip: "矩形遮罩尺寸" })
    public get rectSize(): cc.Size { return this._rectSize }
    public set rectSize(s: cc.Size) {
        this._rectSize = s;
        this._setProperty("rectSize", cc.v2(this._rectSize.width, this._rectSize.height));
    }

    /** 圆形遮罩半径 */
    @property
    private _circleR: number = 0.5;
    @property({ tooltip: "圆形遮罩半径" })
    public get circleR(): number { return this._circleR }
    public set circleR(r: number) {
        this._circleR = r;
        this._setProperty("circleR", this._circleR);
    }

    /** 图片遮罩纹理 */
    @property({ type: cc.Texture2D })
    private _imageTexture: cc.Texture2D = null;
    @property({ type: cc.Texture2D, tooltip: "图片遮罩纹理" })
    public get imageTexture(): cc.Texture2D { return this._imageTexture }
    public set imageTexture(t2d: cc.Texture2D) {
        this._imageTexture = t2d;
        let tex2Ratio = this._imageTexture != null ? this._imageTexture.width / this._imageTexture.height : 1;
        this._setProperty("imageTexture", this._imageTexture);
        this._setProperty("imageRatio", tex2Ratio);
    }

    /** 纹理组件 */
    private _sprite: cc.Sprite = null;
    /** 纹理 */
    private _spriteFrame: cc.SpriteFrame = null;
    /** 是否裁剪模式 */
    private _trim: boolean = false;

    onLoad() {
        this._sprite = this.node.getComponent(cc.Sprite);
        this._spriteFrame = this._sprite.spriteFrame;
        this._trim = this._sprite.trim;
        this._resetProperties();

        // 监听节点尺寸变化
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this._onNodeSizeChange, this);
    }

    start() {
    }

    update (dt) {
        // 监听纹理改变
        if (this._checkSpriteFrame()) {
            this._resetProperties();
        }
        // 监听trim改变
        if (this._checkSpriteTrim()) {
            this._setTrimRatio();
        }
    }

    /** 设置材质 */
    private _setMaterial(): void {
        if (this._sprite == null) {
            return;
        }

        let m = this._material;
        if (m == null) {
            m = this.defMaterial;
        }

        this._sprite.setMaterial(0, m);
    }

    /** 设置属性 */
    private _setProperty(name: string, val: any): void {
        if (this._sprite == null || this._material == null) {
            return;
        }

        this._material.setProperty(name, val);
    }

    /** 设置裁剪后于裁剪前的比例 */
    private _setTrimRatio(): void {
        if (this._sprite == null) {
            return;
        }
        
        let spf = this._sprite.spriteFrame,
            oriSize = spf != null ? spf.getOriginalSize() : cc.size(0, 0),
            rectSize = spf != null ? spf.getRect() : cc.size(0, 0);
        let trimRatioW = this._trim ? rectSize.width / oriSize.width : 1;
        let trimRatioH = this._trim ? rectSize.height / oriSize.height : 1;
        this._setProperty("trimRatio", cc.v2(trimRatioW, trimRatioH));
    }

    /** 重置属性 */
    private _resetProperties(): void {
        let nodeRatio = this.node.width / this.node.height;
        let tex2Ratio = this._imageTexture != null ? this._imageTexture.width / this._imageTexture.height : 1;

        this._setMaterial();
        this._setTrimRatio();
        this._setProperty("nodeRatio", nodeRatio);
        this._setProperty("maskType", this._type);
        this._setProperty("centerPoint", this._centerPoint);
        this._setProperty("rectSize", cc.v2(this._rectSize.width, this._rectSize.height));
        this._setProperty("circleR", this._circleR);
        this._setProperty("imageTexture", this._imageTexture);
        this._setProperty("imageRatio", tex2Ratio);
    }

    /** 节点尺寸变化回调 */
    private _onNodeSizeChange(): void {
        let nodeRatio = this.node.width / this.node.height;
        this._setProperty("nodeRatio", nodeRatio);
    }

    /** 检查精灵组件的纹理是否修改 */
    private _checkSpriteFrame(): boolean {
        if (this._sprite.spriteFrame != this._spriteFrame) {
            this._spriteFrame = this._sprite.spriteFrame;
            return true;
        }
        return false;
    }

    /** 检查精灵组件的trim属性是否修改 */
    private _checkSpriteTrim(): boolean {
        if (this._sprite.trim != this._trim) {
            this._trim = this._sprite.trim;
            return true;
        }
        return false;
    }
}