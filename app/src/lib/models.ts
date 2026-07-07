// GLB 模型加载（Kenney Car Kit / Race Track Kit，游戏资产包 8457883）
// 全部异步 + 失败返 null：载入前/失败时各游戏保留程序化几何体兜底，离线铁律不破
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
const cache = new Map<string, Promise<THREE.Group | null>>()

export function loadModel(path: string): Promise<THREE.Group | null> {
  if (!cache.has(path)) {
    cache.set(path, new Promise(resolve => {
      loader.load(
        `${import.meta.env.BASE_URL}${path}`,
        gltf => resolve(gltf.scene),
        undefined,
        () => resolve(null),
      )
    }))
  }
  return cache.get(path)!
}

// 道具克隆：按高度缩放，保持模型原点为立点（Kenney 道具原点即基座），底面落 y=0
export function cloneProp(src: THREE.Group, targetH: number): THREE.Group {
  const obj = src.clone(true)
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3())
  obj.scale.setScalar(targetH / Math.max(size.y, 0.001))
  const box = new THREE.Box3().setFromObject(obj)
  obj.position.y -= box.min.y
  return obj
}

// 克隆并归一化：长轴对齐 z 并缩放到 targetLen，水平居中、底面落 y=0
// flip=true 再转 180°（Kenney 车头朝 +Z，夜环线前进方向为 -Z，车辆需翻转）
export function cloneFit(src: THREE.Group, targetLen: number, flip = false): THREE.Group {
  const obj = src.clone(true)
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3())
  if (size.x > size.z) obj.rotation.y = Math.PI / 2 // 长轴归到 z
  if (flip) obj.rotation.y += Math.PI
  const s = targetLen / Math.max(size.x, size.z, 0.001)
  obj.scale.setScalar(s)
  const wrap = new THREE.Group()
  wrap.add(obj)
  const box = new THREE.Box3().setFromObject(wrap)
  const c = box.getCenter(new THREE.Vector3())
  obj.position.x -= c.x
  obj.position.z -= c.z
  obj.position.y -= box.min.y
  return wrap
}
