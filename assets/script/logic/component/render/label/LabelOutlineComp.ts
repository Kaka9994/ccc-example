

const { ccclass, property, executeInEditMode, requireComponent } = cc._decorator;


/**
 * 文本描边组件
 * @description 暂不支持富文本
 */
@ccclass
@executeInEditMode
@requireComponent(cc.Label)
export default class LabelOutlineComp extends cc.Component {
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

    /** 描边宽度 */
    @property
    private _lineWidth: number = 0;
    @property({ tooltip: "描边宽度" })
    public get lineWidth(): number { return this._lineWidth }
    public set lineWidth(w: number) {
        this._lineWidth = w;
        this._setProperty("u_line_width", this._lineWidth);
    }

    /** 描边颜色 */
    @property
    private _lineColor: cc.Color = cc.Color.WHITE;
    @property({ tooltip: "描边颜色" })
    public get lineColor(): cc.Color { return this._lineColor }
    public set lineColor(c: cc.Color) {
        this._lineColor = c;
        this._setProperty("u_line_color", this._lineColor);
    }

    /** 文本组件 */
    private _label: cc.Label = null;
    /** 文字尺寸 */
    private _fontSize: number = 0;

    onLoad() {
        this._label = this.node.getComponent(cc.Label);
        this._resetProperties();
    }

    start() {
    }

    update (dt) {
        // 监听文本组件的文字尺寸是否修改
        if (this._checkSpriteFontSize()) {
            this._setFontSize();
        }
    }

    /** 设置材质 */
    private _setMaterial(): void {
        if (this._label == null) {
            return;
        }

        let m = this._material;
        if (m == null) {
            m = this.defMaterial;
        }

        this._label.setMaterial(0, m);
    }

    /** 重置属性 */
    private _resetProperties(): void {
        this._setFontSize();
        this._setProperty("u_line_width", this._lineWidth);
        this._setProperty("u_line_color", this._lineColor);
    }

    /** 设置属性 */
    private _setProperty(name: string, val: any): void {
        if (this._label == null || this._material == null) {
            return;
        }

        this._material.setProperty(name, val);
    }

    /** 设置文字尺寸属性 */
    private _setFontSize(): void {
        if (this._label == null) {
            return;
        }

        this._fontSize = this._label.fontSize;
        this._setProperty("u_font_size", this._fontSize);
    }

    /** 检查文本组件的文字尺寸是否修改 */
    private _checkSpriteFontSize(): boolean {
        if (this._label.fontSize != this._fontSize) {
            this._fontSize = this._label.fontSize;
            return true;
        }
        return false;
    }
}