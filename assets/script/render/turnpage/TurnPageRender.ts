import CustomRender from "../custom/CustomRender";
import TurnPageAssembler from "./TurnPageAssembler";


const { ccclass, property, mixins } = cc._decorator;


/** 翻页渲染组件 */
@ccclass
export default class TurnPageRender extends CustomRender {

    @property({ type: cc.Texture2D })
    private _textureDef: cc.Texture2D = null;
    @property({ type: cc.Texture2D })
    public get textureDef(): cc.Texture2D {
        return this._textureDef;
    }
    public set textureDef(t: cc.Texture2D) {
        this._textureDef = t;
        this._calculateUV();
        this._updateMaterial();
    }
    @property({ type: cc.Texture2D })
    private _textureBack: cc.Texture2D = null;
    @property({ type: cc.Texture2D })
    public get textureBack(): cc.Texture2D {
        return this._textureBack;
    }
    public set textureBack(t: cc.Texture2D) {
        this._textureBack = t;
        this._updateMaterial();
    }

    /** 翻页底边曲线点的数量 */
    public readonly triangleNum: number = 60;

    private _uv: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
    public get uv(): number[] {
        return this._uv;
    }

    public onLoad(): void {
        this._updateMaterial();
    }

    public onEnable(): void {
        super.onEnable();
        this._calculateUV();
    }

    public updateTxTy(tx: number, ty: number): void {
        (<TurnPageAssembler>this._assembler).updateTxTy(tx, ty);
    }

    public updatePage(points: cc.Vec2[]): void {
        // 过滤
        if (points.length != this.triangleNum / 2 + 1) {
            return;
        }

        (<TurnPageAssembler>this._assembler).updateVertsByPoints(this, points);
    }

    protected _resetAssembler() {
        this._assembler = new TurnPageAssembler();
        this._assembler.init(this);
    }

    /** 更新材质 */
    protected _updateMaterial(): void {
        // 过滤
        if (this.textureDef == null) {
            return;
        }

        let textures = [this.textureDef, this.textureDef];
        if (this.textureBack != null) {
            textures[1] = this.textureBack
        }

        // make sure material is belong to self.
        let material = this.getMaterial(0);
        if (material != null) {
            material.setProperty('texture1', textures[0]);
            material.setProperty('texture2', textures[1]);
        }

        // @ts-ignore
        cc.BlendFunc.prototype._updateMaterialBlendFunc.call(this, material);
    }

    /** 计算uv */
    private _calculateUV(): void {
        // 过滤
        if (this._textureDef == null) {
            return;
        }

        let texw = this._textureDef.width, texh = this._textureDef.height;
        let rect = cc.rect(0, 0, texw, texh);

        let l = texw === 0 ? 0 : rect.x / texw;
        let r = texw === 0 ? 0 : (rect.x + rect.width) / texw;
        let b = texh === 0 ? 0 : (rect.y + rect.height) / texh;
        let t = texh === 0 ? 0 : rect.y / texh;
        this._uv[0] = l;
        this._uv[1] = b;
        this._uv[2] = r;
        this._uv[3] = b;
        this._uv[4] = l;
        this._uv[5] = t;
        this._uv[6] = r;
        this._uv[7] = t;
    }
}

// @ts-ignore
cc.Assembler.register(TurnPageRender, TurnPageAssembler);