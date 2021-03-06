const fs = require('fs')
const request = require('request')
const axios = require('axios')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const mkdir = promisify(fs.mkdir)

const base = 'https://cn.bing.com/'
const every = 'https://cn.bing.com/HPImageArchive.aspx'

const collect = './update/images'
const json = './update/index.json'
const idx = process.argv[2] || -1
const params = {
  format: 'js', // 数据返回格式 json
  idx, // -1 今天、0 昨天、1 前天
  n: 8, // 返回图片，最大 8 组
  nc: 1546351019999,
  pid: 'hp',
  video: 1
}

// 获取 JSON 数据
const data = fs.readFileSync(json)
let jsonData = []

try {
  jsonData = JSON.parse(data.toString())
  if (!Array.isArray(jsonData)) jsonData = []
} catch (error) {
  console.error(`😂  转换 ${json} 文件 parse 错误!`)
}

// 下载文件
function downLoad(source, target) {
  return request(source)
    .pipe(fs.createWriteStream(target))
    .on('close', () => {
      console.log(`🌁  下载 ${target} 文件成功！`)
    })
}

;(async () => {
  // 获取图片数据
  const { images } = await axios.get(every, { params }).then(({ data }) => data)

  // 判断 collect 文件夹是否存在
  if (!fs.existsSync(collect)) {
    await mkdir(collect).then(() =>
      console.log(`📂  创建 ${collect} 文件夹成功！`)
    )
  }

  // 循环数据，如果更新，写入 JSON
  images.forEach(image => {
    const { url, urlbase, copyright, startdate } = image
    const source = base + url
    const splitUrl = urlbase.split('/')
    const name = splitUrl[splitUrl.length - 1].replace('th?id=OHR.', '')
    const target = collect + '/' + name

    if (!jsonData.some(item => image.startdate === item.startdate)) {
      jsonData.unshift(image)
      writeFile(json, JSON.stringify(jsonData, null, 2)).then(() => {
        console.log(`📄  写入 ${json} 文件成功！`)
      })
    }

    // 下载图片
    if (!fs.existsSync(target)) {
      downLoad(source, target + '.jpg')
      downLoad(source, collect + '/' + startdate + '.jpg')
    } else {
      console.log(
        `😂  请注意，已经存在 ${name} 文件，为了防止文件覆盖，已经帮你中断写入啦！`
      )
    }
  })
})()
