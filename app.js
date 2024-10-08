// Express 服务
const express = require('express');
const app = express();

// 工具类
const dayjs = require('dayjs');
const fs = require('fs')
const { v4 } = require('uuid');
const path = require('path')
const multer = require("multer");


// 服务
const port = 3002
if (process.env.NODE_ENV === 'development') {
    // 本地
    app.listen(port, () => {
        console.log('HTTP 服务器启动成功');
    });
} else {
    // 线上Https服务
    const https = require('https')
    https.createServer({
        key: fs.readFileSync('./ssl/key.key'),
        cert: fs.readFileSync('./ssl/crt.crt')
    }, app).listen(port, () => {
        console.log('Https服务器启动成功')
    });
}

// 数据库
const mongoose = require('mongoose');
// db.createUser({
//     user: "MooncFilePost",
//     pwd: "DancingCodes1227",
//     roles: [{ role: "readWrite", db: "MooncFilePost" }]
// })
mongoose.connect('mongodb://MooncFilePost:DancingCodes1227@127.0.0.1:27017/MooncFilePost?authSource=MooncFilePost').then(
    () => {
        console.log('数据库连接成功')
    },
    err => {
        console.log('数据库连接失败')
    }
)

const uploadFileSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => v4()
    },
    fileName: {
        type: String,
        required: true
    },
    createTime: {
        type: String,
        default: () => dayjs().format('YYYY-MM-DD HH:mm:ss')
    }
})
const UploadFile = mongoose.model('UploadFile', uploadFileSchema);

// 开放静态资源
app.use('/uploadImage', express.static(path.join(process.cwd(), 'upload', 'images')));

// 前端页面
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'))
})


// 创建文件夹
if (!fs.existsSync(path.join(__dirname, 'upload'))) {
    fs.mkdirSync(path.join(__dirname, 'upload'));
    fs.mkdirSync(path.join(__dirname, 'upload', 'images'));
}


// 接口
app.post('/uploadFile/image', (req, res) => {
    const uploadImage = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(process.cwd(), 'upload', 'images'));
            },
            filename: async (req, file, cb) => {
                const suffix = file.originalname.substring(file.originalname.lastIndexOf("."));
                const fileName = `${v4()}${suffix}`
                req.fileName = fileName;
                cb(null, fileName);
            }
        }),
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) {
                return cb(null, true);
            } else {
                return cb(true, false);
            }
        }
    }).single('file');
    uploadImage(req, res, async (err) => {
        if (err) {
            res.send({
                stats: 500,
                msg: '仅支持图片格式'
            });
            return
        }
        await new UploadFile({ fileName: req.fileName }).save()
        const path = process.env.NODE_ENV === 'development' ? `http://127.0.0.1:${port}` : 'https://filepost.moonc.love'
        res.send({
            stats: 200,
            imageUrl: `${path}/uploadImage/${req.fileName}`
        });
    });
})
