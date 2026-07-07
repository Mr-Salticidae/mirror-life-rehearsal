// 手枪FBX清洗转GLB：剔除背景板/相机/灯光/子弹排，烘焙世界变换+立起旋转+归一化
// 产物：枪口朝 +x、上方 +y、长度=1、包围盒中心在原点
globalThis.window = { innerWidth: 1920, innerHeight: 1080 }
// Node 无 FileReader：GLTFExporter 二进制导出用它拼 Blob，给个最小实现
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(ab => { this.result = ab; this.onloadend?.() })
  }
}

const THREE = await import('three')
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
const { readFileSync, writeFileSync } = await import('fs')

const [srcPath, outPath] = process.argv.slice(2)
const buf = readFileSync(srcPath)
const grp = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '')
grp.updateMatrixWorld(true)

// 排除：背景挤压板 + 展示用子弹排 Cube_0..Cube_13（精确匹配，Cube / Cube_2_2 是枪体部件要保留）
const excluded = new Set(['挤压'])
for (let i = 0; i <= 13; i++) excluded.add(`Cube_${i}`)

const kept = []
grp.traverse(o => { if (o.isMesh && !excluded.has(o.name)) kept.push(o) })
console.log('kept meshes:', kept.map(m => m.name).join(', '))

// 立起：侧影原在 x-z 平面（y 为挤出厚度），Rx(+90°) 后握把(+z)朝下、准星(-z)朝上
const R = new THREE.Matrix4().makeRotationX(Math.PI / 2)

const out = new THREE.Group()
out.name = 'pistol'
for (const m of kept) {
  const geo = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(R, m.matrixWorld))
  const mats = (Array.isArray(m.material) ? m.material : [m.material]).map(src =>
    new THREE.MeshStandardMaterial({
      color: src.color ? src.color.clone() : new THREE.Color(0xcccccc),
      roughness: 0.55, metalness: 0.35,
    }))
  out.add(new THREE.Mesh(geo, mats.length === 1 ? mats[0] : mats))
}

// 归一化：包围盒中心到原点，枪长(x)缩放到 1
const box = new THREE.Box3().setFromObject(out)
const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
const s = 1 / Math.max(size.x, 0.001)
const N = new THREE.Matrix4().makeScale(s, s, s)
  .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z))
for (const m of out.children) m.geometry.applyMatrix4(N)

const box2 = new THREE.Box3().setFromObject(out)
const s2 = box2.getSize(new THREE.Vector3())
console.log('final size', s2.x.toFixed(3), s2.y.toFixed(3), s2.z.toFixed(3))

new GLTFExporter().parse(out,
  result => { writeFileSync(outPath, Buffer.from(result)); console.log('written', outPath) },
  err => { console.error('export failed', err); process.exit(1) },
  { binary: true })
