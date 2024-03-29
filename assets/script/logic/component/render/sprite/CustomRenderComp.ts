import CustomAssembler from "../assembler/CustomAssembler"


const { ccclass, property, mixins } = cc._decorator


/** 自定义渲染组件 */
@ccclass
@mixins(cc.BlendFunc)
export default class CustomRenderComp extends cc.RenderComponent {
    /** 源混合因子 */
    public srcBlendFactor = cc.macro.BlendFactor.SRC_ALPHA
    /** 目标混合因子 */
    public dstBlendFactor = cc.macro.BlendFactor.ONE_MINUS_SRC_ALPHA

    // @ts-ignore
    protected _assembler: cc.Assembler = null;

    public onEnable(): void {
        super.onEnable()

        // @ts-ignore
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.setVertsDirty, this)
        // @ts-ignore
        this.node.on(cc.Node.EventType.ANCHOR_CHANGED, this.setVertsDirty, this)
    }

    public onDisable () {
        super.onDisable()
        
        // @ts-ignore
        this.node.off(cc.Node.EventType.SIZE_CHANGED, this.setVertsDirty, this)
        // @ts-ignore
        this.node.off(cc.Node.EventType.ANCHOR_CHANGED, this.setVertsDirty, this)
    }
}

// @ts-ignore
cc.Assembler.register(CustomRenderComp, CustomAssembler);