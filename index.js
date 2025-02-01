import express from 'express';
//import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import productModel from './models/products.js';
import userModel from './models/users.js';
import dotenv from 'dotenv'
import './config/db.js'

const app = express();
app.use(express.json());
dotenv.config({path: "./config/.env"})

//app.use(cors());
app.use(cors({
    origin: ["https://stocktaker-client.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

//mongoose.connect('mongodb://127.0.0.1:27017/stocklist')

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/files'));
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage })



//---------------------------------------------------//
//---------------------Inventory---------------------//
//-------------------------------------------------//

app.get('/getProducts', (req, res) => {
    productModel.find({})
        .then(products => res.json(products))
        .catch(err => res.json(err))
})

// Add new Product record into database
app.post('/addProduct', upload.single('file'), (req, res) => {
    console.log(req.file);
    const newProduct = req.body;
    if (req.file) {
        newProduct.filePath = req.file.path; // Save the file path in the product data
      }
    productModel.create(newProduct)
        .then(products => res.json(products))
        .catch(err => res.json(err))
})

// Get the Product by ID and Edit the product record
app.get('/getProduct/:id', (req, res) => {
    const id = req.params.id
    productModel.findById({ _id: id })
        .then(product => res.json(product))
        .catch(err => res.json(err))
})
app.put('/updateProduct/:id', (req, res) => {
    const id = req.params.id
    const updatedData = req.body;
    productModel.findByIdAndUpdate({ _id: id }, updatedData)
        .then(product => res.json(product))
        .catch(err => res.json(err))
})

// Delete the Product
app.delete('/deleteProduct/:id', (req, res) => {
    const id = req.params.id
    productModel.findByIdAndDelete(id)
        .then(products => res.json(products))
        .catch(err => res.json)
})


//---------------------------------------------------//
//---------------------File Upload--------------------//
//-------------------------------------------------//


app.post('/updateData', async (req, res) => {
    try {
        const { updatedTableData } = req.body;
        const bulkOps = updatedTableData.map(product => ({
            updateOne: {
                filter: { id: product.id },
                update: {
                    $set: {
                        order: product.order,
                        difference: product.stock - product.order
                    }
                }
            }
        }));

        await productModel.bulkWrite(bulkOps);
        //const updatedProducts = await productModel.find({});
        res.status(200).json({ message: 'Products updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



//---------------------------------------------------//
//---------------------Users--------------------//
//-------------------------------------------------//

app.get('/getUsers', (req, res) => {
    userModel.find({})
        .then(users => res.json(users))
        .catch(err => res.json(err))
})

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const user = await userModel.findOne({ email })
    if (user) {
        return res.json({ message: "User already existed" })
    }

    const hashpassword = await bcrypt.hash(password, 10)
    const newUser = new userModel({ username, email, password: hashpassword })
    await newUser.save()
    return res.json({ status: true, message: "User Added" })
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email })
    if (!user) {
        return res.json({ message: "User is not registered" })
    }
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
        return res.json({ message: "Incorrect Password" })
    }
    
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    return res.json({ status: true, message: "Logged In", token, username: user.username })
})

app.listen(process.env.PORT, () => {
    console.log('Server Started');
})