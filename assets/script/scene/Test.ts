import AutoTurnPageComp from "../component/AutoTurnPageComp";
import { TurnPageCompData } from "../component/TurnPageComp";


const { ccclass, property } = cc._decorator;

@ccclass
export default class Test extends cc.Component {

	@property([cc.SpriteFrame])
	public spriteFrames: cc.SpriteFrame[] = [];

	private _showNode: cc.Node = null;
	private _backNode: cc.Node = null;

	// onLoad () {}

	start() {
		let size = this.spriteFrames[0].getOriginalSize();
		let d = new TurnPageCompData();
		d.spriteFrames = this.spriteFrames;
		let t = cc.find("touchNode", this.node).getComponent(AutoTurnPageComp);
		t.initData(d);
		t.startUp();
	}

	// ------------------------------------------------------------------------------------

	private _tmp(): void {
		this._showNode = cc.find("showNode", this.node);
		this._backNode = cc.find("backNode", this.node);

		let data = this._doCapture([this._backNode.groupIndex]);
		let spriteFrame = new cc.SpriteFrame(data.tex);
		this._showNode.getComponent(cc.Sprite).spriteFrame = spriteFrame;
		this._showNode.setContentSize(data.size.width, data.size.height);

		let pos = this._showNode.convertToWorldSpaceAR(cc.v2(0, 0));
		let rect = cc.rect(pos.x, pos.y, this._showNode.width, this._showNode.height);
		this._cutTexture(data.tex, data.size, rect);
	}

	/** 截图 */
	private _doCapture(groupIndexes: number[]): { tex: cc.Texture2D, size: cc.Size } {
		let width = Math.floor(cc.winSize.width);
		let height = Math.floor(cc.winSize.height);

		// 创建相机
		let n = new cc.Node("camera_tmp");
		cc.Canvas.instance.node.addChild(n);
		let camera = n.addComponent(cc.Camera);
		camera.backgroundColor = cc.Color.TRANSPARENT;
		camera.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL | cc.Camera.ClearFlags.COLOR;
		camera.cullingMask = 0;
		groupIndexes.forEach(index => {
			camera.cullingMask += (1 << index);
		});

		// 创建渲染纹理
		if (camera.targetTexture == null) {
			let renderTexture = new cc.RenderTexture();
			renderTexture.initWithSize(width, height, cc.game["_renderContext"].STENCIL_INDEX8);
			camera.targetTexture = renderTexture;
		}

		// 渲染
		camera.render(null);
		n.destroy();

		// 上下翻转
		let data = camera.targetTexture.readPixels();
		let newData = new Uint8Array(data.length);
		for (let row = height - 1; row >= 0; row--) {
			let srow = height - row - 1;
			for (let column = 0; column < width * 4; column++) {
				newData[srow * width * 4 + column] =
					data[row * width * 4 + column];
			}
		}

		// 创建纹理
		let texture2D = new cc.Texture2D();
		texture2D.initWithData(newData as any, cc.Texture2D.PixelFormat.RGBA8888, width, height);

		return { tex: texture2D, size: cc.size(width, height) };
	}

	/** 
	 * 截切纹理(矩形)
	 * @param tex 纹理
	 * @param size 纹理尺寸
	 * @param rect 需要截切的矩形
	 */
	private _cutTexture(tex: cc.Texture2D, size: cc.Size, rect: cc.Rect): cc.Texture2D {
		// 截切的矩形左下角对应到纹理里的坐标(0点在左下角)
		let pos = cc.v2(
			size.width / 2 + (rect.x - rect.width / 2),
			size.height / 2 + rect.y - rect.height / 2,
		);

		let targetTex = new Uint8Array(size.width * size.height * 4);
		for (let row = 0; row <= size.height; row++) {

		}

		return null;
	}
}


/** 正面遮罩组件 */
class OpenMaskComponent {
	private _maskNode: cc.Node = null;
	private _view: cc.Node = null;

	constructor(maskNode: cc.Node) {
		this._maskNode = maskNode;
		this._view = cc.find("view", this._maskNode);
	}

	/** 设置遮罩初始位置和角度 */
	public setFirstPosAndAngle(pos: cc.Vec2, angle: number): void {
		this._maskNode.setPosition(pos);
		this._maskNode.angle = angle;
		this._view.angle = -angle;
	}

	/** 移动 */
	public move(dPos: cc.Vec2): void {
		this._maskNode.x += dPos.x;
		this._maskNode.y += dPos.y;
	}

	/** 更新视图坐标 */
	public updateViewPos(wPos: cc.Vec2): void {
		let lPos = this._maskNode.convertToNodeSpaceAR(wPos);
		[this._view.x, this._view.y] = [lPos.x, lPos.y];
	}
}



/** 背面遮罩组件 */
class BackMaskComponent {
	private _maskNode: cc.Node = null;
	private _view: cc.Node = null;

	constructor(maskNode: cc.Node) {
		this._maskNode = maskNode;
		this._view = cc.find("view", this._maskNode);
	}

	/** 设置遮罩初始位置和角度 */
	public setFirstPosAndAngle(pos: cc.Vec2, angle: number): void {
		this._maskNode.setPosition(pos);
		this._maskNode.angle = angle;
		this._view.angle = 180 + angle;
	}

	/** 移动 */
	public move(dPos: cc.Vec2): void {
		this._maskNode.x += dPos.x;
		this._maskNode.y += dPos.y;
	}

	/** 更新视图坐标 */
	public updateViewPos(wPos: cc.Vec2): void {
		// 世界数据
		let wMinePos = this._maskNode.convertToWorldSpaceAR(cc.v2(0, 0)),
			dir = cc.v2(1, 0).rotate((this._maskNode.angle * Math.PI / 180)),
			lineEndPos = wMinePos.add(dir.mul(100)),
			dis = cc.Intersection.pointLineDistance(wPos, wMinePos, lineEndPos, false);

		// 本地位置
		let lPos = this._maskNode.convertToNodeSpaceAR(wPos),
			isPointUp = (lPos.x == 0 && lPos.y == 0) ?
				true : (lPos.signAngle(cc.v2(1, 0)) > 0 ? true : false);

		dir = dir.rotate((90 - this._maskNode.angle) * Math.PI / 180);
		let pos = lPos.add(dir.mul(dis *= isPointUp ? 2 : -2));

		[this._view.x, this._view.y] = [pos.x, pos.y];

		// TODO:阴影
	}
}